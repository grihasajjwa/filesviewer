export async function isHeicPhoto(file: File): Promise<boolean> {
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf](?:-sequence)?$/i.test(file.type)) return true;
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const text = String.fromCharCode(...header);
  return text.slice(4, 8) === "ftyp" && /heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(text.slice(8));
}

async function convertPhoto(file: File): Promise<Blob> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    const { heicTo } = await import("heic-to/csp");
    return heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./heic.worker.ts", import.meta.url), { type: "module" });
    const finish = () => { clearTimeout(timeout); worker.terminate(); };
    const timeout = setTimeout(() => {
      finish();
      reject(new Error("Photo conversion timed out."));
    }, 120000);
    worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
      finish();
      if (event.data.blob) resolve(event.data.blob);
      else reject(new Error(event.data.error || "Photo conversion failed."));
    };
    worker.onerror = () => { finish(); reject(new Error("Photo conversion failed.")); };
    worker.postMessage(file);
  });
}

export async function prepareUpload(file: File): Promise<File> {
  if (!(await isHeicPhoto(file))) return file;
  try {
    const blob = await convertPhoto(file);
    if (!blob.size || blob.type !== "image/jpeg") throw new Error("Invalid JPEG result.");
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    throw new Error(`Could not convert ${file.name} to JPG. Please choose a JPG photo or try again.`);
  }
}