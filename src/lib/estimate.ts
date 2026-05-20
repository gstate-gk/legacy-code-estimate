// レガシーコード見積もりエンジン
// LLM: Gemini 2.5 Flash 専用（複数キーローテーション）
// Gemini 障害時はヒューリスティック・フォールバック
// 入力: 貼り付けられたコード文字列
// 出力: 言語判定 + 過去事例ベースの規模・難易度・削減率・工数見積もり

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  detectLanguage,
  countLines,
  countNonBlankLines,
  type LanguageDetectionResult,
} from "./languageDetector";
import { TtlLruCache, hashCode } from "./serverCache";
import fewshot from "../../data/fewshot_cases.json";

const GEMINI_MODEL = "gemini-2.5-flash";

// サーバーサイドキャッシュ: 1時間 TTL、最大100件
// 同じコードの再投入はクライアント側 sessionStorage が先にキャッチするが、
// 別ブラウザ・別ユーザーから同じコード（営業デモのサンプル等）が来た場合に
// この層が API 呼び出しを節約する
const serverCache = new TtlLruCache<EstimateResult>(100, 60 * 60 * 1000);

export interface EstimateRequest {
  code: string;
}

export interface SimilarCase {
  id: string;
  name: string;
  source_language: string;
  original_lines: number;
  converted_lines: number;
  reduction_rate: number;
  similarity_score: number;
  rationale: string;
  museum_url?: string | null;
  zenn_url?: string | null;
  article_url?: string | null;
  source_repo_url?: string | null;
}

export interface EstimateResult {
  detection: LanguageDetectionResult;
  lines_total: number;
  lines_non_blank: number;
  difficulty_stars: 1 | 2 | 3 | 4 | 5;
  reduction_range: { min: number; max: number };
  workdays_range: { min: number; max: number };
  similar_cases: SimilarCase[];
  notes: string[];
  caveats: string[];
  model_used: string;
  is_heuristic_fallback?: boolean;
}

interface ParsedLLMResponse {
  difficulty_stars: number;
  reduction_min: number;
  reduction_max: number;
  workdays_min: number;
  workdays_max: number;
  similar_cases: { id: string; similarity_score: number; rationale: string }[];
  notes: string[];
  caveats: string[];
}

// LLM に渡す最小限の Few-shot — Vercel 10秒 timeout 制約のため極限まで圧縮
function buildLeanFewshot() {
  return fewshot.cases.map((c) => ({
    id: c.id,
    lang: c.source.language,
    lines: c.source.original_lines,
    reduce: c.metrics.reduction_rate,
    star: c.metrics.difficulty_stars,
    days: [c.metrics.workdays_min, c.metrics.workdays_max],
    domain: c.domain,
  }));
}

function buildSystemPrompt(): string {
  return `レガシーコードを現代Webスタック(Python+React 等)に変換するエンジニアとして見積もる。

出力は純粋なJSONのみ（前後の説明や \`\`\` 禁止）：

{"difficulty_stars":1-5,"reduction_min":-0.2..1,"reduction_max":-0.2..1,"workdays_min":int,"workdays_max":int,"similar_cases":[{"id":"fewshot_id","similarity_score":0..1,"rationale":"1文"}],"notes":["短文"],"caveats":["短文"]}

基準:
- 難易度★1=現代対応物あり, 2=主流旧版, 3=整理レガシー(COBOL/Fortran), 4=特殊(PL/I/Ada/MUMPS/RPG), 5=極特殊(HLASM/VM)
- 削減率: 冗長(COBOL/VB6/PL/I)=70-95%, 整理コード=約60%, 数値計算=約20%, VM/言語処理系=削減なし(マイナス可)
- 工数(人日,AI伴走): <1k行=5-15, 1-10k=10-40, 10-100k=25-80, >100k=40+, ★4-5は1.5倍
- 類似度: 同言語同ドメイン=0.8+, 同ドメインのみ=0.5-0.7

Few-shot 11件:
${JSON.stringify(buildLeanFewshot())}

notes/caveats は各1-2項目、各1文。JSON のみ出力。`;
}

function buildUserPrompt(req: EstimateRequest, detection: LanguageDetectionResult, lines: number): string {
  const MAX_CODE_CHARS = 15000;
  const truncated = req.code.length > MAX_CODE_CHARS;
  const sample = truncated
    ? req.code.slice(0, MAX_CODE_CHARS) + "\n\n... (以降は省略、合計" + lines + "行)"
    : req.code;

  return `## 自動判定結果
- 言語: ${detection.language} (信頼度 ${(detection.confidence * 100).toFixed(0)}%)
- 検出パターン: ${detection.evidence.join(", ") || "（なし）"}
- 候補: ${detection.candidates.slice(0, 3).map((c) => `${c.language}(${c.score})`).join(", ")}
- 行数: ${lines} 行
${truncated ? "- ※ 上限文字数 (" + MAX_CODE_CHARS + " 文字) を超えるため抜粋済み" : ""}

## 評価対象コード

\`\`\`
${sample}
\`\`\`

このコードについて、上記Few-shot 11件の実績と照らし合わせて見積もり JSON を出力してください。`;
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  return keys;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<{ text: string } | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) { lastGeminiError = "GEMINI_API_KEY not set"; return null; }

  // Vercel 関数全体で15秒を使い切らないように予算を分配
  // 1個目: 8秒、残り時間に応じて2個目以降を試行
  const start = Date.now();
  const TOTAL_BUDGET_MS = 14_000;

  const errors: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const elapsed = Date.now() - start;
    const remaining = TOTAL_BUDGET_MS - elapsed;
    if (remaining < 3_000) {
      errors.push(`key${i + 1}: budget exhausted (${remaining}ms left)`);
      break;
    }
    const timeout = Math.min(8_000, remaining);

    try {
      const genAI = new GoogleGenerativeAI(keys[i]);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      });
      const result = await withTimeout(model.generateContent(userPrompt), timeout, `gemini key ${i + 1}`);
      const text = result.response.text();
      if (text && text.trim().length > 0) return { text };
      errors.push(`key${i + 1}: empty response`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`key${i + 1}: ${msg.slice(0, 100)}`);
      console.warn(`[gemini] key ${i + 1} failed (${timeout}ms): ${msg.slice(0, 120)}`);
    }
  }
  lastGeminiError = errors.join("; ").slice(0, 200);
  return null;
}

let lastGeminiError: string | null = null;

function extractJSON(text: string): string {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

export async function estimateCode(req: EstimateRequest): Promise<EstimateResult> {
  const detection = detectLanguage(req.code);
  const lines_total = countLines(req.code);
  const lines_non_blank = countNonBlankLines(req.code);

  if (lines_total < 5) {
    throw new Error("コードが短すぎます。少なくとも5行以上貼り付けてください。");
  }

  // サーバー側キャッシュチェック
  const cacheKey = hashCode(req.code);
  const cached = serverCache.get(cacheKey);
  if (cached) {
    console.log("[estimate] server cache hit:", cacheKey);
    return cached;
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req, detection, lines_total);

  // Gemini 2.5 Flash 専用。複数キーローテーションで無料枠を活用。
  const llmResult = await callGemini(systemPrompt, userPrompt);
  const model_used = GEMINI_MODEL;

  // Gemini 失敗時は Few-shot から言語マッチで近い事例を返す
  // ヒューリスティック・フォールバック
  if (!llmResult) {
    console.warn("[estimate] Gemini failed, returning heuristic fallback");
    return heuristicEstimate(detection, lines_total, lines_non_blank, {
      gemini: lastGeminiError,
    });
  }

  let parsed: ParsedLLMResponse;
  try {
    parsed = JSON.parse(extractJSON(llmResult.text));
  } catch {
    throw new Error("AI からの応答が JSON 形式ではありませんでした。再試行してください。");
  }

  const similar_cases: SimilarCase[] = (parsed.similar_cases || [])
    .map((sc): SimilarCase | null => {
      const found = fewshot.cases.find((c) => c.id === sc.id);
      if (!found) return null;
      const links = (found as { links?: { museum_url?: string | null; zenn_url?: string | null; article_url?: string | null; source_repo_url?: string | null } }).links;
      return {
        id: found.id,
        name: found.name,
        source_language: found.source.language,
        original_lines: found.source.original_lines,
        converted_lines: found.target.converted_lines,
        reduction_rate: found.metrics.reduction_rate,
        similarity_score: Math.max(0, Math.min(1, sc.similarity_score)),
        rationale: sc.rationale,
        museum_url: links?.museum_url ?? null,
        zenn_url: links?.zenn_url ?? null,
        article_url: links?.article_url ?? null,
        source_repo_url: links?.source_repo_url ?? null,
      };
    })
    .filter((x): x is SimilarCase => x !== null);

  const result: EstimateResult = {
    detection,
    lines_total,
    lines_non_blank,
    difficulty_stars: clampStar(parsed.difficulty_stars),
    reduction_range: {
      min: Math.max(-0.2, Math.min(1, parsed.reduction_min)),
      max: Math.max(-0.2, Math.min(1, parsed.reduction_max)),
    },
    workdays_range: {
      min: Math.max(1, Math.floor(parsed.workdays_min)),
      max: Math.max(1, Math.ceil(parsed.workdays_max)),
    },
    similar_cases,
    notes: parsed.notes || [],
    caveats: parsed.caveats || [],
    model_used,
  };

  // 成功時のみキャッシュ（ヒューリスティック・フォールバックは別のリターンパスで返している）
  serverCache.set(cacheKey, result);

  return result;
}

function clampStar(v: number): 1 | 2 | 3 | 4 | 5 {
  const r = Math.max(1, Math.min(5, Math.round(v)));
  return r as 1 | 2 | 3 | 4 | 5;
}

// Few-shot から言語マッチで近い事例を抽出する SimilarCase 化
function makeSimilarCase(id: string, similarity_score: number, rationale: string): SimilarCase | null {
  const found = fewshot.cases.find((c) => c.id === id);
  if (!found) return null;
  const links = (found as { links?: { museum_url?: string | null; zenn_url?: string | null; article_url?: string | null; source_repo_url?: string | null } }).links;
  return {
    id: found.id,
    name: found.name,
    source_language: found.source.language,
    original_lines: found.source.original_lines,
    converted_lines: found.target.converted_lines,
    reduction_rate: found.metrics.reduction_rate,
    similarity_score: Math.max(0, Math.min(1, similarity_score)),
    rationale,
    museum_url: links?.museum_url ?? null,
    zenn_url: links?.zenn_url ?? null,
    article_url: links?.article_url ?? null,
    source_repo_url: links?.source_repo_url ?? null,
  };
}

// AI 全滅時の代替: 言語判定 + 行数 + Few-shot 経験則だけで見積もる
function heuristicEstimate(
  detection: LanguageDetectionResult,
  lines_total: number,
  lines_non_blank: number,
  errors: { gemini?: string | null }
): EstimateResult {
  const lang = detection.language;

  // 言語別の標準値
  const profile: { stars: 1 | 2 | 3 | 4 | 5; reductionMin: number; reductionMax: number; preferredIds: string[] } = (() => {
    switch (lang) {
      case "COBOL":     return { stars: 3, reductionMin: 0.70, reductionMax: 0.93, preferredIds: ["acas_gl", "carddemo"] };
      case "PL/I":      return { stars: 4, reductionMin: 0.85, reductionMax: 0.92, preferredIds: ["habitat"] };
      case "Fortran":   return { stars: 3, reductionMin: 0.15, reductionMax: 0.40, preferredIds: ["saturn_mag"] };
      case "MUMPS":     return { stars: 5, reductionMin: 0.70, reductionMax: 0.85, preferredIds: ["vista_problemlist"] };
      case "RPG":       return { stars: 4, reductionMin: 0.55, reductionMax: 0.70, preferredIds: ["rpg_custmast"] };
      case "VB6":       return { stars: 2, reductionMin: 0.80, reductionMax: 0.92, preferredIds: ["vb6_pos"] };
      case "Ada":       return { stars: 4, reductionMin: 0.90, reductionMax: 0.98, preferredIds: ["whitakers_words"] };
      case "Java":      return { stars: 2, reductionMin: 0.30, reductionMax: 0.60, preferredIds: ["mako_vm"] };
      case "C":         return { stars: 3, reductionMin: 0.60, reductionMax: 0.98, preferredIds: ["hengband_web", "hengband_rust"] };
      case "C++":       return { stars: 3, reductionMin: 0.40, reductionMax: 0.75, preferredIds: ["hengband_rust"] };
      case "Pascal":    return { stars: 2, reductionMin: 0.50, reductionMax: 0.80, preferredIds: [] };
      case "BASIC":     return { stars: 2, reductionMin: 0.70, reductionMax: 0.90, preferredIds: ["vb6_pos"] };
      case "Assembler": return { stars: 5, reductionMin: 0.30, reductionMax: 0.70, preferredIds: ["carddemo"] };
      default:          return { stars: 3, reductionMin: 0.40, reductionMax: 0.80, preferredIds: [] };
    }
  })();

  // 行数 → 工数（人日）
  const baseDays = (() => {
    if (lines_total < 1000) return [5, 15];
    if (lines_total < 10000) return [10, 40];
    if (lines_total < 100000) return [25, 80];
    return [40, 120];
  })();
  const mul = profile.stars >= 4 ? 1.5 : profile.stars <= 2 ? 0.8 : 1;
  const workdays_min = Math.max(1, Math.round(baseDays[0] * mul));
  const workdays_max = Math.max(workdays_min + 1, Math.round(baseDays[1] * mul));

  const similar_cases = profile.preferredIds
    .map((id) => makeSimilarCase(id, 0.6, `言語マッチ (${lang}) による参照（AI による詳細マッチングは未実行）`))
    .filter((x): x is SimilarCase => x !== null);

  const caveats: string[] = [
    "Gemini API が応答しなかったため、言語判定と過去事例の経験則のみで見積もりました。精度は通常より低下します。",
    "数分後に再実行すると AI による詳細推論が利用できる可能性があります。",
  ];
  if (errors.gemini) caveats.push(`Gemini エラー: ${errors.gemini.slice(0, 100)}`);

  return {
    detection,
    lines_total,
    lines_non_blank,
    difficulty_stars: profile.stars,
    reduction_range: { min: profile.reductionMin, max: profile.reductionMax },
    workdays_range: { min: workdays_min, max: workdays_max },
    similar_cases,
    notes: [
      `${lang} の標準的な変換プロファイルを適用しました。`,
      `元コード ${lines_total.toLocaleString()} 行、難易度 ★${profile.stars} の経験則ベース。`,
    ],
    caveats,
    model_used: "heuristic-fallback",
    is_heuristic_fallback: true,
  };
}
