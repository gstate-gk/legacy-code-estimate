// 見積もりヒストリー
// localStorage に過去 N 件のサマリ + 共有 token を保存
// クリックすると共有 URL を新タブで開ける（既存のデコード機構を再利用）

import type { EstimateResult } from "./estimate";
import { encodeShare } from "./sharePermalink";

const HISTORY_KEY = "lce_estimate_history_v1";
const MAX_ITEMS = 10;

export interface HistoryItem {
  ts: number;
  token: string;
  language: string;
  lines: number;
  difficulty_stars: number;
  reduction_min: number;
  reduction_max: number;
  model_used: string;
  is_heuristic_fallback: boolean;
  preview: string; // 元コードの先頭 80 文字
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x.token === "string");
  } catch {
    return [];
  }
}

export function pushHistory(result: EstimateResult, code: string) {
  if (typeof window === "undefined") return;
  const preview = code.replace(/\s+/g, " ").trim().slice(0, 80);
  const token = encodeShare(result, preview);

  const item: HistoryItem = {
    ts: Date.now(),
    token,
    language: result.detection.language,
    lines: result.lines_total,
    difficulty_stars: result.difficulty_stars,
    reduction_min: result.reduction_range.min,
    reduction_max: result.reduction_range.max,
    model_used: result.model_used,
    is_heuristic_fallback: !!result.is_heuristic_fallback,
    preview,
  };

  const list = loadHistory();
  // 同一 token は重複排除（先頭に昇格）
  const filtered = list.filter((x) => x.token !== item.token);
  filtered.unshift(item);
  const trimmed = filtered.slice(0, MAX_ITEMS);

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // QuotaExceeded など
  }
}

export function removeHistoryItem(token: string) {
  if (typeof window === "undefined") return;
  const list = loadHistory().filter((x) => x.token !== token);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}
