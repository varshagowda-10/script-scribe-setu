/** Simple browser-side translation history (thumbnail + result). */
import type { TranslationResult } from "@/types/aksharasetu";

export interface HistoryItem {
  id: string;
  createdAt: string;
  thumbnail: string;
  result: TranslationResult;
}

const KEY = "aksharasetu:history";
const MAX = 20;

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(item: HistoryItem): void {
  if (typeof window === "undefined") return;
  try {
    const next = [item, ...loadHistory().filter((h) => h.id !== item.id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — history is best-effort */
  }
}

export function removeHistory(id: string): HistoryItem[] {
  const next = loadHistory().filter((h) => h.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Downscaled JPEG thumbnail so history stays inside localStorage limits. */
export async function makeThumbnail(file: File, max = 360): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("thumbnail failed"));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
