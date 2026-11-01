import { describe, expect, test } from "bun:test";
import { bytesToKb, clampTargetKb, withSizeSuffix } from "../src/lib/resizeDownload";

describe("clampTargetKb", () => {
  test("clamps zero and negatives up to 1 KB", () => {
    expect(clampTargetKb(0)).toBe(1);
    expect(clampTargetKb(-50)).toBe(1);
  });

  test("clamps huge values down to 1 GB", () => {
    expect(clampTargetKb(5_000_000)).toBe(1024 * 1024);
  });

  test("rounds fractions to whole KB", () => {
    expect(clampTargetKb(500.4)).toBe(500);
  });

  test("keeps normal values unchanged", () => {
    expect(clampTargetKb(500)).toBe(500);
  });
});

describe("bytesToKb", () => {
  test("converts bytes to whole KB", () => {
    expect(bytesToKb(512 * 1024)).toBe(512);
  });

  test("rounds up small files to at least 1 KB", () => {
    expect(bytesToKb(100)).toBe(1);
    expect(bytesToKb(0)).toBe(1);
  });
});

describe("withSizeSuffix", () => {
  test("adds the resized KB before the extension", () => {
    expect(withSizeSuffix("photo.jpg", 500)).toBe("photo-resized-500kb.jpg");
  });

  test("adds the resized KB to PDF names", () => {
    expect(withSizeSuffix("report.pdf", 250)).toBe("report-resized-250kb.pdf");
  });

  test("handles names without an extension", () => {
    expect(withSizeSuffix("scan", 750)).toBe("scan-resized-750kb");
  });
});
