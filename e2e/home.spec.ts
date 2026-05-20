import { test, expect } from "@playwright/test";

test.describe("ホームページ", () => {
  test("ヒーローセクションと統計ストリップが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Legacy Code 変換見積もり" })).toBeVisible();
    await expect(page.getByText("11件の変換実績を Few-shot 参照データとして稼働中")).toBeVisible();
    await expect(page.getByText("実変換実績")).toBeVisible();
    await expect(page.getByText("削減率レンジ")).toBeVisible();
  });

  test("入力タブが3つ表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "貼り付け" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ファイル" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub URL" })).toBeVisible();
  });

  test("サンプル読込ボタン群が表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "COBOL", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fortran 77" })).toBeVisible();
    await expect(page.getByRole("button", { name: "MUMPS" })).toBeVisible();
  });

  test("過去 11 件の変換実績セクションが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("過去 11 件の変換実績")).toBeVisible();
  });

  test("テーマトグルが表示される", async ({ page }) => {
    await page.goto("/");
    // 自動 / ライト / ダーク のいずれかが表示される
    const toggle = page.locator("button", { hasText: /自動|ライト|ダーク/ });
    await expect(toggle).toBeVisible();
  });
});

test.describe("入力モード切替", () => {
  test("ファイルタブをクリックするとドロップゾーンが表示される", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "ファイル" }).click();
    await expect(page.getByText("ファイルをドロップ or クリックして選択")).toBeVisible();
  });

  test("GitHub URL タブをクリックすると URL 入力欄が表示される", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "GitHub URL" }).click();
    await expect(page.getByPlaceholder(/github\.com/)).toBeVisible();
  });
});

test.describe("サンプル読込", () => {
  test("COBOL サンプルをクリックするとテキストエリアに挿入される", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "COBOL", exact: true }).click();
    const textarea = page.getByPlaceholder(/COBOL.*貼り付け/);
    await expect(textarea).not.toBeEmpty();
    const value = await textarea.inputValue();
    expect(value).toContain("IDENTIFICATION DIVISION");
  });

  test("クリアボタンで入力がリセットされる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "COBOL", exact: true }).click();
    await page.getByRole("button", { name: "クリア" }).click();
    const textarea = page.getByPlaceholder(/COBOL.*貼り付け/);
    await expect(textarea).toHaveValue("");
  });
});
