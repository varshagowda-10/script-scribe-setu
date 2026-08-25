import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { UploadPanel } from "@/components/UploadPanel";
import { ResultView } from "@/components/ResultView";
import { hashFile } from "@/lib/image-hash";
import { preprocessImage } from "@/services/preprocessing/preprocess";
import { runTesseractKannada } from "@/services/ocr/ocr";
import { processManuscript } from "@/lib/pipeline.functions";
import type { TranslationResult } from "@/types/aksharasetu";

const TITLE = "AksharaSetu — AI-Assisted Historical Kannada Manuscript Translation";
const DESC =
  "Upload a Kannada palm-leaf manuscript image and get a reconstructed Hale Kannada reading, modern Hosa Kannada, and a natural English translation.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AksharaSetu,
});

function AksharaSetu() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranslationResult | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onSelect = useCallback((f: File) => {
    setFile(f);
    setResult(null);
  }, []);

  const onClear = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const onProcess = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setProgress(0.03);
    try {
      setStage("Hashing image for consistent results…");
      const imageHash = await hashFile(file);

      setStage("Preprocessing the palm-leaf image…");
      setProgress(0.1);
      let processed;
      try {
        processed = await preprocessImage(file);
      } catch {
        throw new Error("Unable to read the uploaded image. Please upload a valid manuscript image.");
      }

      setStage("Reading Kannada characters (Tesseract)…");
      let ocrText = "";
      let ocrConfidence: number | null = null;
      try {
        const ocr = await runTesseractKannada(processed.ocrDataUrl, (p) =>
          setProgress(0.15 + p * 0.5),
        );
        ocrText = ocr.text;
        ocrConfidence = ocr.confidence;
      } catch (err) {
        console.error("Tesseract failed, continuing with vision-assisted reading", err);
      }

      setStage("Reconstructing Hale Kannada and translating…");
      setProgress(0.72);
      const res = await processManuscript({
        data: {
          imageHash,
          imageDataUrl: processed.enhancedDataUrl,
          ocrText,
          ocrConfidence,
        },
      });

      setProgress(1);
      setResult(res);
      toast.success(res.cached ? "Cached result restored" : "Manuscript processed");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Processing failed. Please try again with a clearer image.";
      toast.error(message.replace(/^Error:\s*/, ""));
    } finally {
      setBusy(false);
      setStage("");
    }
  }, [file]);

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" />
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-accent">Final-year major project</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">AksharaSetu</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            AI-Assisted Historical Kannada Manuscript Translation
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section className="panel px-5 py-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {[
              "Palm-leaf image",
              "Preprocessing",
              "Kannada OCR",
              "Hale Kannada",
              "Hosa Kannada",
              "English",
            ].map((s, i, arr) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                  {s}
                </span>
                {i < arr.length - 1 && <span aria-hidden>→</span>}
              </li>
            ))}
          </ol>
        </section>

        <UploadPanel
          file={file}
          previewUrl={previewUrl}
          onSelect={onSelect}
          onClear={onClear}
          onProcess={onProcess}
          busy={busy}
          stage={stage}
          progress={progress}
        />

        {result && <ResultView result={result} />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        AksharaSetu uses Tesseract Kannada OCR, a Hale → Hosa Kannada lexicon, and AI-assisted
        contextual reconstruction. Results are research aids, not authoritative editions.
      </footer>
    </div>
  );
}
