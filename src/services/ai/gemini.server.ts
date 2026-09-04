/**
 * AI layer (Lovable AI Gateway / Gemini). Two jobs only:
 *  1. Vision-assisted Kannada reading of the manuscript when Tesseract is weak.
 *  2. Dataset-grounded reconstruction + Hale -> Hosa -> English translation.
 * Deterministic settings (temperature 0) so the same input yields the same text.
 */
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

export class AIUnavailableError extends Error {}

interface ChatMessage {
  role: "system" | "user";
  content: unknown;
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AIUnavailableError("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0, top_p: 1 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[AksharaSetu] AI gateway error ${res.status}: ${body.slice(0, 400)}`);
    if (res.status === 429) throw new AIUnavailableError("AI service is rate limited right now.");
    if (res.status === 402)
      throw new AIUnavailableError("AI credits are exhausted for this workspace.");
    throw new AIUnavailableError("The AI service could not be reached.");
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content || !content.trim()) throw new AIUnavailableError("Empty AI response");
  return content;
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AIUnavailableError("AI response was not JSON");
  return JSON.parse(body.slice(start, end + 1)) as T;
}

/** Vision-assisted reading — used as a fallback/complement to Tesseract. */
export async function visionReadKannada(
  imageDataUrl: string,
  tesseractText: string,
): Promise<string> {
  console.log("[AksharaSetu] Vision-assisted OCR started");
  const content = await chat([
    {
      role: "system",
      content:
        "You transcribe historical Kannada palm-leaf manuscripts. Output ONLY the Kannada characters you can actually read, preserving line breaks. Do not translate, do not modernise, do not add commentary. If a character is unreadable write ◌ in its place. Never invent words to fill gaps.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Transcribe the Kannada text in this palm-leaf manuscript image.\nA Tesseract pass produced this (may be noisy, use only as a hint):\n${tesseractText.slice(0, 1500) || "(empty)"}`,
        },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ]);
  console.log("[AksharaSetu] Vision-assisted OCR completed");
  return content.trim();
}

export interface AITranslationOutput {
  haleKannada: string;
  hosaKannada: string;
  english: string;
  glossary: { hale: string; hosa: string; english: string; note?: string }[];
  notes: string[];
  uncertainTokens: string[];
}

export async function reconstructAndTranslate(params: {
  cleanedOcr: string;
  evidence: string;
  datasetSize: number;
}): Promise<AITranslationOutput> {
  const content = await chat([
    {
      role: "system",
      content: [
        "You are a Kannada palaeography and translation assistant for an academic manuscript-reading system.",
        "You receive noisy OCR of a Hale Kannada (Old Kannada) palm-leaf manuscript plus dataset-supported candidate readings for each token.",
        "Tasks, in order:",
        "1. Reconstruct the most plausible Hale Kannada text. Prefer dataset-supported candidates and surrounding context over the raw OCR token. Correct obvious OCR character substitutions, wrong splits and wrong joins.",
        "2. Convert that Hale Kannada into fluent modern Hosa Kannada.",
        "3. Translate the Hosa Kannada into natural, coherent English prose (not a word list).",
        "Rules: never invent content that has no support in the OCR, the dataset candidates, or the immediate context. If a word truly cannot be recovered, write [uncertain] for that word ONLY — never for whole lines. Keep [uncertain] rare.",
        "Always produce a readable Hosa Kannada rendering and a readable English translation of whatever was recovered; do not return empty strings and do not answer with an apology or an explanation of failure. If only part of the passage is legible, translate that part and simply omit the illegible word.",
        "Do not output internal debug markers, confidence scores, dataset statistics, or commentary about the OCR process.",

        'Reply with strict JSON only: {"haleKannada":string,"hosaKannada":string,"english":string,"glossary":[{"hale":string,"hosa":string,"english":string,"note":string}],"notes":[string],"uncertainTokens":[string]}',
        "glossary: up to 12 of the most meaningful words actually present in the passage. notes: up to 4 short scholarly remarks about the reconstruction.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `RAW OCR TEXT:\n${params.cleanedOcr || "(no text recovered)"}\n\nDATASET CANDIDATES (lexicon of ${params.datasetSize} Hale->Hosa entries):\n${params.evidence || "(none)"}`,
    },
  ]);
  const parsed = extractJson<AITranslationOutput>(content);
  console.log("[AksharaSetu] Translation completed");
  return {
    haleKannada: parsed.haleKannada ?? "",
    hosaKannada: parsed.hosaKannada ?? "",
    english: parsed.english ?? "",
    glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    uncertainTokens: Array.isArray(parsed.uncertainTokens) ? parsed.uncertainTokens : [],
  };
}
