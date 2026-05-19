// レガシーコード見積もりエンジン
// LLM: Gemini 2.5 Flash 優先 / Claude Haiku フォールバック
// 入力: 貼り付けられたコード文字列
// 出力: 言語判定 + 過去事例ベースの規模・難易度・削減率・工数見積もり

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import {
  detectLanguage,
  countLines,
  countNonBlankLines,
  type LanguageDetectionResult,
} from "./languageDetector";
import fewshot from "../../data/fewshot_cases.json";

const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_FALLBACK_MODEL = "claude-haiku-4-5-20251001";

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
  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i++) {
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
      const result = await withTimeout(model.generateContent(userPrompt), 5_000, `gemini key ${i + 1}`);
      const text = result.response.text();
      if (text && text.trim().length > 0) return { text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("timeout") || msg.includes("429") || msg.includes("500") || msg.toLowerCase().includes("quota")) {
        console.warn(`[gemini] key ${i + 1} skipped: ${msg.slice(0, 80)}`);
        continue;
      }
      console.error(`[gemini] key ${i + 1} error:`, msg);
    }
  }
  return null;
}

async function callClaudeFallback(systemPrompt: string, userPrompt: string): Promise<{ text: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await withTimeout(
      client.messages.create({
        model: CLAUDE_FALLBACK_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      8_500,
      "claude"
    );
    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();
    return { text };
  } catch (e) {
    console.error("[claude-fallback] error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

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

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req, detection, lines_total);

  // Vercel Hobby プランの 10秒制限内で確実に応答するため、Claude を優先。
  // Phase 1 検証では Claude Haiku が 5-8秒で安定。Gemini は無料枠で予測不能。
  let llmResult = await callClaudeFallback(systemPrompt, userPrompt);
  let model_used = CLAUDE_FALLBACK_MODEL;

  if (!llmResult) {
    console.warn("[estimate] Claude failed, trying Gemini fallback");
    llmResult = await callGemini(systemPrompt, userPrompt);
    model_used = GEMINI_MODEL;
  }

  if (!llmResult) {
    throw new Error("AI 呼び出しに失敗しました。GEMINI_API_KEY / ANTHROPIC_API_KEY のいずれも未設定か、すべてレート制限中です。");
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

  return {
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
}

function clampStar(v: number): 1 | 2 | 3 | 4 | 5 {
  const r = Math.max(1, Math.min(5, Math.round(v)));
  return r as 1 | 2 | 3 | 4 | 5;
}
