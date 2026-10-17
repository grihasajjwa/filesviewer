import { heicTo } from "heic-to/next";

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const blob = await heicTo({ blob: event.data, type: "image/jpeg", quality: 0.9 });
    self.postMessage({ blob });
  } catch {
    self.postMessage({ error: "Unable to decode this HEIC photo." });
  }
};