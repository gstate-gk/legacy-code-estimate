"use client";

import { useState } from "react";
import type { EstimateResult } from "@/lib/estimate";

interface ContactFormProps {
  result: EstimateResult;
  shareUrl: string;
}

export default function ContactForm({ result, shareUrl }: ContactFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          message,
          share_url: shareUrl,
          result_summary: {
            language: result.detection.language,
            lines: result.lines_total,
            difficulty_stars: result.difficulty_stars,
            reduction_min: result.reduction_range.min,
            reduction_max: result.reduction_range.max,
            workdays_min: result.workdays_range.min,
            workdays_max: result.workdays_range.max,
            model_used: result.model_used,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "送信に失敗しました。");
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラー");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
        ✓ お問い合わせを送信しました。1〜2 営業日以内にご返信いたします。
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-blue-900 dark:text-blue-200">
            💬 この見積もりについて相談したい / 実際の変換を依頼したい
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5"
          >
            問い合わせる
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">お問い合わせ</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          閉じる
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        この見積もり結果と共有 URL を一緒に送信します。担当者から1〜2 営業日以内にご返信します。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="お名前">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="会社名">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={200}
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
      </div>

      <Field label="メールアドレス" required>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field label="メッセージ" required>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2_000}
          placeholder="変換を検討している背景・規模感・気になる点など..."
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-[11px] text-zinc-400 text-right mt-0.5">{message.length} / 2,000</div>
      </Field>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending || !email || message.length < 10}
          className="rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "送信中..." : "送信する"}
        </button>
        <span className="text-[11px] text-zinc-500">
          ご記入いただいた情報は本件のご返信目的のみに使用します。
        </span>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
