import EstimateForm from "@/components/EstimateForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Legacy Code 変換見積もり
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            レガシーコードを貼り付けると、AI が <span className="font-semibold">規模・難易度・予想削減率・推定工数・類似実績</span> を返します。
            G.state チームが完了した <span className="font-semibold">11件の実変換実績</span> を Few-shot 参照データとして使用。
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            COBOL / PL/I / Fortran / MUMPS / RPG / VB6 / Ada / Java / C / C++ / Pascal / BASIC を判定対象としています。
            <span className="ml-2 text-emerald-700 dark:text-emerald-500">入力は保存しません。</span>
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <EstimateForm />
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
          見積もりは過去事例ベースの参考値です。実際の工数は元コードの品質・依存関係・要件で変動します。
        </div>
      </footer>
    </div>
  );
}
