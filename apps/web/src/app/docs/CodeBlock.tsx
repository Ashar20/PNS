"use client";

import { useState, type ReactNode } from "react";

/**
 * Dark code surface with lightweight, dependency-free syntax highlighting.
 * Light page, dark code — the standard developer-docs contrast. A small regex
 * tokenizer colours comments / strings / numbers / types / calls / keywords;
 * good enough for the short snippets here without pulling in a highlighter lib.
 */

const KEYWORDS = new Set([
  "import", "from", "export", "const", "let", "var", "await", "async", "function",
  "return", "new", "if", "else", "for", "of", "in", "type", "interface", "class",
  "extends", "null", "true", "false", "void", "as", "default",
]);

// On #0E1A26 — all comfortably above 4.5:1.
const C = {
  comment: "#5E7486",
  string: "#E6C485",
  number: "#E59AB8",
  type: "#7FD1C8",
  fn: "#BFD8E8",
  keyword: "#6FB2E8",
  punct: "#8AA0B0",
};

function makeRe(lang: string): RegExp {
  const comment =
    lang === "bash" ? String.raw`#[^\n]*` : String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
  return new RegExp(
    [
      `(${comment})`,
      String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`,
      String.raw`(\b\d[\w.]*\b)`,
      String.raw`(\b[A-Z][A-Za-z0-9_]*\b)`,
      String.raw`([A-Za-z_$][\w$]*)(?=\s*\()`,
      String.raw`(\b[A-Za-z_$][\w$]*\b)`,
    ].join("|"),
    "g",
  );
}

function highlight(code: string, lang: string): ReactNode[] {
  const re = makeRe(lang);
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [full, comment, str, num, type, fn, ident] = m;
    let color: string | undefined;
    if (comment) color = C.comment;
    else if (str) color = C.string;
    else if (num) color = C.number;
    else if (type) color = C.type;
    else if (fn) color = KEYWORDS.has(fn) ? C.keyword : C.fn;
    else if (ident) color = KEYWORDS.has(ident) ? C.keyword : undefined;
    out.push(color ? <span key={key++} style={{ color }}>{full}</span> : full);
    last = re.lastIndex;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({
  code,
  lang = "ts",
  filename,
}: {
  code: string;
  lang?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div className="group relative my-5 rounded-[14px] overflow-hidden bg-[#0E1A26] ring-1 ring-[#1d2b38] shadow-[0_18px_40px_-24px_rgba(14,26,38,0.55)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="w-2.5 h-2.5 rounded-full bg-[#E0606A]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#E6C485]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#7FD1C8]/70" />
          </span>
          <span className="font-mono text-[11px] tracking-[0.1em] text-white/45">
            {filename ?? lang}
          </span>
        </div>
        <button
          onClick={copy}
          className="font-mono text-[11px] text-white/45 hover:text-white/90 transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-[1.7]">
        <code className="font-mono whitespace-pre" style={{ color: "#D6E4EE" }}>
          {highlight(code, lang)}
        </code>
      </pre>
    </div>
  );
}
