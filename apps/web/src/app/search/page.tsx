"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { NameInput } from "../../components/NameInput";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useState, Suspense } from "react";
import Link from "next/link";
import { namehash, normaliseName, recordExists } from "@pns/sdk";

function SearchResults({ query }: { query: string }) {
  const { client } = usePNSClient();
  const { data: exists, isLoading } = useQuery({
    queryKey: ["availability", query],
    queryFn: async () => {
      if (!client || !query) return false;
      const node = namehash(normaliseName(query));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      return recordExists(client.api, client.addresses.registry, abis.registry, node, caller);
    },
    enabled: !!client && !!query,
  });

  if (!query) return null;
  if (isLoading) return <div className="text-neutral-500 text-sm">Checking availability…</div>;

  const label = query.replace(/\.pot$/, "");
  const isAvailable = !exists;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-neutral-100">{query}</p>
          <p className={`text-sm mt-1 ${isAvailable ? "text-green-400" : "text-red-400"}`}>
            {isAvailable ? "Available" : "Already registered"}
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
