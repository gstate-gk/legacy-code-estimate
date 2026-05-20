"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { EstimateResult } from "@/lib/estimate";
import { encodeShare, decodeShare } from "@/lib/sharePermalink";
import { SAMPLES } from "@/lib/sampleCode";
import { buildTwitterIntent, buildMarkdown, buildCsv } from "@/lib/shareText";

type InputMode = "paste" | "file" | "github";

const MAX_FILE_BYTES = 200_000;

export default function EstimateForm() {
  const [mode, setMode] = useState<InputMode>("paste");
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL の ?r= パラメータがあれば見積もり結果として復元
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("r");
    if (token) {
      const decoded = decodeShare(token);
      if (decoded) {
        setResult(decoded.result);
        if (decoded.preview) setCode(decoded.preview);
        setRestoredFromUrl(true);
      } else {
        setError("共有 URL の内容を復号できませんでした（壊れているか、古いバージョン）。");
      }
    }
  }, []);

  function buildShareUrl(): string {
    if (!result) return "";
    const token = encodeShare(result, code.slice(0, 200));
    return `${window.location.origin}${window.location.pathname}?r=${token}`;
  }

  function copyShareUrl() {
    if (!result) return;
    const shareUrl = buildShareUrl();
    navigator.clipboard.writeText(shareUrl).then(
      () => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2500); },
      () => { setError("URL のコピーに失敗しました。"); }
    );
  }

  function openTwitterIntent() {
    if (!result) return;
    const url = buildTwitterIntent(result, buildShareUrl());
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyMarkdown() {
    if (!result) return;
    const md = buildMarkdown(result, buildShareUrl());
    navigator.clipboard.writeText(md).then(
      () => { setMarkdownCopied(true); setTimeout(() => setMarkdownCopied(false), 2500); },
      () => { setError("Markdown のコピーに失敗しました。"); }
    );
  }

  function copyCsv() {
    if (!result) return;
    const csv = buildCsv(result);
    navigator.clipboard.writeText(csv).then(
      () => { setCsvCopied(true); setTimeout(() => setCsvCopied(false), 2500); },
      () => { setError("CSV のコピーに失敗しました。"); }
    );
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(`ファイルが大きすぎます (${file.size.toLocaleString()} B)。${MAX_FILE_BYTES.toLocaleString()} B 以内にしてください。`);
      return;
    }
    try {
      const text = await file.text();
      setCode(text);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ファイル読み込みエラー");
    }
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      let payload: { code: string };

      if (mode === "github") {
        if (!githubUrl) throw new Error("GitHub URL を入力してください。");
        const r = await fetch("/api/fetch-github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: githubUrl }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "GitHub からの取得に失敗しました。");
        payload = { code: d.code };
        setCode(d.code);
        setFileName(d.source_label || githubUrl);
      } else {
        payload = { code };
      }

      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const canSubmit =
    !loading &&
    ((mode === "github" && githubUrl.trim().length > 10) ||
      ((mode === "paste" || mode === "file") && code.length >= 20));

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={mode === "paste"} onClick={() => setMode("paste")}>
          貼り付け
        </TabButton>
        <TabButton active={mode === "file"} onClick={() => setMode("file")}>
          ファイル
        </TabButton>
        <TabButton active={mode === "github"} onClick={() => setMode("github")}>
          GitHub URL
        </TabButton>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "paste" && (
          <>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <label className="block text-sm font-medium">
                評価したいコード（20万文字以内）
              </label>
              <div className="text-xs text-zinc-500">
                サンプル読込:
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setCode(s.code);
                      setFileName(null);
                      setResult(null);
                      setError(null);
                    }}
                    className="ml-1.5 underline decoration-dotted hover:text-blue-700 dark:hover:text-blue-400"
                    title={`${s.language} の代表サンプルを貼る`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setFileName(null); }}
              placeholder="ここに COBOL / PL/I / Fortran / MUMPS / RPG / VB6 / Ada / Java 等のコードを貼り付け...&#10;&#10;上の「サンプル読込」のボタンから代表例を1クリックで挿入できます。"
              className="w-full h-64 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
              minLength={20}
            />
          </>
        )}

        {mode === "file" && (
          <>
            <label className="block text-sm font-medium">
              コードファイルをアップロード（20万バイト以内）
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center h-48 rounded border-2 border-dashed cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-400"
              }`}
            >
              <div className="text-sm font-medium">
                {fileName ? `📄 ${fileName}` : "ファイルをドロップ or クリックして選択"}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                .cob / .cbl / .pli / .for / .f / .f90 / .mumps / .m / .rpg / .frm / .ada / .adb / .ads / .java / .c / .h など
              </div>
              {code.length > 0 && fileName && (
                <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-500">
                  読み込み済み: {code.length.toLocaleString()} 文字 / {code.split(/\r?\n/).length.toLocaleString()} 行
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={onPickFile}
              accept=".cob,.cbl,.cobol,.pli,.pl1,.for,.f,.f77,.f90,.f95,.mumps,.m,.rpg,.rpgle,.sqlrpgle,.frm,.cls,.bas,.vb,.ada,.adb,.ads,.java,.c,.h,.cpp,.hpp,.cs,.pas,.txt"
              className="hidden"
            />
          </>
        )}

        {mode === "github" && (
          <>
            <label className="block text-sm font-medium">
              GitHub 上のファイル URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/blob/branch/path/to/file.cob"
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500">
              公開リポジトリの単一ファイル（または raw URL）に対応。ファイル単位で評価します。
            </p>
            {code.length > 0 && fileName && (
              <p className="text-xs text-emerald-700 dark:text-emerald-500">
                取得済み: {fileName} ({code.length.toLocaleString()} 文字)
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "見積もり中..." : "見積もる"}
          </button>
          {(mode === "paste" || mode === "file") && code.length > 0 && (
            <span className="text-xs text-zinc-500">
              {code.length.toLocaleString()} 文字 / {code.split(/\r?\n/).length.toLocaleString()} 行
            </span>
          )}
          {(mode === "paste" || mode === "file") && code.length > 0 && (
            <button
              type="button"
              onClick={() => { setCode(""); setFileName(null); setResult(null); setError(null); }}
              className="text-xs text-zinc-500 hover:text-zinc-700 underline"
            >
              クリア
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <>
          {restoredFromUrl && (
            <div className="rounded border border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
              共有 URL から見積もり結果を復元しました。新しいコードで再評価することもできます。
            </div>
          )}
          {result.is_heuristic_fallback && (
            <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              ⚠️ AI 推論サービスが応答しなかったため、言語判定と過去事例の経験則のみで見積もりました。数分後に再実行で詳細推論が得られる可能性があります。
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">見積もり結果</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyShareUrl}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {shareCopied ? "✓ URL コピー済" : "🔗 共有 URL"}
              </button>
              <button
                type="button"
                onClick={openTwitterIntent}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                𝕏 シェア
              </button>
              <button
                type="button"
                onClick={copyMarkdown}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {markdownCopied ? "✓ MD コピー済" : "📝 Markdown"}
              </button>
              <button
                type="button"
                onClick={copyCsv}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {csvCopied ? "✓ CSV コピー済" : "📊 CSV"}
              </button>
            </div>
          </div>
          <ResultPanel result={result} />
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-700 dark:text-blue-400"
          : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
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
                {(sc.museum_url || sc.zenn_url || sc.article_url || sc.source_repo_url) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {sc.zenn_url && (
                      <a
                        href={sc.zenn_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        変換ノート（Zenn） →
                      </a>
                    )}
                    {sc.article_url && !sc.zenn_url && (
                      <a
                        href={sc.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        変換ノート（GitHub） →
                      </a>
                    )}
                    {sc.museum_url && (
                      <a
                        href={sc.museum_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Museum で見る →
                      </a>
                    )}
                    {sc.source_repo_url && (
                      <a
                        href={sc.source_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 dark:text-zinc-400 hover:underline"
                      >
                        元コード →
                      </a>
                    )}
                  </div>
                )}
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

      <div className="text-xs text-zinc-400 text-right">
        モデル: {result.model_used}
      </div>
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
