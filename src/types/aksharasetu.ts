/** Shared domain types for the AksharaSetu pipeline. */

export interface OCRWord {
  text: string;
  confidence: number; // 0-100, as reported by the OCR engine
}

export interface OCRResult {
  text: string;
  /** Mean engine-reported confidence (0-100). Null when the engine gives none. */
  confidence: number | null;
  words: OCRWord[];
  engine: "tesseract-kan" | "vision-assisted" | "tesseract-kan+vision";
}

export interface DatasetEntry {
  hale: string;
  hosa: string;
  /** NFC-normalised, mark-stripped form used for lookups. */
  key: string;
}

export type MatchKind = "exact" | "normalized" | "fuzzy" | "none";

export interface DatasetMatch {
  entry: DatasetEntry;
  score: number; // 0-1
  kind: MatchKind;
}

export interface CorrectionCandidate {
  token: string;
  suspicious: boolean;
  matches: DatasetMatch[];
}

export interface GlossaryPair {
  hale: string;
  hosa: string;
  english: string;
  note?: string;
}

export interface TranslationResult {
  haleKannada: string;
  hosaKannada: string;
  english: string;
  /** 0-100. Null when no meaningful confidence could be measured. */
  confidence: number | null;
  confidenceBasis: "measured-ocr" | "estimated-dataset-support" | "unavailable";
  glossary: GlossaryPair[];
  notes: string[];
  ocrEngine: string;
  rawOcr: string;
  stats: PipelineStats;
  cached: boolean;
}

export interface PipelineStats {
  tokens: number;
  exactMatches: number;
  normalizedMatches: number;
  fuzzyMatches: number;
  unresolved: number;
  datasetEntries: number;
  aiAssisted: boolean;
}
