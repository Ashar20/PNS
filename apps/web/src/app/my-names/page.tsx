"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useWallet } from "../../hooks/useWallet";
import { WalletConnect } from "../../components/WalletConnect";
import { namehash, normaliseName, recordExists, getOwner } from "@pns/sdk";

function NameRow({ name, ownerAddress }: { name: string; ownerAddress: string }) {
  const { client } = usePNSClient();

  const { data: owner } = useQuery({
    queryKey: ["owner", name],
    queryFn: async () => {
      if (!client) return null;
      const node = namehash(normaliseName(name));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      return getOwner(client.api, client.addresses.registry, abis.registry, node, caller);
    },
    enabled: !!client,
  });

  const isOwned = owner && owner.toLowerCase() === ownerAddress.toLowerCase();

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-neutral-100">{name}</p>
        {isOwned !== undefined && (
          <p className={`text-xs mt-0.5 ${isOwned ? "text-green-400" : "text-red-400"}`}>
            {isOwned ? "You own this" : "Not owned by you"}
          </p>
        )}
      </div>
      <Link
        href={`/${name}`}
        className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-medium rounded-xl transition-colors"
      >
        View Profile
      </Link>
    </div>
  );
}

function LookupForm({ ownerAddress }: { ownerAddress: string }) {
  const { client } = usePNSClient();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const { data: exists, isLoading } = useQuery({
    queryKey: ["lookup", query],
    queryFn: async () => {
      if (!client || !query) return null;
      const name = query.endsWith(".pot") ? query : `${query}.pot`;
      const node = namehash(normaliseName(name));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      const found = await recordExists(client.api, client.addresses.registry, abis.registry, node, caller);
      if (!found) return { name, found: false, isYours: false };
      const owner = await getOwner(client.api, client.addresses.registry, abis.registry, node, caller);
      const isYours = !!owner && owner.toLowerCase() === ownerAddress.toLowerCase();
      return { name, found: true, isYours };
    },
    enabled: !!client && !!query,
  });

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-neutral-200">Look up a name</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(input.trim())}
          placeholder="alice or alice.pot"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={() => setQuery(input.trim())}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Check
        </button>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Checking…</p>}

      {exists && !isLoading && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-100">{exists.name}</p>
            {!exists.found ? (
              <p className="text-xs mt-0.5 text-neutral-400">Not registered</p>
            ) : exists.isYours ? (
              <p className="text-xs mt-0.5 text-green-400">You own this</p>
            ) : (
              <p className="text-xs mt-0.5 text-neutral-400">Registered (not yours)</p>
            )}
          </div>
          {exists.found ? (
            <Link
              href={`/${exists.name}`}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-medium rounded-xl transition-colors"
            >
              View Profile
            </Link>
          ) : (
            <Link
              href={`/claim/${exists.name.replace(/\.pot$/, "")}`}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Claim
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function MyNamesInner({ address }: { address: string }) {
  const { client } = usePNSClient();

  const { data: primaryName, isLoading: loadingPrimary } = useQuery({
    queryKey: ["primary-name", address],
    queryFn: async () => {
      if (!client) return null;
      return client.resolveAddress(address);
    },
    enabled: !!client,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-200">Primary name</h3>
        {loadingPrimary ? (
          <p className="text-sm text-neutral-500">Looking up primary name…</p>
        ) : primaryName ? (
          <NameRow name={primaryName} ownerAddress={address} />
        ) : (
          <p className="text-sm text-neutral-400">
            No primary name set.{" "}
            <Link href="/search" className="text-violet-400 hover:text-violet-300 underline">
              Claim a name
            </Link>{" "}
            to get started.
          </p>
        )}
      </div>

      <hr className="border-neutral-800" />

      <LookupForm ownerAddress={address} />
    </div>
  );
}

export default function MyNamesPage() {
  const { selected } = useWallet();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-neutral-100">My Names</h2>

      {!selected ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Connect your wallet to see your names.</p>
          <WalletConnect />
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-500 font-mono">
            {selected.name && <span className="text-neutral-300">{selected.name} · </span>}
            {selected.address}
            {selected.source === "dev" && (
              <span className="ml-2 text-xs text-violet-400">(dev)</span>
            )}
          </p>
          <MyNamesInner address={selected.address} />
        </>
      )}
    </div>
  );
}
