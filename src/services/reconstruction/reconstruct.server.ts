/**
 * Text-reconstruction layer. Preserves the raw OCR text, normalises harmless
 * Unicode variation, flags suspicious tokens, and retrieves dataset-supported
 * candidates that the AI layer can use as evidence. It never rewrites a token
 * on its own unless the dataset supports it strongly.
 */
import { matchToken, datasetSize } from "../dataset/dataset.server";
import { cleanOcrText, tokenize, kannadaCharCount } from "../dataset/normalize";
import type { CorrectionCandidate, GlossaryPair, PipelineStats } from "@/types/aksharasetu";

export interface ReconstructionReport {
  cleanedText: string;
  candidates: CorrectionCandidate[];
  glossary: GlossaryPair[];
  stats: Omit<PipelineStats, "aiAssisted">;
  supportRatio: number;
}

export function reconstruct(rawOcr: string): ReconstructionReport {
  const cleanedText = cleanOcrText(rawOcr);
  const tokens = tokenize(cleanedText);

  let exactMatches = 0;
  let normalizedMatches = 0;
  let fuzzyMatches = 0;
  let unresolved = 0;

  const candidates: CorrectionCandidate[] = [];
  const glossaryMap = new Map<string, GlossaryPair>();

  for (const token of tokens) {
    const matches = matchToken(token);
    const best = matches[0];
    if (best?.kind === "exact") exactMatches++;
    else if (best?.kind === "normalized") normalizedMatches++;
    else if (best?.kind === "fuzzy") fuzzyMatches++;
    else unresolved++;

    const suspicious =
      !best || best.kind === "fuzzy" || kannadaCharCount(token) < 2 || token.length > 18;

    candidates.push({ token, suspicious, matches });

    // Only dataset-supported entries become glossary rows (no OCR garbage).
    if (best && best.score >= 0.8 && !glossaryMap.has(best.entry.hale)) {
      glossaryMap.set(best.entry.hale, {
        hale: best.entry.hale,
        hosa: best.entry.hosa,
        english: "",
        ...(best.kind === "fuzzy" ? { note: `matched from OCR reading “${token}”` } : {}),
      });
    }
  }

  const resolved = exactMatches + normalizedMatches + fuzzyMatches;
  const supportRatio = tokens.length ? resolved / tokens.length : 0;

  console.log(
    `[AksharaSetu] Exact matches: ${exactMatches} | Normalized matches: ${normalizedMatches} | Fuzzy matches: ${fuzzyMatches} | Unresolved: ${unresolved}`,
  );

  return {
    cleanedText,
    candidates,
    glossary: [...glossaryMap.values()].slice(0, 40),
    supportRatio,
    stats: {
      tokens: tokens.length,
      exactMatches,
      normalizedMatches,
      fuzzyMatches,
      unresolved,
      datasetEntries: datasetSize(),
    },
  };
}

/** Compact, token-level evidence block handed to the AI layer. */
export function buildEvidence(report: ReconstructionReport, limit = 60): string {
  return report.candidates
    .slice(0, limit)
    .map((c, i) => {
      const cands = c.matches
        .map((m) => `${m.entry.hale}=${m.entry.hosa}(${m.kind},${m.score.toFixed(2)})`)
        .join("; ");
      return `${i + 1}. "${c.token}"${c.suspicious ? " [suspicious]" : ""} -> ${cands || "no dataset candidate"}`;
    })
    .join("\n");
}
