import { describe, it, expect } from "vitest";
import { detectLanguage, countLines, countNonBlankLines } from "./languageDetector";
import { SAMPLES } from "./sampleCode";

describe("detectLanguage", () => {
  it("returns Unknown for empty input", () => {
    const r = detectLanguage("");
    expect(r.language).toBe("Unknown");
    expect(r.confidence).toBe(0);
  });

  it("returns Unknown for non-source text", () => {
    const r = detectLanguage("just some plain text\nwith no code markers");
    expect(r.language).toBe("Unknown");
  });

  // 各サンプルが期待通り判定されるか
  for (const sample of SAMPLES) {
    it(`detects ${sample.language} from sample.${sample.id}`, () => {
      const r = detectLanguage(sample.code);
      expect(r.language).toBe(sample.language);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.evidence.length).toBeGreaterThan(0);
    });
  }

  it("returns evidence for detected language", () => {
    const cobol = SAMPLES.find((s) => s.id === "cobol")!;
    const r = detectLanguage(cobol.code);
    expect(r.evidence).toContain("IDENTIFICATION DIVISION");
  });

  it("returns candidates sorted by score descending", () => {
    const cobol = SAMPLES.find((s) => s.id === "cobol")!;
    const r = detectLanguage(cobol.code);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it("VB6 sample is detected as VB6 not BASIC", () => {
    // BASIC ルールが反応する可能性があるが、VB6 専用トークン (Begin VB., Attribute VB_Name) で優位に
    const vb6 = SAMPLES.find((s) => s.id === "vb6")!;
    const r = detectLanguage(vb6.code);
    expect(r.language).toBe("VB6");
  });
});

describe("countLines", () => {
  it("returns 0 for empty string", () => {
    expect(countLines("")).toBe(0); // 実装は falsy で早期 return
  });

  it("counts single line", () => {
    expect(countLines("hello")).toBe(1);
  });

  it("counts multiple lines with LF", () => {
    expect(countLines("a\nb\nc")).toBe(3);
  });

  it("counts multiple lines with CRLF", () => {
    expect(countLines("a\r\nb\r\nc")).toBe(3);
  });

  it("counts trailing newline correctly", () => {
    expect(countLines("a\nb\n")).toBe(3); // 最後に空行が1つできる
  });
});

describe("countNonBlankLines", () => {
  it("returns 0 for empty input", () => {
    expect(countNonBlankLines("")).toBe(0);
  });

  it("ignores whitespace-only lines", () => {
    expect(countNonBlankLines("a\n   \nb\n\nc")).toBe(3);
  });

  it("counts non-blank lines", () => {
    expect(countNonBlankLines("hello\nworld")).toBe(2);
  });
});
