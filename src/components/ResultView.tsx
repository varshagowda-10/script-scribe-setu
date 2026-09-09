import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, Square, FileDown, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportElementToPdf } from "@/lib/pdf";
import { submitCorrection } from "@/lib/corrections.functions";
import type { GlossaryPair, TranslationResult } from "@/types/aksharasetu";

/** Teach the system a reading; it is reused on every later manuscript. */
function CorrectionBox() {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState("");
  const [correct, setCorrect] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!wrong.trim() || !correct.trim()) return;
    setSaving(true);
    try {
      await submitCorrection({ data: { wrong: wrong.trim(), correct: correct.trim() } });
      toast.success("Saved — this reading will be used from now on.");
      setWrong("");
      setCorrect("");
      setOpen(false);
    } catch {
      toast.error("Couldn't save that correction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open)
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <PencilLine className="mr-2 h-4 w-4" />
        Fix a word
      </Button>
    );

  return (
    <div className="w-full space-y-3 rounded-md border border-border bg-leaf/40 p-4">
      <p className="text-sm text-muted-foreground">
        Type the word as it was read, and the word it should be. It will be corrected automatically
        in every manuscript from now on.
      </p>
      <div className="flex flex-wrap gap-3">
        <Input
          value={wrong}
          onChange={(e) => setWrong(e.target.value)}
          placeholder="As read"
          className="w-40 font-kannada"
        />
        <Input
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
          placeholder="Should be"
          className="w-40 font-kannada"
        />
        <Button onClick={save} disabled={saving || !wrong.trim() || !correct.trim()}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}


function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (id: string, text: string, lang: string) => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.92;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utter);
  };

  return { speak, speakingId, supported };
}

const STRIP = /^[^\u0C80-\u0CFF]+|[^\u0C80-\u0CFF]+$/g;

/** Kannada text with meanings on the words that have a reliable entry. */
function AnnotatedKannada({ text, glossary }: { text: string; glossary: GlossaryPair[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, GlossaryPair>();
    for (const g of glossary) {
      if (!g.hale) continue;
      map.set(g.hale.replace(STRIP, ""), g);
      if (g.hosa) map.set(g.hosa.replace(STRIP, ""), g);
    }
    return map;
  }, [glossary]);

  const parts = text.split(/(\s+)/);

  return (
    <p className="whitespace-pre-wrap font-kannada text-lg leading-loose text-ink">
      {parts.map((part, i) => {
        const key = part.replace(STRIP, "");
        const entry = key ? lookup.get(key) : undefined;
        if (!entry) return <span key={i}>{part}</span>;
        const id = `${i}-${key}`;
        return (
          <span key={i} className="relative inline-block">
            <button
              type="button"
              onClick={() => setOpen(open === id ? null : id)}
              onMouseEnter={() => setOpen(id)}
              onMouseLeave={() => setOpen((c) => (c === id ? null : c))}
              className="cursor-help underline decoration-accent/50 decoration-dotted underline-offset-4"
            >
              {part}
            </button>
            {open === id && (
              <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-left text-sm shadow-lg">
                <span className="block font-kannada text-base">{entry.hale}</span>
                {entry.hosa && (
                  <span className="block font-kannada text-base text-muted-foreground">
                    → {entry.hosa}
                  </span>
                )}
                {entry.english && (
                  <span className="mt-1 block font-sans text-xs text-muted-foreground">
                    {entry.english}
                  </span>
                )}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function Section({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-leaf/50 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </h2>
        {action}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

interface Props {
  result: TranslationResult;
  imageUrl: string | null;
}

export function ResultView({ result, imageUrl }: Props) {
  const speech = useSpeech();
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const onDownload = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(printRef.current, "aksharasetu-translation.pdf");
    } finally {
      setExporting(false);
    }
  };

  const empty = <span className="text-sm italic text-muted-foreground">Not available.</span>;

  return (
    <div className="space-y-5">
      <div ref={printRef} className="space-y-5 bg-background">
        {imageUrl && (
          <Section label="Manuscript">
            <img
              src={imageUrl}
              alt="Uploaded Kannada palm-leaf manuscript"
              className="mx-auto max-h-[26rem] w-full rounded-md object-contain"
            />
          </Section>
        )}

        <Section label="Hale Kannada">
          {result.haleKannada.trim() ? (
            <AnnotatedKannada text={result.haleKannada} glossary={result.glossary} />
          ) : (
            empty
          )}
        </Section>

        <Section
          label="Hosa Kannada"
          action={
            speech.supported && result.hosaKannada.trim() ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speech.speak("hosa", result.hosaKannada, "kn-IN")}
                aria-label="Read the modern Kannada aloud"
              >
                {speech.speakingId === "hosa" ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            ) : undefined
          }
        >
          {result.hosaKannada.trim() ? (
            <AnnotatedKannada text={result.hosaKannada} glossary={result.glossary} />
          ) : (
            empty
          )}
        </Section>

        <Section label="English translation">
          {result.english.trim() ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed">{result.english}</p>
          ) : (
            empty
          )}
        </Section>

        <p className="px-1 text-xs text-muted-foreground">
          AksharaSetu · {new Date().toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {speech.supported && result.english.trim() && (
          <Button
            variant="secondary"
            onClick={() => speech.speak("english", result.english, "en-IN")}
          >
            {speech.speakingId === "english" ? (
              <Square className="mr-2 h-4 w-4" />
            ) : (
              <Volume2 className="mr-2 h-4 w-4" />
            )}
            {speech.speakingId === "english" ? "Stop" : "Play audio"}
          </Button>
        )}
        <Button variant="outline" onClick={onDownload} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  );
}
