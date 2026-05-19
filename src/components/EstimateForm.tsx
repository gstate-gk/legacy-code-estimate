"use client";

import { useState } from "react";
import type { EstimateResult } from "@/lib/estimate";

export default function EstimateForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "見積もりに失敗しました。");
      } else {
        setResult(data as EstimateResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラー");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">
          評価したいコード（10万行・20万文字までの範囲で）
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ここに COBOL / PL/I / Fortran / MUMPS / RPG / VB6 / Ada / Java 等のコードを貼り付け..."
          className="w-full h-64 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          spellCheck={false}
          required
          minLength={20}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || code.length < 20}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "見積もり中..." : "見積もる"}
          </button>
          <span className="text-xs text-zinc-500">
            {code.length} 文字 / {code.split(/\r?\n/).length} 行
          </span>
        </div>
      </form>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: EstimateResult }) {
  const stars = "★".repeat(result.difficulty_stars) + "☆".repeat(5 - result.difficulty_stars);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="検出言語" >
          <div className="text-2xl font-bold">{result.detection.language}</div>
          <div className="text-xs text-zinc-500 mt-1">
            信頼度 {(result.detection.confidence * 100).toFixed(0)}%
            {result.detection.evidence.length > 0 && (
              <> ・ 検出: {result.detection.evidence.slice(0, 3).join(", ")}</>
            )}
          </div>
        </Card>
        <Card title="規模">
          <div className="text-2xl font-bold">{result.lines_total.toLocaleString()} 行</div>
          <div className="text-xs text-zinc-500 mt-1">
            非空白行: {result.lines_non_blank.toLocaleString()} 行
          </div>
        </Card>
        <Card title="変換難易度">
          <div className="text-2xl font-bold tracking-widest text-amber-500">{stars}</div>
          <div className="text-xs text-zinc-500 mt-1">
            ({result.difficulty_stars} / 5)
          </div>
        </Card>
        <Card title="推定工数（AI伴走前提）">
          <div className="text-2xl font-bold">
            {result.workdays_range.min}〜{result.workdays_range.max} 人日
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Claude Code 等の AI ペアプロを使用する想定
          </div>
        </Card>
        <Card title="予想削減率レンジ" className="md:col-span-2">
          <div className="text-2xl font-bold">
            {pct(result.reduction_range.min)} 〜 {pct(result.reduction_range.max)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            負の値（増加）になる場合あり: VM/言語処理系/アルゴリズム本体は削減しない
          </div>
        </Card>
      </div>

      {result.similar_cases.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">類似する過去事例</h3>
          <div className="space-y-3">
            {result.similar_cases.map((sc) => (
              <div
                key={sc.id}
                className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
              >
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="font-semibold">{sc.name}</div>
                  <div className="text-xs text-zinc-500">
                    類似度 {(sc.similarity_score * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {sc.source_language} ・ {sc.original_lines.toLocaleString()} 行 → {sc.converted_lines.toLocaleString()} 行
                  ・ 削減率 {pct(sc.reduction_rate)}
                </div>
                <p className="mt-2 text-sm">{sc.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">観察事項</h3>
          <ul className="list-disc list-inside text-sm space-y-1 text-zinc-700 dark:text-zinc-300">
            {result.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {result.caveats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-amber-700 dark:text-amber-500">見積もりの限界</h3>
          <ul className="list-disc list-inside text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
            {result.caveats.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${className ?? ""}`}>
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
