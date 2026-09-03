import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { UploadPanel } from "@/components/UploadPanel";
import { ResultView } from "@/components/ResultView";
import { hashFile } from "@/lib/image-hash";
import { makeThumbnail, saveHistory, type HistoryItem } from "@/lib/history";
import { preprocessImage } from "@/services/preprocessing/preprocess";
import { runTesseractKannada } from "@/services/ocr/ocr";
import { processManuscript } from "@/lib/pipeline.functions";
import type { TranslationResult } from "@/types/aksharasetu";

const TITLE = "Translate a Manuscript — AksharaSetu";
const DESC =
  "Upload a Kannada palm-leaf manuscript image and read it in Hale Kannada, modern Hosa Kannada and English.";

export const Route = createFileRoute("/translate")({
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
  component: TranslatePage,
});

function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  useEffect(() => {
    // A translation reopened from History is handed over through sessionStorage.
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("aksharasetu:reopen");
    if (!raw) return;
    window.sessionStorage.removeItem("aksharasetu:reopen");
    try {
      const item = JSON.parse(raw) as HistoryItem;
      setResult(item.result);
      setResultImage(item.thumbnail);
    } catch {
      /* ignore malformed handover */
    }
  }, []);

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
    setResultImage(null);
  }, []);

  const onClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setResultImage(null);
  }, []);

  const onProcess = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setProgress(0.03);
    try {
      setStage("Preparing the manuscript…");
      const imageHash = await hashFile(file);

      let processed;
      try {
        processed = await preprocessImage(file);
      } catch {
        throw new Error(
          "Unable to read the uploaded image. Please upload a valid manuscript image.",
        );
      }

      setStage("Reading the manuscript…");
      setProgress(0.12);
      let ocrText = "";
      let ocrConfidence: number | null = null;
      try {
        const ocr = await runTesseractKannada(processed.ocrDataUrl, (p) =>
          setProgress(0.15 + p * 0.5),
        );
        ocrText = ocr.text;
        ocrConfidence = ocr.confidence;
      } catch (err) {
        console.error("Primary reading pass failed; continuing with assisted reading", err);
      }

      setStage("Translating…");
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

      const thumbnail = await makeThumbnail(file).catch(() => "");
      setResultImage(thumbnail || previewUrl);
      if (thumbnail) {
        saveHistory({
          id: imageHash,
          createdAt: new Date().toISOString(),
          thumbnail,
          result: res,
        });
      }
      toast.success("Translation ready");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't read this manuscript. Please try a clearer image.";
      toast.error(message.replace(/^Error:\s*/, ""));
    } finally {
      setBusy(false);
      setStage("");
    }
  }, [file, previewUrl]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Toaster position="top-center" />
      <div>
        <h1 className="text-4xl sm:text-5xl">Translate a manuscript</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a photograph of the manuscript and we&apos;ll read it for you.
        </p>
      </div>

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

      {result && <ResultView result={result} imageUrl={resultImage ?? previewUrl} />}
    </div>
  );
}
