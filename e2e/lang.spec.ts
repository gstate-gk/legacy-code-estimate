import { test, expect } from "@playwright/test";

test.describe("言語別ランディングページ", () => {
  test("/lang/cobol ページが表示される", async ({ page }) => {
    await page.goto("/lang/cobol");
    await expect(page.getByRole("heading", { name: /COBOL レガシーコードの変換見積もり/ })).toBeVisible();
    await expect(page.getByText(/Common Business-Oriented Language/)).toBeVisible();
    await expect(page.getByText("想定削減率")).toBeVisible();
  });

  test("/lang/mumps ページが表示される", async ({ page }) => {
    await page.goto("/lang/mumps");
    await expect(page.getByRole("heading", { name: /MUMPS レガシーコードの変換見積もり/ })).toBeVisible();
    await expect(page.getByText(/Massachusetts General Hospital/)).toBeVisible();
  });

  test("存在しない言語は 404", async ({ page }) => {
    const response = await page.goto("/lang/notexist");
    expect(response?.status()).toBe(404);
  });

  test("トップへのパンくずリンクが機能する", async ({ page }) => {
    await page.goto("/lang/fortran");
    await page.getByRole("link", { name: "トップ" }).first().click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("SEO 関連エンドポイント", () => {
  test("/sitemap.xml が XML を返す", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const body = await response?.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/lang/cobol");
  });

  test("/robots.txt が Sitemap 行を含む", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const body = await response?.text();
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
  });
});
