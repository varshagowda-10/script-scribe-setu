/**
 * Dataset service — loads the Hale Kannada -> Hosa Kannada lexicon ONCE at
 * module scope and builds in-memory indexes for exact / normalized / fuzzy
 * lookups. Server-only. Replace src/data/hale-hosa.csv with the full
 * ~19,975-row export (same `halegannada,hosakannada_gloss` header) and nothing
 * else needs to change.
 */
import rawCsv from "../../data/hale-hosa.csv?raw";
import type { DatasetEntry, DatasetMatch } from "@/types/aksharasetu";
import { normalizeKannada } from "./normalize";

interface DatasetIndex {
  entries: DatasetEntry[];
  exact: Map<string, DatasetEntry>;
  normalized: Map<string, DatasetEntry>;
  bigrams: Map<string, number[]>;
}

function parseCsv(text: string): DatasetEntry[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  let haleCol = header.indexOf("halegannada");
  let hosaCol = header.indexOf("hosakannada_gloss");
  let start = 1;
  if (haleCol === -1 || hosaCol === -1) {
    // No recognisable header — assume first two columns, keep row 0 as data.
    haleCol = 0;
    hosaCol = 1;
    start = 0;
  }
  const out: DatasetEntry[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cols = splitCsvLine(line);
    const hale = (cols[haleCol] ?? "").trim();
    const hosa = (cols[hosaCol] ?? "").trim();
    if (!hale || !hosa) continue;
    out.push({ hale, hosa, key: normalizeKannada(hale) });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      cols.push(cur);
      cur = "";
    } else cur += ch;
  }
  cols.push(cur);
  return cols;
}

function bigramsOf(s: string): string[] {
  const grams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
  return grams.length ? grams : s ? [s] : [];
}

function buildIndex(): DatasetIndex {
  let entries: DatasetEntry[] = [];
  try {
    entries = parseCsv(rawCsv);
  } catch (err) {
    console.error("[AksharaSetu] Dataset parse failed:", err);
    entries = [];
  }
  const exact = new Map<string, DatasetEntry>();
  const normalized = new Map<string, DatasetEntry>();
  const bigrams = new Map<string, number[]>();
  entries.forEach((e, i) => {
    if (!exact.has(e.hale)) exact.set(e.hale, e);
    if (!normalized.has(e.key)) normalized.set(e.key, e);
    for (const g of new Set(bigramsOf(e.key))) {
      const bucket = bigrams.get(g);
      if (bucket) bucket.push(i);
      else bigrams.set(g, [i]);
    }
  });
  console.log(`[AksharaSetu] Dataset loaded: ${entries.length} entries`);
  return { entries, exact, normalized, bigrams };
}

let index: DatasetIndex | null = null;
function getIndex(): DatasetIndex {
  if (!index) index = buildIndex();
  return index;
}

export function datasetSize(): number {
  return getIndex().entries.length;
}

export function lookupExact(token: string): DatasetEntry | undefined {
  return getIndex().exact.get(token);
}

export function lookupNormalized(token: string): DatasetEntry | undefined {
  return getIndex().normalized.get(normalizeKannada(token));
}

/** Dice-coefficient candidate retrieval over the bigram inverted index. */
export function fuzzyCandidates(token: string, limit = 4, minScore = 0.62): DatasetMatch[] {
  const idx = getIndex();
  const key = normalizeKannada(token);
  if (key.length < 2) return [];
  const grams = new Set(bigramsOf(key));
  const hits = new Map<number, number>();
  for (const g of grams) {
    const bucket = idx.bigrams.get(g);
    if (!bucket) continue;
    // Skip pathologically common bigrams to keep retrieval fast on big datasets.
    if (bucket.length > 4000) continue;
    for (const i of bucket) hits.set(i, (hits.get(i) ?? 0) + 1);
  }
  const scored: DatasetMatch[] = [];
  for (const [i, shared] of hits) {
    const entry = idx.entries[i];
    if (!entry) continue;
    const other = bigramsOf(entry.key).length || 1;
    const score = (2 * shared) / (grams.size + other);
    if (score >= minScore) scored.push({ entry, score, kind: "fuzzy" });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Full match ladder: exact -> normalized -> strong fuzzy. */
export function matchToken(token: string): DatasetMatch[] {
  const ex = lookupExact(token);
  if (ex) return [{ entry: ex, score: 1, kind: "exact" }];
  const nz = lookupNormalized(token);
  if (nz) return [{ entry: nz, score: 0.95, kind: "normalized" }];
  return fuzzyCandidates(token);
}
