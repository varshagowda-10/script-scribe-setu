/**
 * The single AksharaSetu pipeline:
 * image -> (multi-pass OCR) -> consensus reading -> learned corrections ->
 * dataset/AI reconstruction -> Hosa -> English -> cache.
 */
import { readCached, writeCached } from "./cache/cache.server";
import { reconstruct, buildEvidence } from "./reconstruction/reconstruct.server";
import {
  visionReadKannada,
  consensusRead,
  reconstructAndTranslate,
  AIUnavailableError,
} from "./ai/gemini.server";
import { cleanOcrText, kannadaCharCount } from "./dataset/normalize";
import { ensureLexiconLoaded } from "./dataset/dataset.server";
import { applyCorrections } from "./corrections/corrections.server";
import type { TranslationResult } from "@/types/aksharasetu";

export class PipelineError extends Error {}

export interface PipelineInput {
  imageHash: string;
  imageDataUrl: string;
  ocrText: string;
  ocrConfidence: number | null;
  /** Readings of the other renderings of the same leaf. */
  ocrCandidates?: { label: string; text: string; confidence: number | null }[];
  /** Alternative renderings handed to the image-reading model. */
  imageVariants?: string[];
}

const LOW_CONFIDENCE = 70;
const MIN_CHARS = 20;

export async function runPipeline(input: PipelineInput): Promise<TranslationResult> {
  const cached = await readCached(input.imageHash);
  if (cached) return cached;

  await ensureLexiconLoaded();

  const tesseractText = cleanOcrText(input.ocrText ?? "");
  const tesseractChars = kannadaCharCount(tesseractText);
  console.log(
    `[AksharaSetu] OCR completed | engine=tesseract-kan | chars=${tesseractChars} | confidence=${
      input.ocrConfidence === null ? "n/a" : `${input.ocrConfidence.toFixed(1)}%`
    }`,
  );

  // One rendering only: extra image passes pushed the request past its time
  // limit, which left the page stuck on "Translating…".
  const images = [input.imageDataUrl, ...(input.imageVariants ?? [])].filter(Boolean).slice(0, 1);
  const startedAt = Date.now();
  const BUDGET_MS = 60_000;

  const weak =
    tesseractChars < MIN_CHARS ||
    input.ocrConfidence === null ||
    input.ocrConfidence < LOW_CONFIDENCE;

  let workingText = tesseractText;
  let engine: string = "tesseract-kan";
  let visionUsed = false;

  // Independent readings of the same leaf: each pre-processed rendering read by
  // Tesseract, plus one image-grounded reading per rendering when the scan is
  // faded or the characters run together.
  const passes: { label: string; text: string }[] = [];
  if (tesseractText.trim()) passes.push({ label: "scan-balanced", text: tesseractText });
  for (const c of input.ocrCandidates ?? []) {
    const cleaned = cleanOcrText(c.text ?? "");
    if (kannadaCharCount(cleaned) >= 3) passes.push({ label: `scan-${c.label}`, text: cleaned });
  }

  if (weak) {
    for (const [i, image] of images.entries()) {
      try {
        const visionText = await visionReadKannada(image, tesseractText);
        if (kannadaCharCount(visionText) >= 3) {
          passes.push({ label: `image-read-${i + 1}`, text: cleanOcrText(visionText) });
          visionUsed = true;
        }
      } catch (err) {
        console.error("[AksharaSetu] Vision OCR unavailable:", err);
        break;
      }
    }
  }

  if (passes.length > 1 && Date.now() - startedAt < BUDGET_MS) {
    try {
      const merged = await consensusRead(images, passes);
      if (kannadaCharCount(merged) >= Math.max(3, Math.round(tesseractChars * 0.6))) {
        workingText = cleanOcrText(merged);
        engine = visionUsed ? "multi-pass + image-grounded" : "multi-pass scan";
      }
    } catch (err) {
      console.error("[AksharaSetu] Consensus reading unavailable:", err);
    }
  }

  if (workingText === tesseractText) {
    // No consensus available — take the single richest pass.
    const best = passes
      .slice()
      .sort((a, b) => kannadaCharCount(b.text) - kannadaCharCount(a.text))[0];
    if (best && kannadaCharCount(best.text) > tesseractChars) {
      workingText = best.text;
      engine = best.label.startsWith("image") ? "image-grounded" : "multi-pass scan";
    }
  }

  // Reader-taught corrections are applied before any matching or translation.
  const corrected = await applyCorrections(workingText);
  workingText = corrected.text;

  if (kannadaCharCount(workingText) < 3) {
    throw new PipelineError(
      "The manuscript could not be read reliably. Please try a clearer image.",
    );
  }

  const report = reconstruct(workingText);
  const evidence = buildEvidence(report);


  let ai;
  try {
    ai = await reconstructAndTranslate({
      cleanedOcr: report.cleanedText,
      evidence,
      datasetSize: report.stats.datasetEntries,
    });
  } catch (err) {
    if (!(err instanceof AIUnavailableError)) throw err;
    console.error("[AksharaSetu] AI stage failed, returning dataset-only result:", err.message);
    // Graceful degradation: still show OCR + dataset-derived Hosa Kannada.
    const hosa = report.candidates
      .map((c) => c.matches[0]?.entry.hosa ?? c.token)
      .join(" ")
      .trim();
    const partial: TranslationResult = {
      haleKannada: report.cleanedText,
      hosaKannada: hosa,
      english: "",
      confidence: measuredOrEstimated(input.ocrConfidence, visionUsed, report.supportRatio).value,
      confidenceBasis: measuredOrEstimated(input.ocrConfidence, visionUsed, report.supportRatio)
        .basis,
      glossary: report.glossary,
      notes: [
        "The AI translation service was unavailable, so only the OCR text and dataset-based modern Kannada are shown.",
      ],
      ocrEngine: engine,
      rawOcr: input.ocrText ?? "",
      stats: { ...report.stats, aiAssisted: false },
      cached: false,
    };
    return partial;
  }

  const conf = measuredOrEstimated(input.ocrConfidence, visionUsed, report.supportRatio);

  const glossary = mergeGlossary(report.glossary, ai.glossary);
  const notes = [...ai.notes];
  if (visionUsed)
    notes.push("Vision-assisted reading was used because the Tesseract pass was weak.");
  if (ai.uncertainTokens.length)
    notes.push(`Unresolved readings: ${ai.uncertainTokens.slice(0, 8).join(", ")}`);

  const result: TranslationResult = {
    haleKannada: presentable(ai.haleKannada || report.cleanedText),
    hosaKannada: presentable(ai.hosaKannada),
    english: presentable(ai.english),
    confidence: conf.value,
    confidenceBasis: conf.basis,
    glossary,
    notes: notes.slice(0, 6),
    ocrEngine: engine,
    rawOcr: input.ocrText ?? "",
    stats: { ...report.stats, aiAssisted: true },
    cached: false,
  };

  await writeCached(input.imageHash, result);
  return result;
}

/**
 * Deterministic presentation cleanup: internal uncertainty markers become a
 * neutral ellipsis so readers never see debug tokens.
 */
function presentable(text: string): string {
  return (text ?? "")
    .replace(/\[(?:uncertain|not found|unknown|illegible)\]/gi, "…")
    .replace(/◌+/g, "…")
    .replace(/(?:\s*…\s*){2,}/g, " … ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function measuredOrEstimated(
  ocrConfidence: number | null,
  visionUsed: boolean,
  supportRatio: number,
): { value: number | null; basis: TranslationResult["confidenceBasis"] } {
  if (!visionUsed && ocrConfidence !== null) {
    // Engine-measured word confidence, tempered by how much of the text the
    // lexicon actually supports.
    const value = Math.round(ocrConfidence * 0.7 + supportRatio * 100 * 0.3);
    return { value, basis: "measured-ocr" };
  }
  if (supportRatio > 0) {
    return { value: Math.round(supportRatio * 100), basis: "estimated-dataset-support" };
  }
  return { value: null, basis: "unavailable" };
}

function mergeGlossary(
  fromDataset: TranslationResult["glossary"],
  fromAi: { hale: string; hosa: string; english: string; note?: string }[],
): TranslationResult["glossary"] {
  const map = new Map<string, TranslationResult["glossary"][number]>();
  for (const g of fromDataset) map.set(g.hale, g);
  for (const g of fromAi) {
    if (!g?.hale) continue;
    const existing = map.get(g.hale);
    map.set(g.hale, {
      hale: g.hale,
      hosa: existing?.hosa || g.hosa || "",
      english: g.english || "",
      ...(existing?.note || g.note ? { note: existing?.note ?? g.note } : {}),
    });
  }
  return [...map.values()].filter((g) => g.hosa || g.english).slice(0, 16);
}
