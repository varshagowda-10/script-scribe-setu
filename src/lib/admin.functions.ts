import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uploadSchema = z.object({
  passphrase: z.string().min(1),
  csv: z.string().min(1),
});

interface Pair {
  hale: string;
  hosa: string;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      cols.push(cur);
      cur = "";
    } else cur += ch;
  }
  cols.push(cur);
  return cols;
}

function parsePairs(text: string): Pair[] {
  const lines = text.split(/\r?\n/);
  const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  let haleCol = header.indexOf("halegannada");
  let hosaCol = header.indexOf("hosakannada_gloss");
  let start = 1;
  if (haleCol === -1 || hosaCol === -1) {
    haleCol = 0;
    hosaCol = 1;
    start = 0;
  }
  const out: Pair[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cols = splitCsvLine(line);
    const hale = (cols[haleCol] ?? "").trim();
    const hosa = (cols[hosaCol] ?? "").trim();
    if (!hale || !hosa) continue;
    out.push({ hale, hosa });
  }
  return out;
}

/** Replace the stored word list with an uploaded CSV, then reindex it. */
export const uploadLexicon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => uploadSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSPHRASE"];
    if (!expected) throw new Error("Admin access is not configured yet.");
    if (data.passphrase !== expected) throw new Error("That passphrase is not correct.");

    const pairs = parsePairs(data.csv);
    if (pairs.length < 10) throw new Error("This file doesn't look like a valid word list.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const del = await supabaseAdmin.from("lexicon_entries").delete().gte("id", 0);
    if (del.error) throw new Error(del.error.message);

    const chunk = 1000;
    for (let i = 0; i < pairs.length; i += chunk) {
      const { error } = await supabaseAdmin.from("lexicon_entries").insert(pairs.slice(i, i + chunk));
      if (error) throw new Error(error.message);
    }

    const { setLexicon } = await import("@/services/dataset/dataset.server");
    const { normalizeKannada } = await import("@/services/dataset/normalize");
    const count = setLexicon(pairs.map((p) => ({ ...p, key: normalizeKannada(p.hale) })));

    return { count };
  });

/** How many words are currently active for matching. */
export const lexiconStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureLexiconLoaded } = await import("@/services/dataset/dataset.server");
  const count = await ensureLexiconLoaded(true);
  return { count };
});
