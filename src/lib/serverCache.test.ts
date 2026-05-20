import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlLruCache, hashCode } from "./serverCache";

describe("hashCode", () => {
  it("returns a hex string", () => {
    const h = hashCode("hello");
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("returns same hash for same input", () => {
    expect(hashCode("ABC")).toBe(hashCode("ABC"));
  });

  it("returns different hash for different inputs", () => {
    expect(hashCode("A")).not.toBe(hashCode("B"));
  });

  it("handles empty string", () => {
    expect(hashCode("")).toMatch(/^[0-9a-f]+$/);
  });

  it("handles unicode input", () => {
    const a = hashCode("日本語");
    const b = hashCode("english");
    expect(a).not.toBe(b);
  });
});

describe("TtlLruCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const c = new TtlLruCache<string>(3, 1000);
    c.set("a", "alpha");
    expect(c.get("a")).toBe("alpha");
  });

  it("returns null for missing key", () => {
    const c = new TtlLruCache<string>(3, 1000);
    expect(c.get("nope")).toBeNull();
  });

  it("expires entries after TTL", () => {
    const c = new TtlLruCache<string>(3, 1000);
    c.set("a", "alpha");
    vi.advanceTimersByTime(999);
    expect(c.get("a")).toBe("alpha");
    vi.advanceTimersByTime(2);
    expect(c.get("a")).toBeNull();
  });

  it("evicts oldest when over capacity", () => {
    const c = new TtlLruCache<string>(2, 1000);
    c.set("a", "1");
    c.set("b", "2");
    c.set("c", "3"); // a が押し出される
    expect(c.get("a")).toBeNull();
    expect(c.get("b")).toBe("2");
    expect(c.get("c")).toBe("3");
  });

  it("recently-accessed key is not evicted (LRU)", () => {
    const c = new TtlLruCache<string>(2, 1000);
    c.set("a", "1");
    c.set("b", "2");
    c.get("a"); // a を新しくする
    c.set("c", "3"); // b が押し出される
    expect(c.get("a")).toBe("1");
    expect(c.get("b")).toBeNull();
    expect(c.get("c")).toBe("3");
  });

  it("set with existing key updates value and refreshes TTL", () => {
    const c = new TtlLruCache<string>(3, 1000);
    c.set("a", "v1");
    vi.advanceTimersByTime(500);
    c.set("a", "v2");
    vi.advanceTimersByTime(600);
    expect(c.get("a")).toBe("v2"); // 上書きされた + TTL リセットで生きている
  });

  it("reports correct size", () => {
    const c = new TtlLruCache<string>(5, 1000);
    expect(c.size()).toBe(0);
    c.set("a", "1");
    c.set("b", "2");
    expect(c.size()).toBe(2);
  });
});
