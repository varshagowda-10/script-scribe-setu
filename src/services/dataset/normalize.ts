/** Kannada text normalisation shared by the dataset and reconstruction layers. */

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
/** Decorative / OCR-artifact punctuation frequently produced on palm-leaf scans. */
const ARTIFACTS = /[|¦।॥`~^*_+=<>{}\[\]\\/@#$%&"'“”‘’·•–—]/g;

/** Harmless-variation normalisation used for dataset keys and matching. */
export function normalizeKannada(input: string): string {
  return input
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(ARTIFACTS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light clean-up of a whole OCR page: keeps line structure, drops junk. */
export function cleanOcrText(input: string): string {
  return input
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(ARTIFACTS, " ")
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

const KANNADA = /[\u0C80-\u0CFF]/;

export function hasKannada(s: string): boolean {
  return KANNADA.test(s);
}

export function kannadaCharCount(s: string): number {
  return (s.match(/[\u0C80-\u0CFF]/g) ?? []).length;
}

export function tokenize(text: string): string[] {
  return text
    .split(/[\s\n]+/)
    .map((t) => normalizeKannada(t))
    .filter((t) => t.length > 0 && hasKannada(t));
}
