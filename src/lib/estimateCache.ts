// 見積もり結果のクライアントサイドキャッシュ
// sessionStorage に { codeHash → EstimateResult } を保存し、
// 同じコードの再送信時は API 呼び出しを省略する。
//
// セッション内のみ保持（タブを閉じたら消える）。
// ローカルストレージにしないのは、結果が時間で変化する可能性を考慮した安全側設計。

import type { EstimateResult } from "./estimate";

const CACHE_KEY = "lce_estimate_cache_v1";
const MAX_ENTRIES = 20;

// FNV-1a 32bit ハッシュ — 暗号強度は不要、衝突回避のみが目的
export function hashCode(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

interface CacheEntry {
  result: EstimateResult;
  cached_at: number;
}

function loadCache(): Map<string, CacheEntry> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  // FIFO で MAX_ENTRIES 件まで
  if (cache.size > MAX_ENTRIES) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].cached_at - b[1].cached_at);
    while (entries.length > MAX_ENTRIES) entries.shift();
    cache = new Map(entries);
  }
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    // QuotaExceeded など。無視
  }
}

export function getCachedEstimate(code: string): EstimateResult | null {
  const key = hashCode(code);
  const cache = loadCache();
  const entry = cache.get(key);
  return entry?.result ?? null;
}

export function putCachedEstimate(code: string, result: EstimateResult) {
  const key = hashCode(code);
  const cache = loadCache();
  cache.set(key, { result, cached_at: Date.now() });
  saveCache(cache);
}

export function clearCache() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
