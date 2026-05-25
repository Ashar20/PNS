"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { NameInput } from "../../components/NameInput";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useState, Suspense } from "react";
import Link from "next/link";

function SearchResults({ query }: { query: string }) {
  const { client } = usePNSClient();
  const { data, isLoading } = useQuery({
    queryKey: ["availability", query],
    queryFn: async () => {
      if (!client || !query) return null;
      const resolved = await client.resolveName(query).catch(() => null);
      return resolved;
    },
    enabled: !!client && !!query,
  });

  if (!query) return null;
  if (isLoading) return <div className="text-neutral-500 text-sm">Checking availability…</div>;

  const label = query.replace(/\.pot$/, "");
  const isAvailable = !data?.owner || data.owner === "0x" + "00".repeat(32);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-neutral-100">{query}</p>
          <p className={`text-sm mt-1 ${isAvailable ? "text-green-400" : "text-red-400"}`}>
            {isAvailable ? "Available" : `Owned by ${data?.owner?.slice(0, 12)}…`}
          </p>
        </div>
        {isAvailable ? (
          <Link
            href={`/claim/${label}`}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
          >
            Claim
          </Link>
        ) : (
          <Link
            href={`/${query}`}
            className="px-5 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-medium rounded-xl transition-colors"
          >
            View Profile
          </Link>
        )}
      </div>
    </div>
  );
}

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-neutral-100">Search a name</h2>
      <NameInput
        value={initialQ}
        onChange={(n) => {
          setQuery(n);
          if (n) router.replace(`/search?q=${encodeURIComponent(n)}`, { scroll: false });
        }}
        placeholder="alice"
      />
      <SearchResults query={query} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-neutral-500 text-sm">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
