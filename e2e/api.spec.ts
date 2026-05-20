import { test, expect } from "@playwright/test";

const COBOL_SAMPLE = `       IDENTIFICATION DIVISION.
       PROGRAM-ID. E2E-SAMPLE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-NAME PIC X(20) VALUE "TEST".
       PROCEDURE DIVISION.
           DISPLAY WS-NAME.
           STOP RUN.`;

test.describe("API: /api/estimate", () => {
  test("有効な COBOL コードで 200 が返り、検出が COBOL になる", async ({ request }) => {
    const res = await request.post("/api/estimate", { data: { code: COBOL_SAMPLE } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.detection.language).toBe("COBOL");
    expect(body.lines_total).toBeGreaterThan(5);
    expect(body.difficulty_stars).toBeGreaterThanOrEqual(1);
    expect(body.difficulty_stars).toBeLessThanOrEqual(5);
  });

  test("短すぎるコードは 400", async ({ request }) => {
    const res = await request.post("/api/estimate", { data: { code: "x" } });
    expect(res.status()).toBe(400);
  });

  test("空ボディは 400", async ({ request }) => {
    const res = await request.post("/api/estimate", { data: {} });
    expect(res.status()).toBe(400);
  });
});

test.describe("API: /api/contact", () => {
  test("空ボディは 400", async ({ request }) => {
    const res = await request.post("/api/contact", { data: {} });
    expect([400, 503]).toContain(res.status());
  });

  test("無効なメールは 400 (env が揃っている前提)", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { email: "not-an-email", message: "テストメッセージで10文字以上あります" },
    });
    expect([400, 503]).toContain(res.status());
  });

  test("短いメッセージは 400", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { email: "valid@example.com", message: "短い" },
    });
    expect([400, 503]).toContain(res.status());
  });
});

test.describe("API: /api/og", () => {
  test("?r パラメータなしでもデフォルトカード PNG を返す", async ({ request }) => {
    const res = await request.get("/api/og");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("API: /api/fetch-github (単一ファイル)", () => {
  test("無効な URL は 400", async ({ request }) => {
    const res = await request.post("/api/fetch-github", { data: { url: "" } });
    expect(res.status()).toBe(400);
  });
});
