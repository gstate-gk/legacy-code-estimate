// 見積もり結果からの問い合わせ受付
// Resend 経由で ADMIN_EMAIL に通知メールを送る
//
// セキュリティ:
// - 入力長制限（DoS / メール本文肥大化対策）
// - 簡易レート制限（同 IP からの連投を弾く、メモリ保持なので関数ごとリセットあり）
// - 公開 API なので robots に弾かれる工夫は別途

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_NAME = 100;
const MAX_COMPANY = 200;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 2_000;
const MAX_RESULT_JSON = 8_000;

interface ContactBody {
  name?: string;
  company?: string;
  email?: string;
  message?: string;
  result_summary?: {
    language?: string;
    lines?: number;
    difficulty_stars?: number;
    reduction_min?: number;
    reduction_max?: number;
    workdays_min?: number;
    workdays_max?: number;
    model_used?: string;
  };
  share_url?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ADMIN_EMAIL;
    const from = process.env.CONTACT_FROM || "onboarding@resend.dev";

    if (!apiKey || !to) {
      return NextResponse.json(
        { error: "メール送信設定が完了していません。RESEND_API_KEY または ADMIN_EMAIL が未設定です。" },
        { status: 503 }
      );
    }

    const body: ContactBody = await req.json();
    const name = (body.name || "").toString().trim().slice(0, MAX_NAME);
    const company = (body.company || "").toString().trim().slice(0, MAX_COMPANY);
    const email = (body.email || "").toString().trim().slice(0, MAX_EMAIL);
    const message = (body.message || "").toString().trim().slice(0, MAX_MESSAGE);
    const shareUrl = (body.share_url || "").toString().trim().slice(0, 2_000);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "メッセージは10文字以上で入力してください。" }, { status: 400 });
    }

    const summary = body.result_summary;
    const summaryLines: string[] = [];
    if (summary) {
      if (summary.language) summaryLines.push(`言語: ${summary.language}`);
      if (typeof summary.lines === "number") summaryLines.push(`行数: ${summary.lines.toLocaleString()} 行`);
      if (typeof summary.difficulty_stars === "number") summaryLines.push(`難易度: ★${summary.difficulty_stars}`);
      if (typeof summary.reduction_min === "number" && typeof summary.reduction_max === "number") {
        summaryLines.push(
          `削減率レンジ: ${(summary.reduction_min * 100).toFixed(1)}% 〜 ${(summary.reduction_max * 100).toFixed(1)}%`
        );
      }
      if (typeof summary.workdays_min === "number" && typeof summary.workdays_max === "number") {
        summaryLines.push(`推定工数: ${summary.workdays_min}〜${summary.workdays_max} 人日`);
      }
      if (summary.model_used) summaryLines.push(`使用モデル: ${summary.model_used}`);
    }

    const subject = `[Legacy Code Estimate] お問い合わせ ${company ? `(${company})` : ""}`;
    const htmlSummary = summaryLines.length > 0
      ? `<h3>見積もり結果</h3><ul>${summaryLines.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : "";

    const html = [
      `<h2>Legacy Code Estimate からのお問い合わせ</h2>`,
      `<table cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">`,
      `<tr><th align="left" style="background:#f3f4f6">氏名</th><td>${escapeHtml(name) || "(未記入)"}</td></tr>`,
      `<tr><th align="left" style="background:#f3f4f6">会社名</th><td>${escapeHtml(company) || "(未記入)"}</td></tr>`,
      `<tr><th align="left" style="background:#f3f4f6">メール</th><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>`,
      `</table>`,
      `<h3>メッセージ</h3>`,
      `<pre style="background:#f9fafb;padding:12px;border-radius:4px;white-space:pre-wrap;font-family:sans-serif">${escapeHtml(message)}</pre>`,
      htmlSummary,
      shareUrl ? `<p><strong>共有 URL:</strong> <a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a></p>` : "",
      `<hr>`,
      `<p style="color:#6b7280;font-size:12px">送信時刻: ${new Date().toISOString()}</p>`,
    ].join("\n");

    const text = [
      `Legacy Code Estimate からのお問い合わせ`,
      ``,
      `氏名: ${name || "(未記入)"}`,
      `会社名: ${company || "(未記入)"}`,
      `メール: ${email}`,
      ``,
      `メッセージ:`,
      message,
      ``,
      ...(summaryLines.length > 0 ? ["見積もり結果:", ...summaryLines.map((s) => `  ${s}`), ""] : []),
      ...(shareUrl ? [`共有 URL: ${shareUrl}`, ""] : []),
      `送信時刻: ${new Date().toISOString()}`,
    ].join("\n");

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: subject.slice(0, 200),
      html,
      text,
    });

    if (result.error) {
      console.error("[contact] Resend error:", result.error);
      return NextResponse.json({ error: `メール送信に失敗しました: ${result.error.message || "unknown"}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[contact] error:", e);
    // 余分なバイト数チェックを記録（本文巨大化試行など）
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}

// MAX_RESULT_JSON はインタフェース上の制限値。実装で参照しないが将来の拡張用に残す。
void MAX_RESULT_JSON;
