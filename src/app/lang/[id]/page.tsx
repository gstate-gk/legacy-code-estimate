import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LANGUAGE_GUIDES, type LanguageGuide } from "@/lib/languageGuide";
import fewshot from "../../../../data/fewshot_cases.json";

const SITE_URL = "https://legacy-code-estimate.vercel.app";

// 各 LANGUAGE_GUIDES の key と URL slug の対応
const LANG_ID_TO_KEY: Record<string, string> = {
  cobol: "COBOL",
  pli: "PL/I",
  fortran: "Fortran",
  mumps: "MUMPS",
  rpg: "RPG",
  vb6: "VB6",
  ada: "Ada",
  java: "Java",
  c: "C",
  cpp: "C++",
  pascal: "Pascal",
  basic: "BASIC",
  assembler: "Assembler",
};

// ビルド時にすべての言語ページを事前生成
export function generateStaticParams() {
  return Object.keys(LANG_ID_TO_KEY).map((id) => ({ id }));
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const key = LANG_ID_TO_KEY[id];
  const guide = key ? LANGUAGE_GUIDES[key] : undefined;
  if (!guide) return { title: "未対応の言語" };

  const title = `${guide.language} レガシーコードの変換見積もり`;
  const description = `${guide.fullName} のコードを貼り付けて、AI が削減率・難易度・工数を見積もります。想定削減率 ${guide.typicalReduction}。`;
  const ogImageUrl = `${SITE_URL}/api/og`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/lang/${id}`,
      siteName: "Legacy Code 変換見積もり",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      locale: "ja_JP",
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
    alternates: { canonical: `${SITE_URL}/lang/${id}` },
  };
}

export default async function LangPage({ params }: { params: Params }) {
  const { id } = await params;
  const key = LANG_ID_TO_KEY[id];
  const guide: LanguageGuide | undefined = key ? LANGUAGE_GUIDES[key] : undefined;
  if (!guide) notFound();

  // Few-shot から関連事例を抽出
  type FewshotCase = {
    id: string;
    name: string;
    source: { language: string; original_lines: number };
    target: { converted_lines: number };
    metrics: { reduction_rate: number; difficulty_stars: number; workdays_min: number; workdays_max: number };
    domain: string;
    notable_features: string;
    links?: { article_url?: string | null; museum_url?: string | null; source_repo_url?: string | null };
  };
  const matchingCases = (fewshot.cases as FewshotCase[]).filter((c) =>
    c.source.language.toLowerCase().includes(guide.language.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-blue-950/20">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <nav className="text-xs text-zinc-500 mb-4">
            <Link href="/" className="hover:underline">トップ</Link>
            <span className="mx-1">/</span>
            <span>{guide.language}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {guide.language} レガシーコードの変換見積もり
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400 max-w-3xl">
            {guide.fullName} のコードを貼り付けると、AI が <span className="font-semibold">規模・難易度・予想削減率・推定工数</span> を返します。
          </p>
          <div className="mt-6">
            <Link
              href={`/?lang=${id}#paste`}
              className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
            >
              今すぐ {guide.language} コードで見積もる →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat label="想定削減率" value={guide.typicalReduction} accent="emerald" />
          <Stat label="時代" value={guide.era} />
          <Stat label="関連実績" value={`${matchingCases.length} 件`} sub="Few-shot 内" />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{guide.language} とは</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{guide.origin}</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"><strong>パラダイム:</strong> {guide.paradigm}</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"><strong>なぜ今もレガシーか:</strong> {guide.whyLegacy}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">変換アプローチ</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{guide.conversionStrategy}</p>
        </section>

        {matchingCases.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{guide.language} 関連の過去実績</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchingCases.map((c) => (
                <div
                  key={c.id}
                  className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm"
                >
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</h3>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {c.source.original_lines.toLocaleString()} 行 → {c.target.converted_lines.toLocaleString()} 行
                    （削減 {(c.metrics.reduction_rate * 100).toFixed(1)}%）
                  </p>
                  <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">{c.notable_features}</p>
                  {c.links?.article_url && (
                    <a
                      href={c.links.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      変換ノート →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {guide.links.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">参考リンク</h2>
            <ul className="text-sm space-y-1">
              {guide.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {l.label} →
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 px-5 py-4">
          <h2 className="text-base font-semibold text-blue-900 dark:text-blue-200">
            {guide.language} コードの見積もりを試す
          </h2>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            実際のコードを貼り付けて、過去 {matchingCases.length || "0"} 件の {guide.language} 実績と照合した見積もりが得られます。
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
          >
            トップへ戻って見積もる →
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
          見積もりは過去事例ベースの参考値です。実際の工数は元コードの品質・依存関係・要件で変動します。
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "emerald" }) {
  const valColor = accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg md:text-xl font-bold ${valColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}
