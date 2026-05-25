"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NameInput } from "../components/NameInput";

export default function LandingPage() {
  const router = useRouter();
  const [normalised, setNormalised] = useState("");

  const handleSearch = () => {
    if (!normalised) return;
    router.push(`/search?q=${encodeURIComponent(normalised)}`);
  };

  return (
    <div className="flex flex-col items-center gap-16 pt-16">
      {/* Hero */}
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
          A name is a community.
        </h1>
        <p className="text-neutral-400 text-lg leading-relaxed">
          ENS-shaped naming, ported faithfully to Portaldot&apos;s Substrate + ink! environment.
          One name, every coordination primitive: identity, roles, reputation, contributions.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl">
        <NameInput
          value=""
          onChange={(n) => setNormalised(n)}
          placeholder="find your name"
          suffix=".pot"
          className="text-xl"
        />
        <button
          onClick={handleSearch}
          disabled={!normalised}
          className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          Search
        </button>
      </div>

      {/* Pitch grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {[
          {
            icon: "◆",
            title: "ENS-shaped surface",
            body: "Registry, Resolver, ReverseRegistrar — the same mental model ENS users already know.",
          },
          {
            icon: "⬡",
            title: "Substrate-powered",
            body: "Sub-identities, proxies, bounties, and multisig all come from native Substrate pallets — zero extra contracts.",
          },
          {
            icon: "⊕",
            title: "Atomic membership",
            body: "One utility.batchAll issues a subname, sets a sub-identity, and grants a scoped proxy. All or nothing.",
          },
          {
            icon: "✦",
            title: "Onchain reputation",
            body: "Communities act as registrars. Judgements become badges. Peer attestations form a verifiable graph.",
          },
        ].map(({ icon, title, body }) => (
          <div
            key={title}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5"
          >
            <span className="text-2xl text-violet-400">{icon}</span>
            <h3 className="text-neutral-100 font-semibold mt-3 mb-2">{title}</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
