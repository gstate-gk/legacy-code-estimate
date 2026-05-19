import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 200_000;

// GitHub の blob URL / raw URL を raw.githubusercontent.com に正規化する
function toRawUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "raw.githubusercontent.com") {
      return u.toString();
    }
    if (u.hostname === "github.com") {
      // /owner/repo/blob/branch/path/to/file → /owner/repo/branch/path/to/file
      const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/);
      if (m) {
        return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function deriveLabel(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 4) {
      return `${parts[0]}/${parts[1]}@${parts[2]}: ${parts.slice(3).join("/")}`;
    }
    return u.pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "URL を指定してください。" }, { status: 400 });
    }

    const rawUrl = toRawUrl(url);
    if (!rawUrl) {
      return NextResponse.json(
        { error: "GitHub の blob URL または raw URL を指定してください。例: https://github.com/owner/repo/blob/main/path/to/file.cob" },
        { status: 400 }
      );
    }

    const res = await fetch(rawUrl, {
      headers: {
        "User-Agent": "legacy-code-estimate (https://github.com/gstate-gk/legacy-code-estimate)",
        "Accept": "text/plain, */*",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub から取得に失敗しました (HTTP ${res.status})。公開リポジトリのファイルか確認してください。` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `ファイルが大きすぎます (${contentLength.toLocaleString()} B)。${MAX_BYTES.toLocaleString()} B 以内のファイルを指定してください。` },
        { status: 413 }
      );
    }

    const text = await res.text();
    if (text.length > MAX_BYTES) {
      return NextResponse.json(
        { error: `ファイルが大きすぎます (${text.length.toLocaleString()} 文字)。${MAX_BYTES.toLocaleString()} 文字以内に。` },
        { status: 413 }
      );
    }

    return NextResponse.json({
      code: text,
      source_label: deriveLabel(rawUrl),
      bytes: text.length,
      raw_url: rawUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[fetch-github] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
