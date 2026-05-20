import { describe, it, expect } from "vitest";
import { buildTweetText, buildTwitterIntent, buildMarkdown, buildCsv } from "./shareText";
import type { EstimateResult } from "./estimate";

const sample: EstimateResult = {
  detection: {
    language: "COBOL",
    confidence: 1,
    evidence: ["IDENTIFICATION DIVISION", "PROCEDURE DIVISION"],
    candidates: [{ language: "COBOL", score: 45 }],
  },
  lines_total: 1500,
  lines_non_blank: 1200,
  difficulty_stars: 3,
  reduction_range: { min: 0.7, max: 0.92 },
  workdays_range: { min: 8, max: 18 },
  similar_cases: [
    {
      id: "acas_gl",
      name: "ACAS GL",
      source_language: "COBOL",
      original_lines: 12000,
      converted_lines: 3277,
      reduction_rate: 0.73,
      similarity_score: 0.85,
      rationale: "同じ COBOL 業務系",
      museum_url: null,
      zenn_url: null,
      article_url: null,
      source_repo_url: null,
    },
  ],
  notes: ["DIVISION 構造が標準的", "PERFORM ループあり"],
  caveats: ["業務ロジックは見ていない"],
  model_used: "gemini-2.5-flash",
};

describe("buildTweetText", () => {
  it("includes language, lines, stars, reduction, workdays", () => {
    const text = buildTweetText(sample);
    expect(text).toContain("COBOL");
    expect(text).toContain("1,500");
    expect(text).toContain("★★★");
    expect(text).toContain("70.0%");
    expect(text).toContain("92.0%");
    expect(text).toContain("8〜18人日");
  });

  it("includes hashtags", () => {
    const text = buildTweetText(sample);
    expect(text).toContain("#LegacyCode");
    expect(text).toContain("#COBOL変換");
  });

  it("sanitizes special chars from language in hashtag", () => {
    const r = { ...sample, detection: { ...sample.detection, language: "C++" } };
    const text = buildTweetText(r as EstimateResult);
    expect(text).toContain("#C変換"); // ++ は除去される
  });
});

describe("buildTwitterIntent", () => {
  it("returns a twitter intent URL", () => {
    const url = buildTwitterIntent(sample, "https://example.com/share/abc");
    expect(url.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    expect(url).toContain("text=");
    expect(url).toContain("url=");
  });
});

describe("buildMarkdown", () => {
  it("includes a result table", () => {
    const md = buildMarkdown(sample);
    expect(md).toContain("# Legacy Code 変換見積もり結果");
    expect(md).toContain("| 検出言語 | COBOL");
    expect(md).toContain("1,500 行");
    expect(md).toContain("70.0%〜92.0%");
  });

  it("includes similar cases when present", () => {
    const md = buildMarkdown(sample);
    expect(md).toContain("## 類似する過去事例");
    expect(md).toContain("ACAS GL");
    expect(md).toContain("類似度 85%");
  });

  it("includes notes and caveats", () => {
    const md = buildMarkdown(sample);
    expect(md).toContain("## 観察事項");
    expect(md).toContain("- DIVISION 構造が標準的");
    expect(md).toContain("## 見積もりの限界");
    expect(md).toContain("- 業務ロジックは見ていない");
  });

  it("includes share URL when given", () => {
    const md = buildMarkdown(sample, "https://example.com/share/xyz");
    expect(md).toContain("共有 URL: https://example.com/share/xyz");
  });

  it("marks heuristic fallback in model used row", () => {
    const r = { ...sample, model_used: "heuristic-fallback", is_heuristic_fallback: true };
    const md = buildMarkdown(r);
    expect(md).toContain("（経験則ベース）");
  });
});

describe("buildCsv", () => {
  it("produces 2 lines (header + row)", () => {
    const csv = buildCsv(sample);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("header contains expected columns", () => {
    const csv = buildCsv(sample);
    const [header] = csv.split("\n");
    expect(header).toContain("言語");
    expect(header).toContain("行数");
    expect(header).toContain("難易度");
  });

  it("row matches the sample values", () => {
    const csv = buildCsv(sample);
    const [, row] = csv.split("\n");
    expect(row).toContain("COBOL");
    expect(row).toContain("1500");
    expect(row).toContain("70.0%");
    expect(row).toContain("acas_gl");
  });

  it("CSV-escapes values containing commas or quotes", () => {
    const r: EstimateResult = {
      ...sample,
      detection: { ...sample.detection, language: "Some, Lang" },
    };
    const csv = buildCsv(r);
    const [, row] = csv.split("\n");
    expect(row).toContain('"Some, Lang"');
  });
});
