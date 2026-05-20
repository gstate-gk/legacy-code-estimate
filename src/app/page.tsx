import type { Metadata } from "next";
import EstimateForm from "@/components/EstimateForm";
import TrackRecord from "@/components/TrackRecord";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const SITE_URL = "https://legacy-code-estimate.vercel.app";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const token = typeof sp.r === "string" ? sp.r : undefined;

  const ogImageUrl = token
    ? `${SITE_URL}/api/og?r=${encodeURIComponent(token)}`
    : `${SITE_URL}/api/og`;

  const title = "Legacy Code 変換見積もり";
  const description =
    "レガシーコードを貼り付けると AI が削減率・難易度・工数を返す Web ツール。11件の実変換実績を Few-shot 参照データとして使用。";

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url: token ? `${SITE_URL}/?r=${encodeURIComponent(token)}` : SITE_URL,
      siteName: "Legacy Code 変換見積もり",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <header className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/10">
        {/* 装飾的な背景パターン */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl px-6 py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-800">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            11件の変換実績を Few-shot 参照データとして稼働中
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Legacy Code 変換見積もり
          </h1>
          <p className="mt-3 text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl">
            レガシーコードを貼り付けると、AI が <span className="font-semibold text-zinc-900 dark:text-zinc-100">規模・難易度・予想削減率・推定工数・類似実績</span> を返します。COBOL / PL/I / Fortran / MUMPS / RPG / VB6 / Ada / Java / C / C++ / Pascal / BASIC に対応。
          </p>
          {/* 統計ストリップ */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <Stat label="実変換実績" value="11件" sub="Issue #40 シリーズ" />
            <Stat label="削減率レンジ" value="-5.7%〜98.7%" sub="VM コアから業務系まで" />
            <Stat label="対応言語" value="13言語" sub="ルールベース判定" />
            <Stat label="入力" value="保存しない" sub="ローカル処理優先" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
        <EstimateForm />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <TrackRecord />
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
          見積もりは過去事例ベースの参考値です。実際の工数は元コードの品質・依存関係・要件で変動します。
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-lg md:text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>
    </div>
  );
}
