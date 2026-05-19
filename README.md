# Legacy Code 変換見積もり

レガシーコード（COBOL/PL/I/Fortran/MUMPS/RPG/VB6/Ada/Java/C 等）を貼り付けると、AI が **規模・難易度・予想削減率・推定工数・類似実績** を返す Web アプリ。

G.state チームが過去に完了した **11件の実変換実績**（Issue #40 シリーズ全11本）を Few-shot 参照データとして使用し、見積もりを過去事例にアンカリングする。

## できること

- レガシーコードの自動言語判定（COBOL / PL/I / Fortran / MUMPS / RPG / VB6 / Ada / Java / C / C++ / Pascal / BASIC / Assembler）
- 行数・難易度（★1〜★5）の自動計算
- 予想削減率レンジ（負の値もあり：VMコア等は増加）
- AI 伴走前提の人日工数レンジ
- 類似する過去事例の提示と類似度スコア

## 技術スタック

- **Framework**: Next.js 16 (App Router) + Turbopack
- **Language**: TypeScript
- **UI**: Tailwind CSS v4
- **LLM**: Gemini 2.5 Flash（優先） / Claude Haiku 4.5（フォールバック）
- **ホスティング**: Vercel

## セットアップ

```bash
npm install

# .env.local を作成し API キーを設定
cp .env.example .env.local
# GEMINI_API_KEY を埋める

npm run dev
# http://localhost:3000
```

## デプロイ（Vercel）

```bash
npm run build  # ビルドが通ることを確認
npx vercel     # 初回はプロジェクト紐付け
```

Vercel ダッシュボードで以下の環境変数を設定：

- `GEMINI_API_KEY`（必須）
- `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`（任意、レート制限ローテーション用）
- `ANTHROPIC_API_KEY`（任意、Gemini が全枯渇したとき用フォールバック）

## アーキテクチャ

```
src/
├── app/
│   ├── api/estimate/route.ts   # POST /api/estimate
│   ├── page.tsx                 # ホーム画面
│   └── layout.tsx
├── components/
│   └── EstimateForm.tsx         # フォーム + 結果表示
└── lib/
    ├── languageDetector.ts      # キーワード/構文ベース言語判定
    └── estimate.ts              # LLM 呼び出し + プロンプト設計

data/
└── fewshot_cases.json           # 11件の過去変換実績（Few-shot 参照）
```

## Few-shot 事例（11件、削減率順）

| ID | 名前 | 言語 | 削減率 | ドメイン |
|---|---|---|---:|---|
| `mako_vm` | Mako VM | Java/Forth | -5.7%（VMコア） / 46%（全体） | VM・言語処理系 |
| `saturn_mag` | Saturn 磁場モデル | Fortran 77 | 22% | 科学計算 |
| `rpg_custmast` | RPG 顧客マスタ | IBM i RPG IV | 63% | IBM i 業務 |
| `acas_gl` | ACAS GL | COBOL | 73% | 会計 |
| `vista_problemlist` | VistA Problem List | MUMPS | 78% | 医療 |
| `vb6_pos` | POS Retail | VB6 | 89% | 小売 |
| `habitat` | LucasArts Habitat | PL/I | 90% | MMO |
| `carddemo` | AWS CardDemo | COBOL+ASM | 93% | 金融 |
| `hengband_rust` | Hengband Rust | C→Rust | 96% | ローグライク |
| `whitakers_words` | Whitaker's WORDS | Ada | 98% | 学術・人文 |
| `hengband_web` | Hengband Web | C+Lua | 98.7% | ローグライク |

## 関連 Issue

- gstate-gk/legacy-code-archive Issue #41（本ツールの仕様）
- gstate-gk/legacy-code-archive Issue #40（11件のFew-shot 元データ）

## ライセンス

MIT
