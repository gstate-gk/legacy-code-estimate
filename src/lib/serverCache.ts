// サーバー側インメモリキャッシュ（TTL 付き LRU）
// 同 Vercel 関数インスタンス内で有効。コールドスタートで消える前提。
// 主目的: 同じコードを別ユーザーが連投した場合の API 呼び出し抑制（営業デモのサンプルコードなど）
// LLM レート制限とコスト削減にも寄与する。

interface Entry<V> {
  v: V;
  expires: number;
}

export class TtlLruCache<V> {
  private map = new Map<string, Entry<V>>();

  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string): V | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expires < Date.now()) {
      this.map.delete(key);
      return null;
    }
    // LRU 更新: 取り出して末尾に置き直す
    this.map.delete(key);
    this.map.set(key, e);
    return e.v;
  }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { v: value, expires: Date.now() + this.ttlMs });
    // サイズ上限を超えたら先頭（最古）から削除
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  size(): number {
    return this.map.size;
  }
}

// FNV-1a 32bit (lib/estimateCache.ts と同実装、サーバー側で別ファイルなので重複)
export function hashCode(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
