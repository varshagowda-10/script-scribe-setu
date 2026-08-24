/** Deterministic result cache keyed by the SHA-256 hash of the uploaded image. */
import type { TranslationResult } from "@/types/aksharasetu";

export async function readCached(imageHash: string): Promise<TranslationResult | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("manuscript_results")
      .select("*")
      .eq("image_hash", imageHash)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    console.log(`[AksharaSetu] Cache hit: ${imageHash.slice(0, 12)}`);
    return {
      haleKannada: data.hale_kannada,
      hosaKannada: data.hosa_kannada,
      english: data.english,
      confidence: data.confidence === null ? null : Number(data.confidence),
      confidenceBasis: (data.confidence_basis ??
        "unavailable") as TranslationResult["confidenceBasis"],
      glossary: (data.glossary ?? []) as TranslationResult["glossary"],
      notes: (data.notes ?? []) as string[],
      ocrEngine: data.ocr_engine ?? "unknown",
      rawOcr: data.raw_ocr ?? "",
      stats: (data.stats ?? {}) as TranslationResult["stats"],
      cached: true,
    };
  } catch (err) {
    console.error("[AksharaSetu] Cache read failed:", err);
    return null;
  }
}

export async function writeCached(imageHash: string, result: TranslationResult): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("manuscript_results").upsert(
      {
        image_hash: imageHash,
        hale_kannada: result.haleKannada,
        hosa_kannada: result.hosaKannada,
        english: result.english,
        confidence: result.confidence,
        confidence_basis: result.confidenceBasis,
        ocr_engine: result.ocrEngine,
        raw_ocr: result.rawOcr,
        glossary: result.glossary,
        notes: result.notes,
        stats: result.stats,
      },
      { onConflict: "image_hash" },
    );
    if (error) throw error;
    console.log(`[AksharaSetu] Result cached: ${imageHash.slice(0, 12)}`);
  } catch (err) {
    console.error("[AksharaSetu] Cache write failed:", err);
  }
}
