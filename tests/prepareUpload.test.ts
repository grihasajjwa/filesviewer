import { expect, mock, test } from "bun:test";
import { isHeicPhoto, prepareUpload, prepareUploads } from "../src/lib/prepareUpload";

mock.module("heic-to/csp", () => ({
  heicTo: async () => new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }),
}));

test("HEIC photos become JPG files with JPEG type and converted size", async () => {
  const file = new File(["original HEIC bytes"], "PHONE.HEIC", { type: "image/heic", lastModified: 123 });
  const result = await prepareUpload(file);
  expect(result.name).toBe("PHONE.jpg");
  expect(result.type).toBe("image/jpeg");
  expect(result.size).toBe(4);
  expect(result.lastModified).toBe(123);
});

test("HEIF files and HEIC content with missing MIME type are detected", async () => {
  expect(await isHeicPhoto(new File(["data"], "photo.heif"))).toBe(true);
  expect(await isHeicPhoto(new File(["\0\0\0\x18ftypheic"], "photo.bin"))).toBe(true);
});

test("PDF and JPG files are unchanged", async () => {
  for (const name of ["document.pdf", "photo.jpg"]) {
    const file = new File(["unchanged"], name);
    expect(await prepareUpload(file)).toBe(file);
  }
});

test("Multiple photos convert with progress callbacks", async () => {
  const files = [
    new File(["a"], "one.heic", { type: "image/heic" }),
    new File(["b"], "two.heic", { type: "image/heic" }),
  ];
  const progress: number[] = [];
  const results = await prepareUploads(files, (done) => progress.push(done));
  expect(results.map((file) => file.name)).toEqual(["one.jpg", "two.jpg"]);
  expect(results.every((file) => file.type === "image/jpeg")).toBe(true);
  expect(progress).toEqual([1, 2]);
});