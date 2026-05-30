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
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-[var(--text)]">{name}</p>
        {isOwned !== undefined && (
          <p className={`text-xs mt-0.5 ${isOwned ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
            {isOwned ? "You own this" : "Not owned by you"}
          </p>
        )}
      </div>
      <Link
        href={`/${name}`}
        className="px-4 py-2 bg-[var(--paper)] hover:bg-[var(--paper)] text-[var(--text)] text-sm font-medium rounded-xl transition-colors"
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
      <h3 className="text-lg font-semibold text-[var(--text)]">Look up a name</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQuery(input.trim())}
          placeholder="alice or alice.pot"
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-neutral-500 focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => setQuery(input.trim())}
          className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-xl transition-colors"
        >
          Check
        </button>
      </div>

      {isLoading && <p className="text-sm text-[var(--muted)]">Checking…</p>}

      {exists && !isLoading && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--text)]">{exists.name}</p>
            {!exists.found ? (
              <p className="text-xs mt-0.5 text-[var(--muted)]">Not registered</p>
            ) : exists.isYours ? (
              <p className="text-xs mt-0.5 text-[var(--success)]">You own this</p>
            ) : (
              <p className="text-xs mt-0.5 text-[var(--muted)]">Registered (not yours)</p>
            )}
          </div>
          {exists.found ? (
            <Link
              href={`/${exists.name}`}
              className="px-4 py-2 bg-[var(--paper)] hover:bg-[var(--paper)] text-[var(--text)] text-sm font-medium rounded-xl transition-colors"
            >
              View Profile
            </Link>
          ) : (
            <Link
              href={`/search?q=${encodeURIComponent(exists.name)}`}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-xl transition-colors"
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
        <h3 className="text-lg font-semibold text-[var(--text)]">Primary name</h3>
        {loadingPrimary ? (
          <p className="text-sm text-[var(--muted)]">Looking up primary name…</p>
        ) : primaryName ? (
          <NameRow name={primaryName} ownerAddress={address} />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No primary name set.{" "}
            <Link href="/search" className="text-[var(--accent)] hover:text-[var(--accent)] underline">
              Claim a name
            </Link>{" "}
            to get started.
          </p>
        )}
      </div>

      <hr className="border-[var(--border)]" />

      <LookupForm ownerAddress={address} />
    </div>
  );
}

export default function MyNamesPage() {
  const { selected } = useWallet();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">My Names</h2>

      {!selected ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Connect your wallet to see your names.</p>
          <WalletConnect />
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)] font-mono">
            {selected.name && <span className="text-[var(--text-2)]">{selected.name} · </span>}
            {selected.address}
            {selected.source === "dev" && (
              <span className="ml-2 text-xs text-[var(--accent)]">(dev)</span>
            )}
          </p>
          <MyNamesInner address={selected.address} />
        </>
      )}
    </div>
  );
}
