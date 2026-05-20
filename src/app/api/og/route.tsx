import { ImageResponse } from "@vercel/og";
import { decodeShare } from "@/lib/sharePermalink";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("r");

  if (!token) {
    return new ImageResponse(<DefaultCard />, { width: WIDTH, height: HEIGHT });
  }

  const decoded = decodeShare(token);
  if (!decoded) {
    return new ImageResponse(<DefaultCard />, { width: WIDTH, height: HEIGHT });
  }

  const r = decoded.result;
  const lang = r.detection.language;
  const lines = r.lines_total.toLocaleString();
  const star = stars(r.difficulty_stars);
  const reduction = `${pct(r.reduction_range.min)} 〜 ${pct(r.reduction_range.max)}`;
  const workdays = `${r.workdays_range.min} 〜 ${r.workdays_range.max} 人日`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#94a3b8", display: "flex" }}>Legacy Code 変換見積もり</div>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 18, color: "#f8fafc", display: "flex" }}>
          {lang}
          <span style={{ marginLeft: 24, fontSize: 36, color: "#94a3b8", fontWeight: 500, alignSelf: "flex-end", paddingBottom: 16 }}>
            {lines} 行
          </span>
        </div>

        <div style={{ display: "flex", marginTop: 50, gap: 40, flexWrap: "wrap" }}>
          <Stat label="変換難易度" value={star} valueColor="#fbbf24" valueSize={48} />
          <Stat label="予想削減率" value={reduction} valueColor="#34d399" valueSize={40} />
          <Stat label="推定工数（AI 伴走）" value={workdays} valueColor="#60a5fa" valueSize={40} />
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#64748b",
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex" }}>legacy-code-estimate.vercel.app</div>
          <div style={{ display: "flex" }}>11件の実変換実績を Few-shot に</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

function Stat(props: { label: string; value: string; valueColor: string; valueSize: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22, color: "#94a3b8", display: "flex" }}>{props.label}</div>
      <div
        style={{
          fontSize: props.valueSize,
          fontWeight: 700,
          marginTop: 8,
          color: props.valueColor,
          display: "flex",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function DefaultCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#e2e8f0",
        fontFamily: "sans-serif",
        padding: "60px 80px",
      }}
    >
      <div style={{ fontSize: 28, color: "#94a3b8", display: "flex" }}>Legacy Code</div>
      <div style={{ fontSize: 88, fontWeight: 800, marginTop: 18, color: "#f8fafc", display: "flex" }}>
        変換見積もり
      </div>
      <div style={{ fontSize: 26, marginTop: 30, color: "#cbd5e1", display: "flex", textAlign: "center" }}>
        コードを貼ると AI が削減率・工数・難易度を返します
      </div>
      <div style={{ marginTop: 50, color: "#64748b", fontSize: 22, display: "flex" }}>
        legacy-code-estimate.vercel.app
      </div>
    </div>
  );
}
