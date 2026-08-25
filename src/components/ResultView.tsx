import { useEffect, useState } from "react";
import { Volume2, Square, ScrollText, Languages, BookOpen, Gauge, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranslationResult } from "@/types/aksharasetu";

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

interface CardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  text: string;
  kannada?: boolean;
  audio?: { id: string; lang: string };
  speech: ReturnType<typeof useSpeech>;
}

function TextCard({ title, subtitle, icon, text, kannada, audio, speech }: CardProps) {
  return (
    <article className="panel overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-leaf/50 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-accent">{icon}</span>
          <div>
            <h3 className="text-lg leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {audio && speech.supported && text.trim() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => speech.speak(audio.id, text, audio.lang)}
            aria-label={`Read ${title} aloud`}
          >
            {speech.speakingId === audio.id ? (
              <Square className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </header>
      <div className="px-5 py-4">
        {text.trim() ? (
          <p
            className={`whitespace-pre-wrap ${kannada ? "font-kannada text-lg text-ink" : "text-base leading-relaxed"}`}
          >
            {text}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Not available for this manuscript.</p>
        )}
      </div>
    </article>
  );
}

export function ResultView({ result }: { result: TranslationResult }) {
  const speech = useSpeech();

  const confidenceLabel =
    result.confidence === null
      ? "Not measurable"
      : `${result.confidence}%${result.confidenceBasis === "estimated-dataset-support" ? " (estimated)" : ""}`;

  return (
    <div className="space-y-5">
      <section className="panel flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-sm text-muted-foreground">OCR confidence</span>
          <span className="font-semibold">{confidenceLabel}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Engine: <span className="text-foreground">{result.ocrEngine}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Lexicon support:{" "}
          <span className="text-foreground">
            {result.stats.exactMatches + result.stats.normalizedMatches + result.stats.fuzzyMatches}
            /{result.stats.tokens} words
          </span>
        </div>
        {result.cached && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <Archive className="h-3.5 w-3.5" /> Cached result — identical to previous run
          </span>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TextCard
          title="Hale Kannada"
          subtitle="Reconstructed historical text"
          icon={<ScrollText className="h-5 w-5" />}
          text={result.haleKannada}
          kannada
          speech={speech}
        />
        <TextCard
          title="Hosa Kannada"
          subtitle="Modern Kannada interpretation"
          icon={<Languages className="h-5 w-5" />}
          text={result.hosaKannada}
          kannada
          audio={{ id: "hosa", lang: "kn-IN" }}
          speech={speech}
        />
      </div>

      <TextCard
        title="English"
        subtitle="Natural English translation"
        icon={<BookOpen className="h-5 w-5" />}
        text={result.english}
        audio={{ id: "english", lang: "en-IN" }}
        speech={speech}
      />

      {result.glossary.length > 0 && (
        <section className="panel overflow-hidden">
          <header className="border-b border-border bg-leaf/50 px-5 py-3">
            <h3 className="text-lg leading-tight">Glossary</h3>
            <p className="text-xs text-muted-foreground">
              Words supported by the Hale → Hosa lexicon and the passage context
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 font-medium">Hale Kannada</th>
                  <th className="px-5 py-2 font-medium">Hosa Kannada</th>
                  <th className="px-5 py-2 font-medium">English</th>
                </tr>
              </thead>
              <tbody>
                {result.glossary.map((g) => (
                  <tr key={g.hale} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-2.5 font-kannada text-base">{g.hale}</td>
                    <td className="px-5 py-2.5 font-kannada text-base">{g.hosa || "—"}</td>
                    <td className="px-5 py-2.5">
                      {g.english || "—"}
                      {g.note && (
                        <span className="ml-2 text-xs text-muted-foreground">({g.note})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.notes.length > 0 && (
        <section className="panel px-5 py-4">
          <h3 className="text-lg">Scholarly notes</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
