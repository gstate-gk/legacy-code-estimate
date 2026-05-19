// 見積もり結果をパーマリンク化するエンコーダ/デコーダ
// クエリパラメータ ?r=<base64url> に結果を埋め込む（サーバーストレージ不要）
// コードそのものは含めず、結果と最小のメタ情報のみ

import type { EstimateResult } from "./estimate";

const VERSION = 1;

interface ShareEnvelope {
  v: number;
  r: EstimateResult;
  // 元コードのプレビュー（最大200文字、ユーザー文脈再現用）
  p?: string;
}

function utf8ToBase64Url(s: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(s, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // browser
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(b: string): string {
  const pad = b.length % 4 === 0 ? "" : "=".repeat(4 - (b.length % 4));
  const std = b.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof window === "undefined") {
    return Buffer.from(std, "base64").toString("utf-8");
  }
  const bin = atob(std);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare(result: EstimateResult, codePreview?: string): string {
  const env: ShareEnvelope = {
    v: VERSION,
    r: result,
    p: codePreview ? codePreview.slice(0, 200) : undefined,
  };
  return utf8ToBase64Url(JSON.stringify(env));
}

export function decodeShare(token: string): { result: EstimateResult; preview?: string } | null {
  try {
    const raw = base64UrlToUtf8(token);
    const env = JSON.parse(raw) as ShareEnvelope;
    if (env.v !== VERSION) return null;
    if (!env.r) return null;
    return { result: env.r, preview: env.p };
  } catch {
    return null;
  }
}
