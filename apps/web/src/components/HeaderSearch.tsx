"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normaliseName } from "@pns/sdk";

export function HeaderSearch() {
  const router = useRouter();
  const [raw, setRaw] = useState("");

  const submit = () => {
    if (!raw.trim()) return;
    try {
      const full = raw.includes(".") ? raw : `${raw}.pot`;
      router.push(`/search?q=${encodeURIComponent(normaliseName(full))}`);
      setRaw("");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="hidden md:flex flex-1 max-w-[520px] mx-6">
      <div className="pill-input flex items-center gap-2 px-5 py-2.5 rounded-full w-full text-[14px]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[var(--muted)]">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Search name, address…"
          className="flex-1 bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--muted)]"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
