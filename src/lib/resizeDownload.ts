import { saveAs } from "file-saver";

/** Clamp the target size (KB) the user typed into a safe range (1 KB – 1 GB). */
export const clampTargetKb = (kb: number): number =>
  Math.min(1024 * 1024, Math.max(1, Math.round(kb)));

/** Bytes → whole KB (at least 1). */
export const bytesToKb = (bytes: number): number =>
  Math.max(1, Math.round(bytes / 1024));

/** "report.pdf" + 500 => "report-resized-500kb.pdf". */
export const withSizeSuffix = (filename: string, kb: number): string => {
  const dot = filename.lastIndexOf(".");
  const suffix = `-resized-${kb}kb`;
  if (dot <= 0) return `${filename}${suffix}`;
  return `${filename.slice(0, dot)}${suffix}${filename.slice(dot)}`;
};

/** Quality bounds for re-encoding: never mush, never bloated. */
export const MIN_JPEG_QUALITY = 0.35;
export const MAX_JPEG_QUALITY = 0.95;

/** Scale bounds shared by the image and PDF tuners. */
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 1.5;

/** JPEG quality used when rasterizing PDF pages. */
const PDF_JPEG_QUALITY = 0.8;

/**
 * Next scale after a sizing attempt. Over target → shrink by the measured
 * size ratio; far under target (< 85% of it) → grow so the whole size budget
 * is used; inside the 85–100% band → unchanged, meaning "around the target".
 */
export const refineScaleForTarget = (scale: number, outKb: number, targetKb: number): number => {
  if (outKb <= 0 || targetKb <= 0) return scale;
  if (outKb > targetKb) return Math.max(MIN_SCALE, scale * Math.sqrt(targetKb / outKb));
  if (outKb < targetKb * 0.85) {
    return Math.min(MAX_SCALE, scale * Math.min(1.3, Math.sqrt(targetKb / outKb)));
  }
  return scale;
};

/**
 * Pick the candidate closest to the target from below (largest that still fits).
 * When nothing fits, fall back to the smallest candidate so the file still shrinks.
 */
export const pickBestSizeIndex = (sizesKb: number[], targetKb: number): number => {
  if (sizesKb.length === 0) return -1;
  let best = -1;
  let bestSize = -1;
  let smallest = 0;
  sizesKb.forEach((size, i) => {
    if (size <= targetKb && size > bestSize) {
      bestSize = size;
      best = i;
    }
    if (size < sizesKb[smallest]) smallest = i;
  });
  return best >= 0 ? best : smallest;
};

const fetchBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the file (status ${res.status}).`);
  return res.blob();
};

/** Download the file exactly as stored. */
export const downloadOriginal = async (url: string, filename: string): Promise<void> => {
  try {
    // Fetch to a blob first so the download keeps a proper filename everywhere.
    const blob = await fetchBlob(url);
    saveAs(blob, filename);
  } catch {
    saveAs(url, filename);
  }
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Rasterize the bitmap at `scale` onto a canvas (white backdrop for JPEG). */
const drawScaled = (bitmap: ImageBitmap, scale: number, flatten: boolean): HTMLCanvasElement | null => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (flatten) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
};

/**
 * Re-encode the image so it lands just under `targetKb` with the best quality:
 * binary-search the JPEG quality at full resolution (largest quality that still
 * fits, so the whole size budget is spent on sharpness), and only shrink the
 * dimensions when no quality at full size can reach the target.
 * PNGs that fit keep their native format (transparency preserved); PNGs that
 * cannot reach the target are flattened to JPEG (white background).
 */
export const resizeImageBlob = async (blob: Blob, targetKb: number): Promise<Blob> => {
  const target = clampTargetKb(targetKb);
  const bitmap = await createImageBitmap(blob);
  const isPngSource = blob.type === "image/png" || blob.type === "image/gif";
  const candidates: { size: number; blob: Blob }[] = [];
  let scale = 1;

  for (let round = 0; round < 4; round++) {
    if (isPngSource) {
      const canvas = drawScaled(bitmap, scale, false);
      const png = canvas ? await toBlob(canvas, "image/png") : null;
      if (png) {
        candidates.push({ size: png.size, blob: png });
        if (bytesToKb(png.size) <= target) break;
      }
    }
    let fit = false;
    let lo = MIN_JPEG_QUALITY;
    let hi = MAX_JPEG_QUALITY;
    for (let step = 0; step < 7; step++) {
      const quality = step === 0 ? hi : (lo + hi) / 2;
      const canvas = drawScaled(bitmap, scale, true);
      const jpeg = canvas ? await toBlob(canvas, "image/jpeg", quality) : null;
      if (!jpeg) continue;
      candidates.push({ size: jpeg.size, blob: jpeg });
      if (bytesToKb(jpeg.size) <= target) {
        fit = true;
        lo = quality;
      } else {
        hi = quality;
      }
      if (hi - lo <= 0.04) break;
    }
    if (fit) break;
    scale *= 0.7;
    if (scale < 0.05) break;
  }
  bitmap.close();

  const sizes = candidates.map((c) => bytesToKb(c.size));
  const best = candidates[pickBestSizeIndex(sizes, target)];
  if (!best) throw new Error("Could not resize the image.");
  return best.blob;
};

/** Scale every page of a PDF by `scale` (pages stay vector, so text stays sharp). */
export const scalePdfBlob = async (bytes: Uint8Array, scale: number): Promise<Blob> => {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(bytes);
  embedded.forEach((page) => {
    const target = out.addPage([page.width * scale, page.height * scale]);
    target.drawPage(page, { xScale: scale, yScale: scale });
  });
  const saved = await out.save();
  return new Blob([saved as BlobPart], { type: "application/pdf" });
};

let pdfWorkerConfigured = false;
const configurePdfWorker = async (): Promise<void> => {
  if (pdfWorkerConfigured) return;
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfWorkerConfigured = true;
};

/** Render every page to a JPEG at `scale`/`quality` and pack it into a new PDF. */
const renderPdfToJpegPdf = async (
  doc: import("pdfjs-dist").PDFDocumentProxy,
  scale: number,
  quality: number,
): Promise<Blob> => {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not render the PDF.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    if (!jpeg) throw new Error("Could not render the PDF.");
    const img = await out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
    const pdfPage = out.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    page.cleanup();
  }
  const saved = await out.save();
  return new Blob([saved as BlobPart], { type: "application/pdf" });
};

/**
 * Rasterize the PDF toward `targetKb` at readable quality: start from a scale
 * estimated from the measured size ratio, then refine the scale until the
 * output lands in the 85–100% band of the target. Every attempt is kept and
 * the best one that fits is returned. Returns null when rasterization fails
 * (the caller falls back to the vector scaler).
 */
const rasterizePdfToTarget = async (bytes: Uint8Array, targetKb: number): Promise<Blob | null> => {
  await configurePdfWorker();
  const pdfjs = await import("pdfjs-dist");
  // Copy the bytes: the PDF worker takes ownership of the buffer it is given.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  try {
    const originalKb = bytesToKb(bytes.byteLength);
    let scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.sqrt(targetKb / originalKb)));
    const candidates: { size: number; blob: Blob }[] = [];
    for (let i = 0; i < 5; i++) {
      const out = await renderPdfToJpegPdf(doc, scale, PDF_JPEG_QUALITY);
      const outKb = bytesToKb(out.size);
      candidates.push({ size: out.size, blob: out });
      const next = refineScaleForTarget(scale, outKb, targetKb);
      if (next === scale) break;
      scale = next;
    }
    const sizes = candidates.map((c) => bytesToKb(c.size));
    return candidates[pickBestSizeIndex(sizes, targetKb)].blob;
  } finally {
    await task.destroy();
  }
};

/**
 * Re-encode the PDF until it lands at/below `targetKb`. Rasterizing is the only
 * way to genuinely shrink a PDF; the vector scaler is the fallback and can only
 * scale pages down, not compress the underlying content.
 */
export const resizePdfBlob = async (bytes: Uint8Array, targetKb: number): Promise<Blob> => {
  const target = clampTargetKb(targetKb);
  try {
    const rasterized = await rasterizePdfToTarget(bytes, target);
    if (rasterized) return rasterized;
  } catch (error) {
    console.warn("PDF rasterization failed, falling back to vector scaling:", error);
  }
  let scale = Math.min(1, Math.sqrt(target / bytesToKb(bytes.byteLength)));
  let best: Blob | null = null;
  for (let i = 0; i < 3; i++) {
    const out = await scalePdfBlob(bytes, scale);
    if (!best || out.size < best.size) best = out;
    const outKb = bytesToKb(out.size);
    if (outKb <= target) break;
    const next = refineScaleForTarget(scale, outKb, target);
    if (next >= scale) break;
    scale = next;
  }
  if (!best) throw new Error("Could not resize the PDF.");
  return best;
};

/**
 * Download the file at (about) the requested size in KB.
 * Returns the byte size that was actually saved. Never saves a file larger
 * than the original: if every attempt comes out bigger, the original downloads.
 * Only image and PDF files are resizable; anything else downloads as-is.
 */
export const downloadResized = async (
  url: string,
  filename: string,
  targetKb: number,
  kind: "image" | "pdf",
): Promise<number> => {
  const blob = await fetchBlob(url);
  const saveOriginal = (): number => {
    saveAs(blob, filename);
    return blob.size;
  };
  if (clampTargetKb(targetKb) >= bytesToKb(blob.size)) return saveOriginal();

  const resized =
    kind === "pdf"
      ? await resizePdfBlob(new Uint8Array(await blob.arrayBuffer()), targetKb)
      : await resizeImageBlob(blob, targetKb);
  if (resized.size >= blob.size) return saveOriginal();

  saveAs(resized, withSizeSuffix(filename, bytesToKb(resized.size)));
  return resized.size;
};
