/**
 * Learned reading corrections.
 *
 * Every reading a reader fixes by hand is stored here and re-applied to the
 * same misread word in every later manuscript, so the system keeps improving
 * on real palm-leaf material without any model retraining.
 */
import { normalizeKannada } from "../dataset/normalize";

type CorrectionMap = Map<string, string>;

let cache: CorrectionMap | null = null;
let loadedAt = 0;
const TTL_MS = 2 * 60 * 1000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadCorrections(force = false): Promise<CorrectionMap> {
  if (!force && cache && Date.now() - loadedAt < TTL_MS) return cache;
  const map: CorrectionMap = new Map();
  try {
    const db = await admin();
    const { data, error } = await db
      .from("reading_corrections")
      .select("wrong,correct")
      .order("uses", { ascending: false })
      .limit(5000);
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.wrong || !row.correct) continue;
      map.set(normalizeKannada(row.wrong), row.correct);
      map.set(row.wrong.trim(), row.correct);
    }
  } catch (err) {
    console.error("[AksharaSetu] Correction memory unavailable:", err);
  }
  cache = map;
  loadedAt = Date.now();
  return map;
}

/** Rewrite tokens that a reader has previously corrected. */
export async function applyCorrections(
  text: string,
): Promise<{ text: string; applied: string[] }> {
  const map = await loadCorrections();
  if (!map.size || !text.trim()) return { text, applied: [] };

  const applied: string[] = [];
  const out = text
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      const direct = map.get(part.trim());
      const normalized = map.get(normalizeKannada(part));
      const fixed = direct ?? normalized;
      if (!fixed || fixed === part) return part;
      applied.push(part.trim());
      return fixed;
    })
    .join("");

  if (applied.length) {
    void bumpUses(applied);
    console.log(`[AksharaSetu] Applied ${applied.length} learned correction(s)`);
  }
  return { text: out, applied };
}

async function bumpUses(wrongs: string[]) {
  try {
    const db = await admin();
    for (const wrong of [...new Set(wrongs)]) {
      const { data } = await db
        .from("reading_corrections")
        .select("id,uses")
        .eq("wrong", wrong)
        .maybeSingle();
      if (data)
        await db
          .from("reading_corrections")
          .update({ uses: (data.uses ?? 0) + 1 })
          .eq("id", data.id);
    }
  } catch {
    /* usage counting is best-effort */
  }
}

/** Remember a reader-supplied fix so future readings use it. */
export async function saveCorrection(wrong: string, correct: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("reading_corrections")
    .upsert({ wrong: wrong.trim(), correct: correct.trim() }, { onConflict: "wrong" });
  if (error) throw new Error(error.message);
  cache = null;
}
