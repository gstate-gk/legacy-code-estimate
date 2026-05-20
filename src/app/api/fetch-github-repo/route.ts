// GitHub リポジトリ全体評価用エンドポイント
// 1. owner/repo/ref を受け取る
// 2. GitHub Tree API で recursive にファイルツリーを取得
// 3. レガシー言語の拡張子でフィルタ
// 4. サイズ降順で N 件選び、合計 200KB 以内になるよう raw 取得して連結
// 5. 各ファイルの先頭にマーカーを入れて返す

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TOTAL_BYTES = 200_000;
const MAX_FILES_DEFAULT = 12;
const MAX_TREE_SIZE = 5_000; // Tree が巨大なら早めに諦める

// レガシー寄りソースの拡張子を優先（重み付け）
// 数字が大きいほど優先される
const EXTENSION_WEIGHTS: Record<string, number> = {
  // 業務系レガシー（最優先）
  ".cob": 100, ".cbl": 100, ".cobol": 100,
  ".pli": 100, ".pl1": 100,
  ".mumps": 100, ".m": 70, // .m は Objective-C と被るので低め
  ".rpg": 100, ".rpgle": 100, ".sqlrpgle": 100,
  ".frm": 100, ".bas": 90, ".cls": 90, ".vb": 80,
  // 古典系
  ".for": 90, ".f": 90, ".f77": 90, ".f90": 90, ".f95": 90,
  ".ada": 90, ".adb": 90, ".ads": 90,
  ".pas": 70,
  // 現代寄り（あれば見るが優先度低）
  ".java": 50, ".c": 50, ".h": 30, ".cpp": 40, ".hpp": 25, ".cs": 40,
};

const EXCLUDE_PATH_PATTERNS = [
  /node_modules\//i,
  /vendor\//i,
  /third[_-]?party\//i,
  /\.git\//i,
  /test[s]?\//i,
  /spec[s]?\//i,
  /\.min\./i,
  /generated\//i,
  /build\//i,
  /dist\//i,
];

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GithubTreeResponse {
  sha: string;
  tree: TreeEntry[];
  truncated: boolean;
}

interface RepoRef {
  owner: string;
  repo: string;
  ref: string;
}

function parseRepoUrl(url: string): RepoRef | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    // /owner/repo/tree/branchname or /owner/repo
    let ref = "HEAD";
    if (parts[2] === "tree" && parts[3]) ref = parts[3];
    return { owner, repo, ref };
  } catch {
    return null;
  }
}

function classifyExtension(path: string): { ext: string; weight: number } | null {
  const m = path.toLowerCase().match(/\.[^./]+$/);
  if (!m) return null;
  const ext = m[0];
  const weight = EXTENSION_WEIGHTS[ext];
  if (weight === undefined) return null;
  return { ext, weight };
}

function isExcluded(path: string): boolean {
  return EXCLUDE_PATH_PATTERNS.some((p) => p.test(path));
}

async function fetchTree(ref: RepoRef): Promise<GithubTreeResponse> {
  const headers: HeadersInit = {
    "User-Agent": "legacy-code-estimate",
    "Accept": "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // ref を SHA に解決してから tree を取得（HEAD でもブランチ名でも動く）
  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(ref.ref)}?recursive=1`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub Tree API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchRaw(ref: RepoRef, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.ref}/${path}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "legacy-code-estimate" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const maxFiles = Math.min(20, Math.max(3, Number(body?.maxFiles) || MAX_FILES_DEFAULT));

    const ref = parseRepoUrl(url);
    if (!ref) {
      return NextResponse.json(
        { error: "GitHub リポジトリ URL を指定してください (例: https://github.com/owner/repo)" },
        { status: 400 }
      );
    }

    const tree = await fetchTree(ref);

    if (tree.truncated) {
      console.warn(`[fetch-github-repo] tree truncated for ${ref.owner}/${ref.repo}`);
    }

    // blob のみ、サポート拡張子のみ、除外パターン除外
    type Candidate = { path: string; size: number; weight: number; ext: string };
    const candidates: Candidate[] = [];
    for (const entry of tree.tree.slice(0, MAX_TREE_SIZE)) {
      if (entry.type !== "blob") continue;
      if (isExcluded(entry.path)) continue;
      const cls = classifyExtension(entry.path);
      if (!cls) continue;
      candidates.push({
        path: entry.path,
        size: entry.size ?? 0,
        weight: cls.weight,
        ext: cls.ext,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: `リポジトリにレガシー言語のソースファイルが見つかりませんでした (探索拡張子: ${Object.keys(EXTENSION_WEIGHTS).join(", ")})` },
        { status: 404 }
      );
    }

    // メイン言語ヒューリスティック:
    // 拡張子ごとの累計サイズが最大のものを「主言語」とみなし、その拡張子のファイルにブースト
    // これで「Mako の .java（VM 本体）が、サブ DSL の .f より先に拾われる」ような直感に合う挙動になる
    const sizeByExt = new Map<string, number>();
    const countByExt = new Map<string, number>();
    for (const c of candidates) {
      sizeByExt.set(c.ext, (sizeByExt.get(c.ext) ?? 0) + c.size);
      countByExt.set(c.ext, (countByExt.get(c.ext) ?? 0) + 1);
    }
    let mainExt: string | null = null;
    let mainScore = 0;
    for (const [ext, totalSize] of sizeByExt.entries()) {
      // スコア = 合計バイト数 × log(ファイル数+1) で「量も種類も多い」拡張子を主言語に
      const cnt = countByExt.get(ext) ?? 0;
      const score = totalSize * Math.log(cnt + 1);
      if (score > mainScore) {
        mainScore = score;
        mainExt = ext;
      }
    }

    // 主言語ブースト: +50 ポイント。元の重み付け(100/90/...)は維持しつつ、
    // サブ DSL 系（重み 90）と主言語の現代寄りファイル（重み 50）の順位を入れ替える効果がある
    const BOOST = 50;

    candidates.sort((a, b) => {
      const wa = a.ext === mainExt ? a.weight + BOOST : a.weight;
      const wb = b.ext === mainExt ? b.weight + BOOST : b.weight;
      if (wb !== wa) return wb - wa;
      // 同重みならサイズ大きい順（中身の濃いファイルを優先）
      return b.size - a.size;
    });

    // 並行 fetch（最大 maxFiles 件、合計 MAX_TOTAL_BYTES 以内）
    const selected: { path: string; size: number }[] = [];
    let total = 0;
    const fetched: { path: string; code: string }[] = [];

    for (const c of candidates) {
      if (selected.length >= maxFiles) break;
      if (total + c.size > MAX_TOTAL_BYTES && fetched.length > 0) continue;
      selected.push({ path: c.path, size: c.size });
      total += c.size;
    }

    // 実取得（直列だが少数なので OK）
    const results = await Promise.all(
      selected.map(async (s) => ({ path: s.path, code: await fetchRaw(ref, s.path) }))
    );

    for (const r of results) {
      if (r.code === null) continue;
      // 結合時の容量再チェック
      const willBe = fetched.reduce((acc, f) => acc + f.code.length + 50, 0) + r.code.length;
      if (willBe > MAX_TOTAL_BYTES * 1.2) break;
      fetched.push({ path: r.path, code: r.code });
    }

    if (fetched.length === 0) {
      return NextResponse.json(
        { error: "ファイル取得にすべて失敗しました（プライベートリポジトリの可能性）" },
        { status: 502 }
      );
    }

    // 結合: 各ファイルの先頭にマーカー
    const combined = fetched
      .map((f) => `// ===== file: ${f.path} =====\n${f.code}`)
      .join("\n\n");

    const truncated = combined.length > MAX_TOTAL_BYTES
      ? combined.slice(0, MAX_TOTAL_BYTES) + "\n\n... (容量上限により以降は省略)"
      : combined;

    return NextResponse.json({
      code: truncated,
      source_label: `${ref.owner}/${ref.repo}@${ref.ref} (${fetched.length}ファイル / ${truncated.length.toLocaleString()}文字${mainExt ? ` / 主言語 ${mainExt}` : ""})`,
      ref,
      file_count: fetched.length,
      files: fetched.map((f) => ({ path: f.path, bytes: f.code.length })),
      tree_truncated: tree.truncated,
      total_candidates: candidates.length,
      main_ext: mainExt,
      ext_distribution: Object.fromEntries(
        Array.from(sizeByExt.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([ext, bytes]) => [ext, { bytes, count: countByExt.get(ext) ?? 0 }])
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[fetch-github-repo] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
