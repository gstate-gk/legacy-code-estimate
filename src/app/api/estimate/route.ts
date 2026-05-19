import { NextRequest, NextResponse } from "next/server";
import { estimateCode } from "@/lib/estimate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body?.code === "string" ? body.code : "";

    if (!code || code.length < 20) {
      return NextResponse.json(
        { error: "コードが短すぎます。20文字以上、5行以上貼り付けてください。" },
        { status: 400 }
      );
    }

    if (code.length > 200_000) {
      return NextResponse.json(
        { error: "コードが大きすぎます。20万文字以内にしてください（必要なら主要モジュールのみ）。" },
        { status: 400 }
      );
    }

    const result = await estimateCode({ code });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    console.error("[estimate] error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
