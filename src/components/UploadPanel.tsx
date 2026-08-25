import { useCallback, useRef, useState } from "react";
import { Upload, X, ScanText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  onProcess: () => void;
  busy: boolean;
  stage: string;
  progress: number;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];

export function UploadPanel({
  file,
  previewUrl,
  onSelect,
  onClear,
  onProcess,
  busy,
  stage,
  progress,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      if (!ACCEPTED.includes(f.type)) {
        setError("Unsupported file type. Upload a JPG, PNG, WEBP, BMP or TIFF image.");
        return;
      }
      setError(null);
      onSelect(f);
    },
    [onSelect],
  );

  return (
    <section className="panel p-5 sm:p-7">
      <h2 className="text-2xl">Upload manuscript</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A photograph or scan of a Kannada palm-leaf folio.
      </p>

      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging ? "border-accent bg-accent/10" : "border-border bg-leaf/40 hover:bg-leaf/70"
          }`}
        >
          <Upload className="h-8 w-8 text-accent" aria-hidden />
          <p className="mt-3 font-medium">Drag and drop your manuscript image</p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse your files</p>
          <p className="mt-4 text-xs text-muted-foreground">JPG · PNG · WEBP · BMP · TIFF</p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="relative overflow-hidden rounded-lg border border-border bg-leaf/40">
            <img
              src={previewUrl}
              alt="Preview of the uploaded Kannada palm-leaf manuscript"
              className="max-h-[22rem] w-full object-contain"
            />
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              aria-label="Remove image"
              className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 text-foreground shadow-sm transition hover:bg-card disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {file?.name} · {file ? Math.round(file.size / 1024) : 0} KB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0] ?? undefined)}
      />

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={onProcess} disabled={!file || busy} size="lg">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanText className="mr-2 h-4 w-4" />
          )}
          {busy ? "Processing…" : "Process manuscript"}
        </Button>
        {previewUrl && !busy && (
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Change image
          </Button>
        )}
      </div>

      {busy && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{stage}</p>
        </div>
      )}
    </section>
  );
}
