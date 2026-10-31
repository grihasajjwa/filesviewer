import { saveAs } from "file-saver";

/** Clamp the resize percent the user typed into a safe range (5–200). */
export const clampResizePercent = (percent: number): number =>
  Math.min(200, Math.max(5, Math.round(percent)));

/** "report.pdf" + 50 => "report-resized-50.pdf" (original name when percent is 100). */
export const withSizeSuffix = (filename: string, percent: number): string => {
  if (percent === 100) return filename;
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return `${filename}-resized-${percent}`;
  return `${filename.slice(0, dot)}-resized-${percent}${filename.slice(dot)}`;
};

const fetchBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the file (status ${res.status}).`);
  return res.blob();
};

/** Download the file exactly as stored (the default). */
export const downloadOriginal = async (url: string, filename: string): Promise<void> => {
  try {
    // Fetch to a blob first so the download keeps a proper filename everywhere.
    const blob = await fetchBlob(url);
    saveAs(blob, filename);
  } catch {
    saveAs(url, filename);
  }
};

/** Scale an image to `percent` of its original size and return the new blob. */
export const resizeImageBlob = async (blob: Blob, percent: number): Promise<Blob> => {
  const scale = percent / 100;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image for resizing.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Keep PNG (and GIF) as PNG to preserve transparency; everything else saves as JPEG.
  const type = blob.type === "image/png" || blob.type === "image/gif" ? "image/png" : "image/jpeg";
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!out) throw new Error("Could not resize the image.");
  return out;
};

/**
 * Scale every page of a PDF to `percent` of its original size.
 * Pages are re-embedded as vector content, so text stays sharp and selectable.
 */
export const resizePdfBlob = async (bytes: Uint8Array, percent: number): Promise<Blob> => {
  const scale = percent / 100;
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

/**
 * Download a file, resized when the user picked a size other than the original.
 * Only image and PDF files are resizable; anything else downloads as-is.
 */
export const downloadResized = async (
  url: string,
  filename: string,
  percent: number,
  kind: "image" | "pdf",
): Promise<void> => {
  const safePercent = clampResizePercent(percent);
  if (safePercent === 100) {
    await downloadOriginal(url, filename);
    return;
  }
  const blob = await fetchBlob(url);
  const resized =
    kind === "pdf"
      ? await resizePdfBlob(new Uint8Array(await blob.arrayBuffer()), safePercent)
      : await resizeImageBlob(blob, safePercent);
  saveAs(resized, withSizeSuffix(filename, safePercent));
};
