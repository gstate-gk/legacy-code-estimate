// レガシーコードの言語自動判定
// キーワード・構文パターンマッチングのみで判定する軽量実装
// 信頼度（0..1）と検出語の根拠も返す

export type DetectedLanguage =
  | "COBOL"
  | "PL/I"
  | "Fortran"
  | "MUMPS"
  | "RPG"
  | "VB6"
  | "Ada"
  | "Java"
  | "C"
  | "C++"
  | "Pascal"
  | "BASIC"
  | "Assembler"
  | "Unknown";

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number;
  evidence: string[];
  candidates: { language: DetectedLanguage; score: number }[];
}

interface Rule {
  language: DetectedLanguage;
  patterns: { regex: RegExp; weight: number; note: string }[];
}

const RULES: Rule[] = [
  {
    language: "COBOL",
    patterns: [
      { regex: /^\s*IDENTIFICATION\s+DIVISION\b/im, weight: 10, note: "IDENTIFICATION DIVISION" },
      { regex: /^\s*PROCEDURE\s+DIVISION\b/im, weight: 10, note: "PROCEDURE DIVISION" },
      { regex: /^\s*DATA\s+DIVISION\b/im, weight: 8, note: "DATA DIVISION" },
      { regex: /^\s*WORKING-STORAGE\s+SECTION\b/im, weight: 8, note: "WORKING-STORAGE SECTION" },
      { regex: /\bPIC(?:TURE)?\s+[X9SVP9(]/i, weight: 4, note: "PIC clause" },
      { regex: /\bPERFORM\s+\w+/i, weight: 3, note: "PERFORM" },
      { regex: /\bDISPLAY\s+["']/i, weight: 2, note: "DISPLAY" },
    ],
  },
  {
    language: "PL/I",
    patterns: [
      { regex: /\bPROCEDURE\s+OPTIONS\s*\(\s*MAIN\s*\)/i, weight: 12, note: "PROCEDURE OPTIONS(MAIN)" },
      { regex: /\bDCL\s+\w+/i, weight: 4, note: "DCL declaration" },
      { regex: /\bDECLARE\s+\w+/i, weight: 4, note: "DECLARE declaration" },
      { regex: /\bFIXED\s+BIN(?:ARY)?\b/i, weight: 5, note: "FIXED BINARY" },
      { regex: /\bPUT\s+SKIP\s+LIST/i, weight: 6, note: "PUT SKIP LIST" },
      { regex: /\bON\s+ENDFILE\s*\(/i, weight: 6, note: "ON ENDFILE" },
    ],
  },
  {
    language: "Fortran",
    patterns: [
      { regex: /^\s*PROGRAM\s+\w+/im, weight: 7, note: "PROGRAM declaration" },
      { regex: /^\s*SUBROUTINE\s+\w+/im, weight: 8, note: "SUBROUTINE" },
      { regex: /^\s*IMPLICIT\s+NONE\b/im, weight: 8, note: "IMPLICIT NONE" },
      { regex: /^C[ \t]/m, weight: 4, note: "Fortran 77 column-1 comment" },
      { regex: /\bCOMMON\s*\/\s*\w+\s*\//i, weight: 7, note: "COMMON block" },
      { regex: /\bDIMENSION\s+\w+\s*\(/i, weight: 5, note: "DIMENSION" },
      { regex: /\bREAL\*[48]\b/i, weight: 5, note: "REAL*4 / REAL*8" },
      { regex: /\bGOTO\s+\d+/i, weight: 3, note: "GOTO numeric label" },
    ],
  },
  {
    language: "MUMPS",
    patterns: [
      { regex: /\^[A-Z][A-Z0-9]*\(/i, weight: 8, note: "^GLOBAL reference" },
      { regex: /\bSET\s+\^?\w+\s*=/i, weight: 4, note: "SET" },
      { regex: /\bKILL\s+\^?\w+/i, weight: 5, note: "KILL" },
      { regex: /\bDO\s+\^?\w+/i, weight: 3, note: "DO routine" },
      { regex: /\$\$\w+\^\w+/i, weight: 7, note: "$$EXTRINSIC^ROUTINE" },
      { regex: /\bQUIT\b/i, weight: 2, note: "QUIT" },
      { regex: /\bIF\s+'/i, weight: 4, note: "MUMPS NOT operator" },
    ],
  },
  {
    language: "RPG",
    patterns: [
      { regex: /^\s*\*\*FREE/m, weight: 12, note: "**FREE directive" },
      { regex: /^\s*H\s+\w+/m, weight: 5, note: "RPG H-spec" },
      { regex: /^\s*F\s+\w+/m, weight: 5, note: "RPG F-spec" },
      { regex: /^\s*D\s+\w+/m, weight: 5, note: "RPG D-spec" },
      { regex: /^\s*C\s+\w+/m, weight: 4, note: "RPG C-spec" },
      { regex: /\bDCL-PROC\b/i, weight: 8, note: "DCL-PROC (free-form)" },
      { regex: /\bDCL-DS\b/i, weight: 6, note: "DCL-DS (free-form)" },
      { regex: /\bEXFMT\s+\w+/i, weight: 7, note: "EXFMT (5250 display)" },
    ],
  },
  {
    language: "VB6",
    patterns: [
      { regex: /\bVERSION\s+\d+\.\d+/i, weight: 4, note: "VERSION header" },
      { regex: /^\s*Begin\s+VB\./m, weight: 12, note: "VB6 form Begin block" },
      { regex: /\bAttribute\s+VB_Name\s*=/i, weight: 12, note: "VB_Name attribute" },
      { regex: /\bOption\s+Explicit\b/i, weight: 4, note: "Option Explicit" },
      { regex: /\bPrivate\s+Sub\s+\w+_\w+\s*\(/i, weight: 6, note: "Private Sub event handler" },
      { regex: /\bMsgBox\s+["']/i, weight: 3, note: "MsgBox" },
      { regex: /\bDim\s+\w+\s+As\s+\w+/i, weight: 4, note: "Dim ... As ..." },
    ],
  },
  {
    language: "Ada",
    patterns: [
      { regex: /\bpackage\s+\w+\s+is\b/i, weight: 10, note: "package ... is" },
      { regex: /\bprocedure\s+\w+\s+is\b/i, weight: 6, note: "procedure ... is" },
      { regex: /\bbegin\b[\s\S]{0,200}\bend\s+\w+\s*;/i, weight: 6, note: "begin/end pair" },
      { regex: /:=\s*\w+;/, weight: 3, note: ":= assignment" },
      { regex: /\bwith\s+\w+(\.\w+)*\s*;/i, weight: 5, note: "with clause" },
      { regex: /\buse\s+\w+(\.\w+)*\s*;/i, weight: 4, note: "use clause" },
      { regex: /\bsubtype\s+\w+\s+is\b/i, weight: 6, note: "subtype declaration" },
    ],
  },
  {
    language: "Java",
    patterns: [
      { regex: /\bpublic\s+class\s+\w+/i, weight: 6, note: "public class" },
      { regex: /\bpublic\s+static\s+void\s+main\s*\(/i, weight: 10, note: "main method" },
      { regex: /\bSystem\.out\.println\s*\(/i, weight: 5, note: "System.out.println" },
      { regex: /\bimport\s+java\./i, weight: 7, note: "import java." },
      { regex: /\bpackage\s+\w+(\.\w+)*\s*;/i, weight: 5, note: "package declaration" },
      { regex: /@Override\b/i, weight: 4, note: "@Override annotation" },
    ],
  },
  {
    language: "C",
    patterns: [
      { regex: /\b#include\s*<\w+\.h>/i, weight: 7, note: "#include <*.h>" },
      { regex: /\bint\s+main\s*\(\s*(void|int\s+argc)/i, weight: 8, note: "int main()" },
      { regex: /\bprintf\s*\(/i, weight: 4, note: "printf" },
      { regex: /\bmalloc\s*\(/i, weight: 4, note: "malloc" },
      { regex: /\bstruct\s+\w+\s*\{/i, weight: 3, note: "struct" },
      { regex: /\btypedef\s+(struct|enum)/i, weight: 3, note: "typedef struct/enum" },
    ],
  },
  {
    language: "C++",
    patterns: [
      { regex: /\b#include\s*<iostream>/i, weight: 9, note: "<iostream>" },
      { regex: /\bstd::\w+/i, weight: 7, note: "std:: namespace" },
      { regex: /\busing\s+namespace\s+std\b/i, weight: 7, note: "using namespace std" },
      { regex: /\btemplate\s*<\s*(typename|class)/i, weight: 7, note: "template<>" },
      { regex: /\bclass\s+\w+\s*(:\s*(public|protected|private))?/i, weight: 4, note: "class declaration" },
    ],
  },
  {
    language: "Pascal",
    patterns: [
      { regex: /\bprogram\s+\w+\s*;/i, weight: 9, note: "program ... ;" },
      { regex: /\bbegin\b[\s\S]{0,300}\bend\s*\./i, weight: 7, note: "begin ... end." },
      { regex: /\bprocedure\s+\w+\s*[(;]/i, weight: 5, note: "procedure" },
      { regex: /\bfunction\s+\w+\s*[(:]/i, weight: 5, note: "function" },
      { regex: /\bwriteln\s*\(/i, weight: 5, note: "writeln" },
    ],
  },
  {
    language: "BASIC",
    patterns: [
      { regex: /^\s*\d+\s+(PRINT|REM|LET|FOR|NEXT|GOTO|GOSUB)/im, weight: 9, note: "line-numbered BASIC" },
      { regex: /\bDEFINT\s+[A-Z]/i, weight: 6, note: "DEFINT (QBasic/GW-BASIC)" },
      { regex: /\bGOSUB\s+\d+/i, weight: 6, note: "GOSUB" },
      { regex: /\bDIM\s+\w+\s*\(/i, weight: 2, note: "DIM" },
    ],
  },
  {
    language: "Assembler",
    patterns: [
      { regex: /^\s*MOV\s+\w+\s*,\s*\w+/im, weight: 4, note: "MOV instruction" },
      { regex: /^\s*\.section\b/im, weight: 6, note: ".section" },
      { regex: /^\s*\.globl\s+\w+/im, weight: 6, note: ".globl" },
      { regex: /^\s*[A-Z][A-Z0-9]*\s+DS\s+\w+/im, weight: 8, note: "IBM ASM DS" },
      { regex: /^\s*[A-Z][A-Z0-9]*\s+DC\s+/im, weight: 8, note: "IBM ASM DC" },
    ],
  },
];

export function detectLanguage(code: string): LanguageDetectionResult {
  const scores = new Map<DetectedLanguage, { score: number; evidence: string[] }>();

  for (const rule of RULES) {
    let total = 0;
    const evidence: string[] = [];
    for (const p of rule.patterns) {
      const matches = code.match(p.regex);
      if (matches) {
        total += p.weight;
        evidence.push(p.note);
      }
    }
    if (total > 0) scores.set(rule.language, { score: total, evidence });
  }

  if (scores.size === 0) {
    return { language: "Unknown", confidence: 0, evidence: [], candidates: [] };
  }

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1].score - a[1].score);
  const [topLang, topData] = sorted[0];
  const totalScore = sorted.reduce((acc, [, v]) => acc + v.score, 0);
  const confidence = totalScore > 0 ? Math.min(1, topData.score / Math.max(totalScore * 0.6, 10)) : 0;

  return {
    language: topLang,
    confidence,
    evidence: topData.evidence,
    candidates: sorted.map(([lang, v]) => ({ language: lang, score: v.score })),
  };
}

export function countLines(code: string): number {
  if (!code) return 0;
  return code.split(/\r?\n/).length;
}

export function countNonBlankLines(code: string): number {
  if (!code) return 0;
  return code.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}
