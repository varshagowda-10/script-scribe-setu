/**
 * Palm-leaf image preprocessing (browser, canvas based).
 * Modular by design: each step is a pure pass over ImageData so alternative
 * approaches can be swapped in later without touching the OCR or UI layers.
 */

export interface PreprocessOptions {
  maxDimension?: number;
  clipLimit?: number;
  /** Sauvola-style adaptive threshold window in px. 0 disables binarisation. */
  window?: number;
}

const DEFAULTS: Required<PreprocessOptions> = { maxDimension: 1800, clipLimit: 3.0, window: 25 };

export interface PreprocessOutput {
  /** Binarised image for OCR. */
  ocrDataUrl: string;
  /** Contrast-normalised (not binarised) image, better for vision models. */
  enhancedDataUrl: string;
  width: number;
  height: number;
}

export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {},
): Promise<PreprocessOutput> {
  const opts = { ...DEFAULTS, ...options };
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, opts.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const image = ctx.getImageData(0, 0, width, height);
  const gray = toGrayscale(image);
  const equalised = clahe(gray, width, height, opts.clipLimit);
  const denoised = median3(equalised, width, height);

  const enhanced = ctx.createImageData(width, height);
  writeGray(enhanced, denoised);
  ctx.putImageData(enhanced, 0, 0);
  const enhancedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

  const binary = opts.window > 0 ? adaptiveThreshold(denoised, width, height, opts.window) : denoised;
  const binaryImage = ctx.createImageData(width, height);
  writeGray(binaryImage, binary);
  ctx.putImageData(binaryImage, 0, 0);
  const ocrDataUrl = canvas.toDataURL("image/png");

  return { ocrDataUrl, enhancedDataUrl, width, height };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read the uploaded image."));
      img.src = URL.createObjectURL(file);
    });
  }
}

function toGrayscale(image: ImageData): Uint8ClampedArray {
  const { data } = image;
  const out = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = (data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114) | 0;
  }
  return out;
}

function writeGray(target: ImageData, gray: Uint8ClampedArray): void {
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const v = gray[p]!;
    target.data[i] = v;
    target.data[i + 1] = v;
    target.data[i + 2] = v;
    target.data[i + 3] = 255;
  }
}

/** Contrast Limited Adaptive Histogram Equalisation over an 8x8 tile grid. */
function clahe(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  clipLimit: number,
): Uint8ClampedArray {
  const tiles = 8;
  const tw = Math.ceil(width / tiles);
  const th = Math.ceil(height / tiles);
  const maps: Uint8ClampedArray[] = [];

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const hist = new Float32Array(256);
      let count = 0;
      for (let y = ty * th; y < Math.min((ty + 1) * th, height); y++) {
        for (let x = tx * tw; x < Math.min((tx + 1) * tw, width); x++) {
          hist[gray[y * width + x]!]! + 0;
          hist[gray[y * width + x]!] = (hist[gray[y * width + x]!] ?? 0) + 1;
          count++;
        }
      }
      if (count === 0) count = 1;
      const limit = (clipLimit * count) / 256;
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i]! > limit) {
          excess += hist[i]! - limit;
          hist[i] = limit;
        }
      }
      const bonus = excess / 256;
      const map = new Uint8ClampedArray(256);
      let cum = 0;
      for (let i = 0; i < 256; i++) {
        cum += hist[i]! + bonus;
        map[i] = Math.round((cum / count) * 255);
      }
      maps.push(map);
    }
  }

  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    const ty = Math.min(tiles - 1, Math.floor(y / th));
    for (let x = 0; x < width; x++) {
      const tx = Math.min(tiles - 1, Math.floor(x / tw));
      out[y * width + x] = maps[ty * tiles + tx]![gray[y * width + x]!]!;
    }
  }
  return out;
}

/** 3x3 median filter — removes speckle without eating thin strokes. */
function median3(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  const win: number[] = new Array(9);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        out[y * width + x] = gray[y * width + x]!;
        continue;
      }
      let k = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) win[k++] = gray[(y + dy) * width + (x + dx)]!;
      win.sort((a, b) => a - b);
      out[y * width + x] = win[4]!;
    }
  }
  return out;
}

/** Local-mean adaptive threshold (integral image), gentle on stroke width. */
function adaptiveThreshold(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  window: number,
): Uint8ClampedArray {
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x]!;
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)]! + rowSum;
    }
  }
  const r = Math.max(3, Math.floor(window / 2));
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height - 1, y + r);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width - 1, x + r);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        integral[(y1 + 1) * (width + 1) + (x1 + 1)]! -
        integral[y0 * (width + 1) + (x1 + 1)]! -
        integral[(y1 + 1) * (width + 1) + x0]! +
        integral[y0 * (width + 1) + x0]!;
      const mean = sum / area;
      out[y * width + x] = gray[y * width + x]! < mean * 0.92 ? 0 : 255;
    }
  }
  return out;
}
