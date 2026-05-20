// 過去の変換実績ショーケース
// fewshot_cases.json の11件を「実績一覧」として表示

import fewshot from "../../data/fewshot_cases.json";

interface Case {
  id: string;
  name: string;
  source: { language: string; original_lines: number };
  target: { converted_lines: number };
  metrics: { reduction_rate: number; difficulty_stars: number };
  domain: string;
  category: string;
  notable_features: string;
}

const pct = (n: number) => `${(n * 100).toFixed(n < 0 ? 1 : 0)}%`;
const fmt = (n: number) => n.toLocaleString();

export default function TrackRecord() {
  const cases = (fewshot.cases as Case[]).slice().sort((a, b) => b.metrics.reduction_rate - a.metrics.reduction_rate);
  const minRate = Math.min(...cases.map((c) => c.metrics.reduction_rate));
  const maxRate = Math.max(...cases.map((c) => c.metrics.reduction_rate));

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          🏛 過去 11 件の変換実績
        </h2>
        <p className="text-xs text-zinc-500">
          この見積もりエンジンの Few-shot 参照データ。削減率 <strong>{pct(minRate)}</strong>（VM コアは増加）から <strong>{pct(maxRate)}</strong> までをカバー。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cases.map((c) => (
          <div
            key={c.id}
            className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{shortName(c.name)}</span>
              <ReductionBadge rate={c.metrics.reduction_rate} />
            </div>
            <div className="mt-1.5 text-zinc-500 text-[11px]">
              {c.source.language} ・ {c.domain}
            </div>
            <div className="mt-2 flex items-baseline gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="font-mono">{fmt(c.source.original_lines)}行</span>
              <span className="text-zinc-400">→</span>
              <span className="font-mono">{fmt(c.target.converted_lines)}行</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-amber-500 tracking-widest">{"★".repeat(c.metrics.difficulty_stars)}{"☆".repeat(5 - c.metrics.difficulty_stars)}</span>
              <span className="text-zinc-400">{c.category}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        各案件の元コードは <a href="https://gstate-gk.github.io/legacy-code-museum/" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:underline">変換実例 Museum</a> から辿れます。見積もり時には AI がこの11件と照合し、似た事例を「類似する過去事例」として返します。
      </p>
    </section>
  );
}

function shortName(full: string): string {
  // "ACAS GL (Applewood Computers ...)" のような長い名前を短く
  const paren = full.indexOf("(");
  if (paren > 0) return full.slice(0, paren).trim();
  return full;
}

function ReductionBadge({ rate }: { rate: number }) {
  if (rate < 0) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        VMコア -{Math.abs(rate * 100).toFixed(1)}%
      </span>
    );
  }
  const intensity =
    rate >= 0.9 ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
  : rate >= 0.7 ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
  : rate >= 0.4 ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
  :               "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${intensity}`}>
      {pct(rate)}
    </span>
  );
}
