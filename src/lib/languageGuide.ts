// 各レガシー言語の解説データ
// 「RPG IV って何？」と聞かれた瞬間にモーダルで開ける、営業デモ用の最小限の説明

import type { DetectedLanguage } from "./languageDetector";

export interface LanguageGuide {
  language: DetectedLanguage;
  fullName: string;
  era: string;
  origin: string;
  paradigm: string;
  whyLegacy: string;
  conversionStrategy: string;
  typicalReduction: string;
  notableCase?: string; // Few-shot 内の関連 id
  links: { label: string; url: string }[];
}

export const LANGUAGE_GUIDES: Record<string, LanguageGuide> = {
  COBOL: {
    language: "COBOL",
    fullName: "COBOL（Common Business-Oriented Language）",
    era: "1959〜現役",
    origin: "アメリカ国防総省主導、Grace Hopper らが設計に関与した「ビジネス英語に近い構文」を目指した言語",
    paradigm: "手続き型 + DIVISION 構造（IDENTIFICATION / ENVIRONMENT / DATA / PROCEDURE）",
    whyLegacy:
      "メインフレーム上の会計・銀行・保険・政府基幹システムに大量に残存。担い手の高齢化と人材不足が深刻",
    conversionStrategy:
      "Python + FastAPI + React に分解するパターンが定石。WORKING-STORAGE は dataclass、PERFORM ループは for/while、画面 (CICS BMS) は React コンポーネントへ",
    typicalReduction: "70〜93%（業務系の冗長性が大幅に削減される）",
    notableCase: "acas_gl",
    links: [
      { label: "GnuCOBOL", url: "https://gnucobol.sourceforge.io/" },
      { label: "Wikipedia (COBOL)", url: "https://ja.wikipedia.org/wiki/COBOL" },
    ],
  },
  "PL/I": {
    language: "PL/I",
    fullName: "PL/I（Programming Language One）",
    era: "1964〜",
    origin: "IBM が FORTRAN・COBOL・ALGOL の長所統合を目指して開発。System/360 と密接",
    paradigm: "手続き型 + 強い型 + ON ENDFILE 等のイベントハンドラ",
    whyLegacy:
      "Stratus VOS / TANDEM などの実時間業務システムに残る。Habitat（世界初の商用 MMO）も PL/I 製",
    conversionStrategy:
      "DCL レコード型は TypeScript interface、ON ENDFILE は try-catch、ファイル I/O は SQLite / WebSocket へ置換",
    typicalReduction: "80〜92%",
    notableCase: "habitat",
    links: [{ label: "Wikipedia (PL/I)", url: "https://ja.wikipedia.org/wiki/PL/I" }],
  },
  Fortran: {
    language: "Fortran",
    fullName: "Fortran（FORmula TRANslation）",
    era: "1957〜現役",
    origin: "IBM が科学技術計算用に開発。最初の高水準言語",
    paradigm: "手続き型、配列計算、COMMON ブロックでグローバル状態",
    whyLegacy: "NASA・気象・物理学・流体力学・金融工学などの数値計算コードが現役",
    conversionStrategy:
      "NumPy 直訳が基本。COMMON ブロックは dataclass、1-indexed → 0-indexed の差に注意。アルゴリズム本体は削減対象ではない",
    typicalReduction: "15〜40%（科学計算は削れない）",
    notableCase: "saturn_mag",
    links: [{ label: "Wikipedia (Fortran)", url: "https://ja.wikipedia.org/wiki/Fortran" }],
  },
  MUMPS: {
    language: "MUMPS",
    fullName: "MUMPS（Massachusetts General Hospital Utility Multi-Programming System）",
    era: "1966〜",
    origin: "マサチューセッツ総合病院で開発された医療向け階層型 DB + 言語",
    paradigm: "階層型グローバル変数 (^DPT(...)) + 手続き型 + 暗号的な短縮構文",
    whyLegacy:
      "退役軍人省の VistA、Epic Systems の MyChart 基盤。米国の医療情報インフラの大部分が MUMPS",
    conversionStrategy:
      "^GLOBAL を SQLite/PostgreSQL に正規化。$$EXTRINSIC^ROUTINE 呼び出しはモジュール関数に。医療用語と業務ルールの理解が肝",
    typicalReduction: "70〜85%",
    notableCase: "vista_problemlist",
    links: [{ label: "WorldVistA", url: "https://worldvista.org/" }],
  },
  RPG: {
    language: "RPG",
    fullName: "RPG（Report Program Generator） IV / RPGLE",
    era: "1959〜現役（IBM i 上で進化）",
    origin: "IBM の中小企業向け帳票プログラム生成言語。AS/400 → System i → IBM i で生き残った",
    paradigm: "Free-form RPG（2013年〜）+ サブファイル（5250 緑画面）+ DDS 物理ファイル",
    whyLegacy: "中堅製造業・卸売業の基幹システムに集中。IBM i ハードと一体運用",
    conversionStrategy:
      "サブファイルは React テーブル、DDS は SQLAlchemy モデル、Indicator は state、SQLRPG は普通の SQL に。整理されたコードゆえ削減率は低め",
    typicalReduction: "55〜70%",
    notableCase: "rpg_custmast",
    links: [{ label: "Wikipedia (RPG)", url: "https://ja.wikipedia.org/wiki/RPG_(プログラミング言語)" }],
  },
  VB6: {
    language: "VB6",
    fullName: "Visual Basic 6.0",
    era: "1998〜2008（公式サポート終了済み）",
    origin: "Microsoft、Windows GUI アプリの代名詞",
    paradigm: "イベント駆動 + フォーム定義 (.frm) + ADO データバインド",
    whyLegacy:
      "中小企業の業務アプリ（POS・在庫・顧客管理）、業界特化ツールに残存。Windows 10/11 でも runtime は動くが新規開発不可",
    conversionStrategy:
      "フォーム → React コンポーネント、ADO + Access → SQLAlchemy + SQLite、Crystal Reports → PDF 生成。緑画面ではなく Windows GUI なので構造はモダンに近い",
    typicalReduction: "80〜92%",
    notableCase: "vb6_pos",
    links: [{ label: "Wikipedia (VB6)", url: "https://ja.wikipedia.org/wiki/Microsoft_Visual_Basic" }],
  },
  Ada: {
    language: "Ada",
    fullName: "Ada（Ada Lovelace に因む）",
    era: "1980〜現役",
    origin: "米国防総省が大規模軍需システムの言語乱立を統一するため標準化",
    paradigm: "強い静的型 + パッケージ + 並行処理 (task) + 契約による設計",
    whyLegacy:
      "航空管制・鉄道・防衛・宇宙のミッションクリティカル系。Whitaker's WORDS のような大学研究遺産もある",
    conversionStrategy:
      "subtype / variant record は TypeScript discriminated union、package は ES module、データ駆動の辞書は JSON でそのまま流用",
    typicalReduction: "90〜98%（コードは削れるがデータは残す）",
    notableCase: "whitakers_words",
    links: [{ label: "GNAT Ada", url: "https://www.adacore.com/" }],
  },
  Java: {
    language: "Java",
    fullName: "Java",
    era: "1995〜現役",
    origin: "Sun Microsystems（現 Oracle）が「Write Once, Run Anywhere」を掲げて開発",
    paradigm: "オブジェクト指向 + JVM バイトコード + ガベージコレクション",
    whyLegacy:
      "現役だが「古い Java 7/8 系の Swing/AWT デスクトップアプリ」や「独自 VM 実装」は変換需要あり",
    conversionStrategy:
      "Web 化なら TypeScript + React、安全性重視なら Rust。AWT BufferedImage → HTML5 Canvas、javax.sound → Web Audio API",
    typicalReduction: "30〜60%（VM コア部分は削れず、増えることも）",
    notableCase: "mako_vm",
    links: [{ label: "Wikipedia (Java)", url: "https://ja.wikipedia.org/wiki/Java" }],
  },
  C: {
    language: "C",
    fullName: "C",
    era: "1972〜現役",
    origin: "Dennis Ritchie が Bell Labs で開発、UNIX の実装言語",
    paradigm: "手続き型 + ポインタ + マニュアルメモリ管理",
    whyLegacy: "OS カーネル、組込み、ゲーム、エミュレータなどに広く残存",
    conversionStrategy: "Web 化なら Emscripten で WebAssembly、安全性重視なら c2rust + 手作業整形で Rust",
    typicalReduction: "60〜99%（Lua/データを残せば大幅削減、コア処理は削れない）",
    notableCase: "hengband_web",
    links: [{ label: "ISO C Standard", url: "https://www.iso.org/standard/74528.html" }],
  },
  "C++": {
    language: "C++",
    fullName: "C++",
    era: "1985〜現役",
    origin: "Bjarne Stroustrup が C にクラスを追加して開発",
    paradigm: "オブジェクト指向 + テンプレート + RAII",
    whyLegacy: "古い C++03 / C++98 のコードは現代の C++20/23 とほぼ別言語。Boost 依存の大規模 SDK 等",
    conversionStrategy: "Rust への移行、または現代 C++ への refactor が選択肢",
    typicalReduction: "40〜75%",
    links: [{ label: "isocpp.org", url: "https://isocpp.org/" }],
  },
  Pascal: {
    language: "Pascal",
    fullName: "Pascal / Object Pascal / Delphi",
    era: "1970〜2010s",
    origin: "Niklaus Wirth が教育用に開発、後に Borland Delphi で業務利用が急増",
    paradigm: "手続き型 / Object Pascal はクラス指向",
    whyLegacy: "Delphi 製の Windows 業務アプリ、教育・組込み系の遺産",
    conversionStrategy: "Object Pascal は TypeScript or C# への移行が現実的",
    typicalReduction: "50〜80%",
    links: [{ label: "Free Pascal", url: "https://www.freepascal.org/" }],
  },
  BASIC: {
    language: "BASIC",
    fullName: "BASIC（Beginner's All-purpose Symbolic Instruction Code）",
    era: "1964〜現役（多様な方言）",
    origin: "Dartmouth で教育用に開発、後に多くの方言（GW-BASIC, QBasic, VB, FreeBASIC 等）",
    paradigm: "手続き型 + 行番号（古典）or 構造化（モダン）",
    whyLegacy: "古い PC 用業務アプリ、初期パソコン文化の遺産",
    conversionStrategy: "Python or TypeScript への直訳が一般的、GOTO は構造化リファクタリングで除去",
    typicalReduction: "70〜90%",
    links: [{ label: "Wikipedia (BASIC)", url: "https://ja.wikipedia.org/wiki/BASIC" }],
  },
  Assembler: {
    language: "Assembler",
    fullName: "Assembler（IBM HLASM / x86 ASM / 68k 等）",
    era: "1950s〜現役",
    origin: "機械語の人間可読表現",
    paradigm: "ハードウェア直結、メモリアドレス・レジスタ直接操作",
    whyLegacy:
      "メインフレーム HLASM のサブルーチン、組込みの一部、暗号・性能クリティカル部",
    conversionStrategy:
      "意味を解析して高水準言語で書き直す。動作仕様の理解が肝で、行単位の翻訳ではない",
    typicalReduction: "30〜70%（仕様化の質に依存）",
    notableCase: "carddemo",
    links: [{ label: "Wikipedia (HLASM)", url: "https://ja.wikipedia.org/wiki/IBM_High_Level_Assembler" }],
  },
};

/** UI 用: 辞書からエントリを取得（Unknown 等は null） */
export function getGuide(lang: string): LanguageGuide | null {
  return LANGUAGE_GUIDES[lang] ?? null;
}
