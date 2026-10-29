export async function isHeicPhoto(file: File): Promise<boolean> {
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf](?:-sequence)?$/i.test(file.type)) return true;
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const text = String.fromCharCode(...header);
  return text.slice(4, 8) === "ftyp" && /heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(text.slice(8));
}

const CONVERT_TIMEOUT_MS = 90_000;

async function convertInWorker(file: File): Promise<Blob | null> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const worker = new Worker(new URL("./heic.worker.ts", import.meta.url), { type: "module" });
      const finish = () => { clearTimeout(timeout); worker.terminate(); };
      const timeout = setTimeout(() => {
        finish();
        reject(new Error("Photo conversion timed out."));
      }, CONVERT_TIMEOUT_MS);
      worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
        finish();
        if (event.data.blob) resolve(event.data.blob);
        else reject(new Error(event.data.error || "Photo conversion failed."));
      };
      worker.onerror = () => { finish(); reject(new Error("Photo conversion failed.")); };
      worker.postMessage(file);
    });
  } catch {
    return null; // fall through to the next strategy
  }
}

async function convertOnMainThread(file: File): Promise<Blob | null> {
  try {
    const { heicTo } = await import("heic-to/csp");
    return await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  } catch {
    return null;
  }
}

// Safari/iOS can decode HEIC natively: draw it into a canvas and re-encode as JPEG.
async function convertWithBrowserDecoder(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    if (!width || !height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  } catch {
    return null;
  }
}

async function convertPhoto(file: File): Promise<Blob> {
  const strategies = [convertInWorker, convertOnMainThread, convertWithBrowserDecoder];
  for (const strategy of strategies) {
    const blob = await strategy(file);
    if (blob && blob.size && blob.type === "image/jpeg") return blob;
  }
  throw new Error("all-conversion-strategies-failed");
}

export async function prepareUpload(file: File): Promise<File> {
  if (!(await isHeicPhoto(file))) return file;
  try {
    const blob = await convertPhoto(file);
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    throw new Error(`Could not convert ${file.name} to JPG. Please choose a JPG photo or try again.`);
  }
}

// Convert several HEIC photos at once (a few in parallel) with progress updates.
export async function prepareUploads(
  files: File[],
  onProgress?: (done: number, total: number, name: string) => void,
): Promise<File[]> {
  const results = new Array<File>(files.length);
  let done = 0;
  let next = 0;
  const concurrency = Math.min(3, files.length);

  const runNext = async () => {
    while (next < files.length) {
      const index = next++;
      results[index] = await prepareUpload(files[index]);
      done += 1;
      onProgress?.(done, files.length, results[index].name);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, runNext));
  return results;
}
