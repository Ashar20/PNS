"use client";

import { useState, useEffect } from "react";
import { normaliseName } from "@pns/sdk";
import { NameResultCard } from "./NameResultCard";

export function HomeSearch() {
  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Debounce typing → normalized query
  useEffect(() => {
    if (!raw.trim()) {
      setDebounced("");
      setErr(null);
      return;
    }
    const t = setTimeout(() => {
      try {
        const full = raw.includes(".") ? raw : `${raw}.pot`;
        setDebounced(normaliseName(full));
        setErr(null);
      } catch (e) {
        setErr(String(e).replace("Error: ", ""));
        setDebounced("");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [raw]);

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <div className="pill-input flex items-center gap-3 px-6 py-5 rounded-[28px] text-[22px]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-[var(--accent)]">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder=".pot"
          className="flex-1 bg-transparent text-[var(--accent-text)] placeholder:text-[var(--accent)]/55 outline-none font-medium"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
        />
      </div>

      {/* Inline status / helper text */}
      <p className="text-center mt-4 text-[14px] text-[var(--accent)] min-h-[20px]">
        {err
          ? <span className="text-[var(--error)]">{err}</span>
          : !raw
          ? <>Start typing to check if your perfect name is available <span className="inline-block ml-0.5">⌕</span></>
          : !debounced
          ? <span className="text-[var(--muted)]">…</span>
          : <>Showing result for <strong className="font-semibold">{debounced}</strong></>}
      </p>

      {/* Inline live result */}
      {debounced && (
        <div className="mt-6">
          <NameResultCard query={debounced} />
        </div>
      )}
    </div>
  );
}
