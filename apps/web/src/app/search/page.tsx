"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { NameInput } from "../../components/NameInput";
import { NameResultCard } from "../../components/NameResultCard";
import { useState, Suspense } from "react";

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);

  return (
    <div className="max-w-2xl mx-auto pt-6 space-y-6">
      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-[var(--text)] mb-1">
          Find a name
        </h2>
        <p className="text-[14px] text-[var(--muted)]">
          Names are first-come-first-served on the{" "}
          <code className="font-mono text-[var(--accent)]">.pot</code> TLD.
        </p>
      </div>
      <NameInput
        value={initialQ}
        onChange={(n) => {
          setQuery(n);
          if (n) router.replace(`/search?q=${encodeURIComponent(n)}`, { scroll: false });
        }}
        placeholder="alice"
        size="lg"
      />
      <NameResultCard query={query} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-20 text-center text-[14px] text-[var(--muted)]">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
