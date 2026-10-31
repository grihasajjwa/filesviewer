import { describe, expect, test } from "bun:test";
import { clampResizePercent, withSizeSuffix } from "../src/lib/resizeDownload";

describe("clampResizePercent", () => {
  test("keeps the default original size", () => {
    expect(clampResizePercent(100)).toBe(100);
  });

  test("clamps too-small values up to 5", () => {
    expect(clampResizePercent(0)).toBe(5);
  });

  test("clamps too-large values down to 200", () => {
    expect(clampResizePercent(500)).toBe(200);
  });
});

describe("withSizeSuffix", () => {
  test("keeps the original filename at 100%", () => {
    expect(withSizeSuffix("report.pdf", 100)).toBe("report.pdf");
  });

  test("adds the resized percent before the extension", () => {
    expect(withSizeSuffix("photo.jpg", 50)).toBe("photo-resized-50.jpg");
  });

  test("handles names without an extension", () => {
    expect(withSizeSuffix("scan", 75)).toBe("scan-resized-75");
  });
});
