"use client";

import { useEffect, useState } from "react";
import { getGuide, type LanguageGuide } from "@/lib/languageGuide";

interface Props {
  language: string;
}

export default function LanguageGuideButton({ language }: Props) {
  const [open, setOpen] = useState(false);
  const guide = getGuide(language);
  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1.5 inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline decoration-dotted underline-offset-2"
        title={`${language} について解説を見る`}
      >
        とは?
      </button>
      {open && <Modal guide={guide} onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({ guide, onClose }: { guide: LanguageGuide; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 flex items-baseline justify-between gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold">{guide.fullName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{guide.era}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none px-2"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="px-5 py-4 space-y-4 text-sm">
          <Section label="経緯" body={guide.origin} />
          <Section label="パラダイム" body={guide.paradigm} />
          <Section label="なぜ今もレガシーとして残るか" body={guide.whyLegacy} />
          <Section label="変換アプローチ" body={guide.conversionStrategy} />
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">想定削減率</h3>
            <p className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
              {guide.typicalReduction}
            </p>
          </div>
          {guide.notableCase && (
            <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2">
              <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">関連実績</span>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                Few-shot 内の事例: <code>{guide.notableCase}</code> （結果の「類似する過去事例」に出てくれば実物が見られます）
              </p>
            </div>
          )}
          {guide.links.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">参考リンク</h3>
              <ul className="space-y-1">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">{label}</h3>
      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}
