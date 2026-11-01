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

/** Rasterize the bitmap at `scale` into a JPEG/PNG blob. */
const renderScaledImage = async (
  bitmap: ImageBitmap,
  scale: number,
  type: string,
): Promise<Blob | null> => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
};

/**
 * Re-encode the image, shrinking until it lands near `targetKb`.
 * Keeps PNG (and GIF) as PNG to preserve transparency; everything else saves as JPEG.
 */
export const resizeImageBlob = async (blob: Blob, targetKb: number): Promise<Blob> => {
  const target = clampTargetKb(targetKb);
  const bitmap = await createImageBitmap(blob);
  const type = blob.type === "image/png" || blob.type === "image/gif" ? "image/png" : "image/jpeg";
  let scale = Math.min(1, Math.sqrt(target / bytesToKb(blob.size)));
  let best: Blob | null = null;
  let bestDiff = Infinity;
  for (let i = 0; i < 5; i++) {
    const out = await renderScaledImage(bitmap, scale, type);
    if (!out) break;
    const outKb = bytesToKb(out.size);
    const diff = Math.abs(outKb - target);
    if (diff < bestDiff) {
      best = out;
      bestDiff = diff;
    }
    if (outKb <= target) break; // landed at/below the requested size
    scale *= Math.sqrt(target / outKb);
    if (scale < 0.05) break;
  }
  bitmap.close();
  if (!best) throw new Error("Could not resize the image.");
  return best;
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

/** Re-embed the PDF at a smaller page size until it lands near `targetKb`. */
export const resizePdfBlob = async (bytes: Uint8Array, targetKb: number): Promise<Blob> => {
  const target = clampTargetKb(targetKb);
  let scale = Math.min(1, Math.sqrt(target / bytesToKb(bytes.byteLength)));
  let best: Blob | null = null;
  let bestDiff = Infinity;
  for (let i = 0; i < 3; i++) {
    const out = await scalePdfBlob(bytes, scale);
    const outKb = bytesToKb(out.size);
    const diff = Math.abs(outKb - target);
    if (diff < bestDiff) {
      best = out;
      bestDiff = diff;
    }
    if (outKb <= target) break;
    scale *= Math.sqrt(target / outKb);
    if (scale < 0.05) break;
  }
  if (!best) throw new Error("Could not resize the PDF.");
  return best;
};

/**
 * Download a file at (about) the requested size in KB.
 * When the target is at or above the original size, the original downloads unchanged.
 * Only image and PDF files are resizable; anything else downloads as-is.
 */
export const downloadResized = async (
  url: string,
  filename: string,
  targetKb: number,
  kind: "image" | "pdf",
): Promise<void> => {
  const blob = await fetchBlob(url);
  if (clampTargetKb(targetKb) >= bytesToKb(blob.size)) {
    await downloadOriginal(url, filename);
    return;
  }
  const resized =
    kind === "pdf"
      ? await resizePdfBlob(new Uint8Array(await blob.arrayBuffer()), targetKb)
      : await resizeImageBlob(blob, targetKb);
  saveAs(resized, withSizeSuffix(filename, bytesToKb(resized.size)));
};
