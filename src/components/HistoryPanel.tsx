"use client";

import { useEffect, useState } from "react";
import { loadHistory, removeHistoryItem, clearHistory, type HistoryItem } from "@/lib/estimateHistory";

interface HistoryPanelProps {
  refreshSignal: number; // 親の見積もり成功時にインクリメントすると再読込
}

export default function HistoryPanel({ refreshSignal }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(loadHistory());
  }, [refreshSignal]);

  if (!mounted) return null;
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold">📜 最近の見積もり</h2>
        <button
          type="button"
          onClick={() => { clearHistory(); setItems([]); }}
          className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
        >
          すべてクリア
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => (
          <HistoryCard
            key={item.token}
            item={item}
            onRemove={() => {
              removeHistoryItem(item.token);
              setItems((prev) => prev.filter((x) => x.token !== item.token));
            }}
          />
        ))}
      </div>
    </section>
  );
}

function HistoryCard({ item, onRemove }: { item: HistoryItem; onRemove: () => void }) {
  const url = `?r=${item.token}`;
  const elapsed = formatRelativeTime(item.ts);
  const reduction = `${(item.reduction_min * 100).toFixed(0)}〜${(item.reduction_max * 100).toFixed(0)}%`;
  return (
    <div className="group relative rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs hover:border-blue-400 dark:hover:border-blue-700 transition-colors">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-[14px] leading-none px-1"
        aria-label="削除"
      >
        ×
      </button>
      <a href={url} className="block pr-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {item.language}
            <span className="ml-1.5 text-[10px] font-normal text-zinc-500">{item.lines.toLocaleString()}行</span>
          </span>
          <span className="text-amber-500 tracking-tight">{"★".repeat(item.difficulty_stars)}</span>
        </div>
        {item.preview && (
          <div className="mt-1 text-[11px] text-zinc-500 truncate font-mono">{item.preview}</div>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-zinc-600 dark:text-zinc-400">削減 {reduction}</span>
          <span className="text-zinc-400">{elapsed}</span>
        </div>
      </a>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  return new Date(ts).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
