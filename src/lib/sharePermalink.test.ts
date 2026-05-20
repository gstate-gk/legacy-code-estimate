import { describe, it, expect } from "vitest";
import { encodeShare, decodeShare } from "./sharePermalink";
import type { EstimateResult } from "./estimate";

const sample: EstimateResult = {
  detection: {
    language: "COBOL",
    confidence: 1,
    evidence: ["IDENTIFICATION DIVISION"],
    candidates: [{ language: "COBOL", score: 45 }],
  },
  lines_total: 320,
  lines_non_blank: 290,
  difficulty_stars: 3,
  reduction_range: { min: 0.7, max: 0.92 },
  workdays_range: { min: 8, max: 18 },
  similar_cases: [],
  notes: ["test note"],
  caveats: [],
  model_used: "gemini-2.5-flash",
};

describe("sharePermalink encode/decode roundtrip", () => {
  it("encodes and decodes back to the same result", () => {
    const token = encodeShare(sample, "preview text");
    const decoded = decodeShare(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.result.detection.language).toBe("COBOL");
    expect(decoded?.result.lines_total).toBe(320);
    expect(decoded?.result.difficulty_stars).toBe(3);
    expect(decoded?.result.reduction_range).toEqual({ min: 0.7, max: 0.92 });
    expect(decoded?.preview).toBe("preview text");
  });

  it("encodes without preview", () => {
    const token = encodeShare(sample);
    const decoded = decodeShare(token);
    expect(decoded?.preview).toBeUndefined();
  });

  it("truncates preview at 200 chars", () => {
    const longText = "x".repeat(500);
    const token = encodeShare(sample, longText);
    const decoded = decodeShare(token);
    expect(decoded?.preview?.length).toBe(200);
  });

  it("returns null for invalid token", () => {
    expect(decodeShare("not-base64-data!!!")).toBeNull();
  });

  it("returns null for empty token", () => {
    expect(decodeShare("")).toBeNull();
  });

  it("produces URL-safe characters only", () => {
    const token = encodeShare(sample, "日本語テキストを含む");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("preserves Japanese text through utf-8 encoding", () => {
    const japaneseSample = { ...sample, notes: ["日本語のメモ", "もう一つ"] };
    const token = encodeShare(japaneseSample);
    const decoded = decodeShare(token);
    expect(decoded?.result.notes).toEqual(["日本語のメモ", "もう一つ"]);
  });
});
