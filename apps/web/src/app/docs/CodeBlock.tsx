"use client";

import { useState } from "react";

/**
 * Dark code surface for the docs. Light page, dark code — the usual developer-docs
 * contrast. Copy button reveals on hover; confirms inline for 1.2s.
 */
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
    <div className="group relative my-5 rounded-[14px] overflow-hidden border border-[#1d2b38] bg-[#0E1A26]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.07]">
        <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/40">
          {filename ?? lang}
        </span>
        <button
          onClick={copy}
          className="font-mono text-[11px] text-white/45 hover:text-white/90 transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-[1.65]">
        <code className="font-mono text-[#D6E4EE] whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
