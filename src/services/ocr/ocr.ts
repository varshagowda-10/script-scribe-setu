/**
 * OCR service (browser). Tesseract WASM with the Kannada (`kan`) model.
 * Isolated from the UI so the engine/config can be tuned or replaced later.
 */
import type { OCRResult } from "@/types/aksharasetu";

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker(onProgress?: (p: number) => void) {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("kan", 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") onProgress?.(m.progress);
      },
    });
  }
  return workerPromise;
}

export async function runTesseractKannada(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<OCRResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(imageDataUrl);

  const words = (data.words ?? []).map((w) => ({
    text: w.text,
    confidence: typeof w.confidence === "number" ? w.confidence : 0,
  }));

  // Mean confidence over words that actually contain Kannada glyphs.
  const scored = words.filter((w) => /[\u0C80-\u0CFF]/.test(w.text));
  const confidence = scored.length
    ? scored.reduce((s, w) => s + w.confidence, 0) / scored.length
    : typeof data.confidence === "number" && data.text.trim()
      ? data.confidence
      : null;

  return {
    text: data.text ?? "",
    confidence,
    words,
    engine: "tesseract-kan",
  };
}
