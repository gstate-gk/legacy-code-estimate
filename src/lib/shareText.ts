// 見積もり結果の各種テキスト形式エクスポート
// - Twitter シェア用の短文
// - Markdown 形式
// - CSV 形式（1行サマリ）

import type { EstimateResult } from "./estimate";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Twitter / X シェア用の短文（120字程度、URL は含めない） */
export function buildTweetText(result: EstimateResult): string {
  const lang = result.detection.language;
  const lines = result.lines_total.toLocaleString();
  const star = stars(result.difficulty_stars);
  const r = `${pct(result.reduction_range.min)}〜${pct(result.reduction_range.max)}`;
  const d = `${result.workdays_range.min}〜${result.workdays_range.max}人日`;
  return [
    `Legacy Code 見積もり結果`,
    `言語: ${lang} / ${lines}行`,
    `難易度: ${star}`,
    `予想削減率: ${r}`,
    `推定工数: ${d}`,
    ``,
    `#LegacyCode #${lang.replace(/[^A-Za-z0-9]/g, "")}変換`,
  ].join("\n");
}

/** Twitter Web Intent URL を生成 */
export function buildTwitterIntent(result: EstimateResult, shareUrl: string): string {
  const text = buildTweetText(result);
  const params = new URLSearchParams({
    text,
    url: shareUrl,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Markdown 形式（議事録・メモに貼れる） */
export function buildMarkdown(result: EstimateResult, shareUrl?: string): string {
  const lang = result.detection.language;
  const lines = result.lines_total.toLocaleString();
  const r = `${pct(result.reduction_range.min)}〜${pct(result.reduction_range.max)}`;
  const d = `${result.workdays_range.min}〜${result.workdays_range.max}人日`;

  const lines_arr: string[] = [
    `# Legacy Code 変換見積もり結果`,
    ``,
    `| 項目 | 値 |`,
    `|---|---|`,
    `| 検出言語 | ${lang}（信頼度 ${(result.detection.confidence * 100).toFixed(0)}%） |`,
    `| 規模 | ${lines} 行（非空白 ${result.lines_non_blank.toLocaleString()} 行） |`,
    `| 変換難易度 | ${stars(result.difficulty_stars)}（${result.difficulty_stars} / 5） |`,
    `| 予想削減率 | ${r} |`,
    `| 推定工数 | ${d}（AI 伴走前提） |`,
    `| 使用モデル | ${result.model_used}${result.is_heuristic_fallback ? "（経験則ベース）" : ""} |`,
    ``,
  ];

  if (result.similar_cases.length > 0) {
    lines_arr.push(`## 類似する過去事例`, ``);
    for (const sc of result.similar_cases) {
      lines_arr.push(
        `- **${sc.name}** — 類似度 ${(sc.similarity_score * 100).toFixed(0)}%`,
        `  - ${sc.source_language} / ${sc.original_lines.toLocaleString()} 行 → ${sc.converted_lines.toLocaleString()} 行（削減 ${pct(sc.reduction_rate)}）`,
        `  - ${sc.rationale}`,
      );
    }
    lines_arr.push(``);
  }

  if (result.notes.length > 0) {
    lines_arr.push(`## 観察事項`, ``);
    for (const n of result.notes) lines_arr.push(`- ${n}`);
    lines_arr.push(``);
  }

  if (result.caveats.length > 0) {
    lines_arr.push(`## 見積もりの限界`, ``);
    for (const c of result.caveats) lines_arr.push(`- ${c}`);
    lines_arr.push(``);
  }

  if (shareUrl) {
    lines_arr.push(``, `共有 URL: ${shareUrl}`, ``);
  }

  lines_arr.push(`*生成元: https://legacy-code-estimate.vercel.app*`);
  return lines_arr.join("\n");
}

/** CSV 形式（1行サマリ、スプレッドシート貼り付け用） */
export function buildCsv(result: EstimateResult): string {
  const header = [
    "言語",
    "信頼度",
    "行数",
    "非空白行",
    "難易度",
    "削減率_最小",
    "削減率_最大",
    "工数_最小_人日",
    "工数_最大_人日",
    "類似事例ID",
    "モデル",
  ];
  const top = result.similar_cases[0]?.id ?? "";
  const row = [
    result.detection.language,
    (result.detection.confidence * 100).toFixed(0) + "%",
    result.lines_total,
    result.lines_non_blank,
    result.difficulty_stars,
    pct(result.reduction_range.min),
    pct(result.reduction_range.max),
    result.workdays_range.min,
    result.workdays_range.max,
    top,
    result.model_used,
  ];
  // CSV エスケープ（カンマ・改行・ダブルクォート対応）
  const esc = (v: string | number) => {
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.map(esc).join(","), row.map(esc).join(",")].join("\n");
}
