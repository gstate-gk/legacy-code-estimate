"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "lce_theme_v1";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  if (theme === "dark") {
    html.classList.add("dark");
  } else if (theme === "light") {
    html.classList.add("light");
  }
  // "system" は何もつけない（CSS の media query が効く）
}

function loadTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
}

function saveTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = loadTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  }

  // ハイドレーション差分回避: マウント前はラベルを空に
  const label = !mounted ? "  " : theme === "system" ? "🖥  自動" : theme === "light" ? "☀ ライト" : "🌙 ダーク";
  const title = !mounted ? "" : `テーマ: ${theme === "system" ? "OS 設定追従" : theme === "light" ? "ライト固定" : "ダーク固定"}（クリックで切替）`;

  return (
    <button
      type="button"
      onClick={cycle}
      title={title}
      suppressHydrationWarning
      className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 backdrop-blur px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-colors"
    >
      {label}
    </button>
  );
}

/**
 * SSR ハイドレーション前に flash of wrong theme を避けるための、
 * <head> に挿入する script。layout.tsx で利用。
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'light') document.documentElement.classList.add('light');
  } catch(e) {}
})();
`;
