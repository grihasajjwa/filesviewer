import { describe, expect, test } from "bun:test";
import {
  MAX_SCALE,
  MIN_SCALE,
  bytesToKb,
  clampTargetKb,
  pickBestSizeIndex,
  refineScaleForTarget,
  withSizeSuffix,
} from "../src/lib/resizeDownload";

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

describe("pickBestSizeIndex", () => {
  test("picks the largest candidate that fits under the target", () => {
    // candidates in JPEG-quality order: shrinking sizes
    expect(pickBestSizeIndex([900, 620, 480, 300, 120], 500)).toBe(2);
  });

  test("prefers a near-target fit over a much smaller one", () => {
    // the 50 KB result must never win when 190 KB also fits the 200 KB target
    expect(pickBestSizeIndex([190, 50], 200)).toBe(0);
  });

  test("falls back to the smallest candidate when nothing fits", () => {
    expect(pickBestSizeIndex([900, 700, 650], 500)).toBe(2);
  });

  test("returns -1 with no candidates", () => {
    expect(pickBestSizeIndex([], 500)).toBe(-1);
  });

  test("an exact fit wins", () => {
    expect(pickBestSizeIndex([900, 500, 300], 500)).toBe(1);
  });
});

describe("refineScaleForTarget", () => {
  test("shrinks the scale when the output is over the target", () => {
    const next = refineScaleForTarget(1, 400, 200);
    expect(next).toBeLessThan(1);
    expect(next).toBeGreaterThan(MIN_SCALE);
  });

  test("grows the scale when the output is far under the target", () => {
    // 50 KB for a 200 KB request must push the scale UP, not stop there
    const next = refineScaleForTarget(0.6, 50, 200);
    expect(next).toBeGreaterThan(0.6);
  });

  test("stops tuning inside the 85–100% band of the target", () => {
    expect(refineScaleForTarget(0.8, 180, 200)).toBe(0.8);
    expect(refineScaleForTarget(0.8, 200, 200)).toBe(0.8);
  });

  test("caps growth so it cannot blow past the target", () => {
    expect(refineScaleForTarget(1.2, 40, 200)).toBeLessThanOrEqual(MAX_SCALE);
  });

  test("never shrinks below the minimum scale", () => {
    expect(refineScaleForTarget(MIN_SCALE, 1000, 50)).toBe(MIN_SCALE);
  });

  test("ignores nonsense measurements", () => {
    expect(refineScaleForTarget(0.5, 0, 200)).toBe(0.5);
    expect(refineScaleForTarget(0.5, 100, 0)).toBe(0.5);
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
