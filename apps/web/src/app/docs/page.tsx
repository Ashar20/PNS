"use client";

import { useState, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * In-app developer docs for @pns/sdk — the ENS-shaped TypeScript SDK for Portaldot.
 * Sidebar docs-site layout: grouped left nav, one section in the content pane.
 * Leads with ENS↔PNS parity (drop-in framing). All signatures mirror the real SDK.
 */

/* ── small presentational atoms ───────────────────────────────────────────── */

function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[var(--text)] font-semibold tracking-[-0.02em] text-[40px] leading-[1.05]">
      {children}
    </h1>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-14 mb-1 text-[var(--text)] font-semibold tracking-[-0.01em] text-[24px] scroll-mt-24">
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[var(--text-2)] text-[16px] leading-[1.7] max-w-[680px]">
      {children}
    </p>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[var(--text-2)] text-[19px] leading-[1.6] max-w-[700px]">
      {children}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.88em] text-[var(--accent-text)] bg-[var(--accent-soft)] rounded-[6px] px-1.5 py-0.5">
      {children}
    </code>
  );
}

function Method({
  sig,
  returns,
  children,
}: {
  sig: string;
  returns?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 border-l-2 border-[var(--border-strong)] pl-5">
      <p className="font-mono text-[14px] text-[var(--text)] break-words">
        <span className="text-[var(--accent)]">{sig}</span>
        {returns && <span className="text-[var(--muted)]"> → {returns}</span>}
      </p>
      <p className="mt-2 text-[var(--text-2)] text-[15px] leading-relaxed max-w-[660px]">
        {children}
      </p>
    </div>
  );
}

/* ── ENS ↔ PNS parity table ──────────────────────────────────────────────── */

function ParityTable() {
  const rows: [string, string, string][] = [
    ["Hash a name", "namehash(name)", "namehash(name)"],
    ["Resolve a name", "provider.resolveName(name)", "pns.resolveName(name)"],
    ["Reverse lookup", "provider.lookupAddress(addr)", "pns.resolveAddress(addr)"],
    ["Read text records", "resolver.getText(node, key)", "pns.getTextRecords(name)"],
    ["Register a name", "controller.register(...)", "pns.registerName(name, owner, signer)"],
    ["Issue a subname", "NameWrapper.setSubnodeRecord", "pns.issueSubname(opts)"],
    ["Attestation", "EAS.attest(...)", "pns.attest(opts)"],
  ];
  return (
    <div className="mt-7 card overflow-hidden">
      <div className="grid grid-cols-[150px_1fr_1fr] px-5 py-3 border-b border-[var(--border)] font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">
        <span>Task</span>
        <span>ENS (ens.js)</span>
        <span className="text-[var(--accent-text)]">PNS (@pns/sdk)</span>
      </div>
      {rows.map(([task, ens, pns], i) => (
        <div
          key={task}
          className="grid grid-cols-[150px_1fr_1fr] px-5 py-3 items-center text-[13px]"
          style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <span className="text-[var(--text)] font-medium font-sans">{task}</span>
          <span className="font-mono text-[var(--muted)]">{ens}</span>
          <span className="font-mono text-[var(--accent-text)]">{pns}</span>
        </div>
      ))}
    </div>
  );
}

/* ── section content ──────────────────────────────────────────────────────── */

type Section = { id: string; group: string; label: string; render: () => ReactNode };

const SECTIONS: Section[] = [
  {
    id: "introduction",
    group: "Getting Started",
    label: "Introduction",
    render: () => (
      <div>
        <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-[var(--accent-text)] mb-5">
          @pns/sdk
        </p>
        <H1>
          An ENS-shaped SDK,{" "}
          <span className="serif-italic text-[var(--accent)]">Substrate-powered.</span>
        </H1>
        <Lead>
          <Code>@pns/sdk</Code> is a typed TypeScript client for the Portaldot Name
          Service. If you&rsquo;ve used <Code>ens.js</Code> or <Code>@ensdomains</Code>,
          the surface will feel immediately familiar — <Code>namehash</Code>, name
          resolution, reverse lookup, text records, registration. The difference is what
          runs underneath: ink! contracts for the name graph, composed with Portaldot&rsquo;s
          native pallets via <Code>utility.batchAll</Code>.
        </Lead>

        <H2>Drop-in for ENS developers</H2>
        <P>
          The same mental model maps one-to-one. Where ENS leans on a constellation of
          third-party contracts (Safe, EAS, NameWrapper), PNS reaches straight for the
          chain&rsquo;s native pallets.
        </P>
        <ParityTable />

        <H2>What you get</H2>
        <P>
          A single <Code>PNSClient</Code> for resolution, registration, communities,
          attestations, identity, and bounties — plus standalone <Code>namehash</Code>{" "}
          utilities and composable flow builders. Built on <Code>@polkadot/api</Code> and{" "}
          <Code>@polkadot/api-contract</Code>; works in the browser and in Node.
        </P>
      </div>
    ),
  },

  {
    id: "installation",
    group: "Getting Started",
    label: "Installation",
    render: () => (
      <div>
        <H1>Installation</H1>
        <Lead>
          Install the SDK and its peer dependencies from the Polkadot JS ecosystem.
        </Lead>
        <CodeBlock
          lang="bash"
          code={`# pnpm
pnpm add @pns/sdk @polkadot/api @polkadot/api-contract @polkadot/util-crypto

# npm
npm install @pns/sdk @polkadot/api @polkadot/api-contract @polkadot/util-crypto`}
        />
        <P>
          The SDK is ESM-only and ships its own type definitions. No EVM tooling is
          required — there is no ethers, viem, or Hardhat in the stack. PNS is ink! and
          Substrate end to end.
        </P>
        <H2>Contract ABIs</H2>
        <P>
          Contract reads and writes need the deployed ABIs. Load them once and hand them
          to the client with <Code>setAbis()</Code> (the app keeps them in{" "}
          <Code>public/abis</Code>).
        </P>
        <CodeBlock
          code={`import registry from "./abis/registry.json";
import resolver from "./abis/resolver.json";
import registrar from "./abis/registrar.json";
import community from "./abis/community.json";
import attestation from "./abis/attestation.json";

client.setAbis({ registry, resolver, registrar, community, attestation });`}
        />
      </div>
    ),
  },

  {
    id: "quickstart",
    group: "Getting Started",
    label: "Quickstart",
    render: () => (
      <div>
        <H1>Quickstart</H1>
        <Lead>
          Connect a client, then resolve a name in three lines.
        </Lead>
        <CodeBlock
          filename="quickstart.ts"
          code={`import { PNSClient } from "@pns/sdk";

const pns = new PNSClient({
  wsEndpoint: "wss://mainnet.portaldot.io",
  addresses: {
    registry:         process.env.NEXT_PUBLIC_REGISTRY_ADDRESS!,
    resolver:         process.env.NEXT_PUBLIC_RESOLVER_ADDRESS!,
    reverseRegistrar: process.env.NEXT_PUBLIC_REVERSE_ADDRESS!,
    registrar:        process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS!,
    attestation:      process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS!,
  },
});

await pns.connect();

const record = await pns.resolveName("leo.pot");
console.log(record.addr);          // → 5GrwvaEF...
console.log(record.textRecords);   // → { "com.twitter": "...", avatar: "..." }

await pns.disconnect();`}
        />
        <P>
          <Code>resolveName</Code> returns a <Code>ResolvedName</Code>: owner, resolver,
          address record, all text records, contenthash, and expiry. Everything you need
          to render a profile in one call.
        </P>
      </div>
    ),
  },

  {
    id: "client",
    group: "SDK",
    label: "PNSClient",
    render: () => (
      <div>
        <H1>PNSClient</H1>
        <Lead>
          The main entry point. One client covers resolution, registration, communities,
          attestations, identity, and bounties.
        </Lead>
        <CodeBlock
          code={`const client = new PNSClient({ wsEndpoint, addresses });
await client.connect();
client.setAbis(abis);`}
        />

        <H2>Resolution</H2>
        <Method sig="resolveName(name: string)" returns="Promise<ResolvedName>">
          Forward resolution. Returns owner, resolver, <Code>addr</Code>, all text
          records, contenthash, and expiry.
        </Method>
        <Method sig="resolveAddress(addr: string)" returns="Promise<string | null>">
          Reverse lookup — the primary name set for an account, or <Code>null</Code>.
        </Method>
        <Method sig="getTextRecords(name: string)" returns="Promise<Record<string,string>>">
          All key/value text records on the name&rsquo;s resolver.
        </Method>
        <Method sig="getContenthash(name: string)" returns="Promise<string | null>">
          The contenthash record (CIDv1, etc.), if set.
        </Method>

        <H2>Registration</H2>
        <Method
          sig="registerName(name, owner, signer, identityFields?)"
          returns="Promise<TxResult>"
        >
          Register a <Code>.pot</Code> name FCFS, paying the flat price in POT. Optionally
          batches an <Code>identity.setIdentity</Code> so the name shows up natively in
          every Substrate wallet.
        </Method>

        <H2>Communities</H2>
        <Method sig="createCommunity(opts: CreateCommunityOpts)" returns="Promise<CommunityHandle>">
          Derive the multisig account, register the parent name to it, and wire up a{" "}
          <Code>CommunityRegistrar</Code>.
        </Method>
        <Method sig="issueSubname(opts: IssueSubnameOpts)" returns="Promise<TxResult>">
          The headline flow — see <Code>Flows</Code>. One <Code>batchAll</Code>: subname +
          sub-identity + scoped proxy.
        </Method>
        <Method sig="revokeSubname(opts: RevokeSubnameOpts)" returns="Promise<TxResult>">
          The reverse cascade — drops the subname, sub-identity, and proxy together.
        </Method>
        <Method sig="listMembers(parentName: string)" returns="Promise<Member[]>">
          Every member of a community, with label, account, role, and full subname.
        </Method>

        <H2>Attestations</H2>
        <Method sig="attest(opts: AttestOpts)" returns="Promise<{ id } & TxResult>">
          Issue a peer attestation (any name about any name) under a schema string.
        </Method>
        <Method
          sig="listAttestationsForSubject(name, schema?)"
          returns="Promise<AttestationRecord[]>"
        >
          All attestations about a subject, optionally filtered by schema.
        </Method>

        <H2>Identity & Bounties</H2>
        <Method sig="setProfile(name, fields, signer)" returns="Promise<TxResult>">
          Write native <Code>pallet_identity</Code> fields (display, web, twitter, …).
        </Method>
        <Method
          sig="provideJudgement(regIndex, target, judgement, hash, signer)"
          returns="Promise<TxResult>"
        >
          A community registrar marks a member <Code>Reasonable</Code> or{" "}
          <Code>KnownGood</Code> — the verified badge.
        </Method>
        <Method sig="postBounty(opts) · claimBounty(opts)" returns="Promise<TxResult>">
          Open a treasury bounty; on claim, the bounty id is written as a{" "}
          <Code>contribution.&lt;id&gt;</Code> text record on the contributor&rsquo;s
          subname.
        </Method>
      </div>
    ),
  },

  {
    id: "flows",
    group: "SDK",
    label: "Flows",
    render: () => (
      <div>
        <H1>Flows</H1>
        <Lead>
          Flows are composable extrinsic builders. The signature flow —{" "}
          <span className="serif-italic text-[var(--accent)]">claimSubname</span> — is
          what makes a name a community.
        </Lead>

        <H2>claimSubname — one tx, three primitives</H2>
        <P>
          Issuing a subname is a single <Code>utility.batchAll</Code>, signed by the
          community multisig via <Code>multisig.asMulti</Code>. All three calls land
          atomically, or none do.
        </P>
        <CodeBlock
          filename="claim-subname.ts"
          code={`const calls = [
  // 1 · contract — write the name in the Registry
  contracts.call(communityRegistrar.issue_subname(label, member, role)),

  // 2 · pallet_identity — sub-identity appears in every wallet
  api.tx.identity.setSubs([[member, { Raw: stringToU8a(label) }]]),

  // 3 · pallet_proxy — grant the scoped role (native RBAC)
  api.tx.proxy.addProxy(member, roleToProxyType(role), 0),
];

const batch   = api.tx.utility.batchAll(calls);
const wrapped = api.tx.multisig.asMulti(threshold, otherSignatories, null, batch, weight);

await client.issueSubname(opts); // builds + signs the above`}
        />
        <P>
          After it confirms you can independently verify all three: the contract lists the
          member, <Code>identity.subsOf</Code> shows the sub-identity, and{" "}
          <Code>proxy.proxies</Code> shows the granted proxy.
        </P>

        <H2>Other flows</H2>
        <Method sig="registerName(api, opts)" returns="Promise<TxResult>">
          Register a <Code>.pot</Code> name and point its resolver, optionally batching{" "}
          <Code>setIdentity</Code>. Also exposed as <Code>buildRegisterNameTx</Code>.
        </Method>
        <Method sig="attestFlow(api, addr, abi, opts)" returns="Promise<TxResult & { id }>">
          Normalises issuer/subject names to nodes and submits the attestation.
        </Method>
        <Method sig="saveProfile(api, opts)" returns="Promise<TxResult & { txCount }>">
          Diffs changed records and writes only what changed. Pair with{" "}
          <Code>diffRecords(previous, next)</Code>.
        </Method>

        <H2>Role → proxy mapping</H2>
        <P>The role string a community assigns maps to a native Substrate proxy type:</P>
        <div className="mt-5 flex flex-wrap gap-2 font-mono text-[13px]">
          {[
            "admin → Any",
            "treasurer → NonTransfer",
            "voter → Governance",
            "staker → Staking",
            "judge → IdentityJudgement",
          ].map((m) => (
            <span
              key={m}
              className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  {
    id: "namehash",
    group: "SDK",
    label: "Namehash",
    render: () => (
      <div>
        <H1>Namehash</H1>
        <Lead>
          ENS-compatible namehashing, exported standalone. Keccak256 over normalised,
          dot-separated labels — the exact algorithm ENS uses.
        </Lead>
        <CodeBlock
          code={`import { namehash, namehashHex, labelHash, normaliseName } from "@pns/sdk";

namehash("alice.bandit-dao.pot");   // Uint8Array(32)
namehashHex("leo.pot");             // "0x…"  (hex string)
labelHash("leo");                   // Uint8Array(32) — keccak256 of one label
normaliseName("Leo.POT");           // "leo.pot" — UTS46 lowercase`}
        />
        <Method sig="namehash(name: string)" returns="Uint8Array">
          The 32-byte node identifier. Empty name returns the zero node.
        </Method>
        <Method sig="namehashHex(name: string)" returns="string">
          Same, as a <Code>0x</Code> hex string.
        </Method>
        <Method sig="labelHash(label: string)" returns="Uint8Array">
          Keccak256 of a single label — used by the registrar for FCFS registration.
        </Method>
        <Method sig="normaliseName(name) · normaliseLabel(label)" returns="string">
          UTS46 normalisation. Always normalise before hashing or comparing.
        </Method>
        <P>
          Normalisation happens in the SDK; contracts assume lowercase ASCII input. The
          v1 normaliser lowercases and applies NFKC — see the README for the documented
          simplifications.
        </P>
      </div>
    ),
  },

  {
    id: "contracts",
    group: "Reference",
    label: "Contracts & addresses",
    render: () => (
      <div>
        <H1>Contracts & addresses</H1>
        <Lead>
          Six ink! 5 contracts hold the name graph. Addresses are environment-driven, so
          the same SDK targets a local node or Portaldot mainnet without code changes.
        </Lead>

        <H2>The contract suite</H2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["Registry", "Ownership + resolver pointers — the source of truth."],
            ["PublicResolver", "Addr, text, and contenthash records."],
            ["ReverseRegistrar", "Primary-name (reverse) resolution."],
            ["Registrar", "Owns the .pot TLD; FCFS registration."],
            ["CommunityRegistrar", "Per-community subname issuance & roles."],
            ["Attestation", "Peer attestation graph, indexed by subject & issuer."],
          ].map(([name, desc]) => (
            <div key={name} className="card px-5 py-4">
              <p className="font-mono text-[var(--accent)] text-[14px]">{name}</p>
              <p className="mt-1.5 text-[var(--text-2)] text-[13px] leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        <H2>Configuring addresses</H2>
        <P>
          The client takes a <Code>ContractAddresses</Code> object. In the web app these
          come from <Code>NEXT_PUBLIC_*_ADDRESS</Code> env vars, written by the deploy
          script. Per-community <Code>CommunityRegistrar</Code> addresses are resolved at
          runtime, not pinned here.
        </P>
        <CodeBlock
          filename=".env"
          lang="bash"
          code={`NEXT_PUBLIC_WS_ENDPOINT=wss://mainnet.portaldot.io
NEXT_PUBLIC_REGISTRY_ADDRESS=5Fqv…
NEXT_PUBLIC_RESOLVER_ADDRESS=5Etz…
NEXT_PUBLIC_REVERSE_ADDRESS=5EaJ…
NEXT_PUBLIC_REGISTRAR_ADDRESS=5Fwo…
NEXT_PUBLIC_ATTESTATION_ADDRESS=5EnP…`}
        />

        <H2>Chain constants</H2>
        <P>
          Re-exported from the SDK: token is <Code>POT</Code> (14 decimals), SS58 format{" "}
          <Code>42</Code>, flat registration price <Code>REGISTRATION_PRICE</Code>, and
          well-known <Code>TEXT_KEYS</Code> / <Code>SCHEMAS</Code> maps.
        </P>
        <CodeBlock
          code={`import { POT, SS58_FORMAT, TEXT_KEYS, SCHEMAS, ROLE_TO_PROXY_TYPE } from "@pns/sdk";

TEXT_KEYS.TWITTER;            // "com.twitter"
SCHEMAS.ENDORSEMENT_SKILL;    // "endorsement.skill"
ROLE_TO_PROXY_TYPE.treasurer; // "NonTransfer"`}
        />
      </div>
    ),
  },
];

const GROUPS = ["Getting Started", "SDK", "Reference"];

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [active, setActive] = useState("introduction");
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 py-10">
      {/* sidebar */}
      <aside className="lg:sticky lg:top-24 self-start">
        <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-[var(--text)] mb-1">
          Docs
        </p>
        <p className="text-[13px] text-[var(--muted)] mb-6">@pns/sdk reference</p>
        <nav className="space-y-6">
          {GROUPS.map((g) => (
            <div key={g}>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] mb-2">
                {g}
              </p>
              <ul className="space-y-0.5">
                {SECTIONS.filter((s) => s.group === g).map((s) => {
                  const on = s.id === active;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setActive(s.id)}
                        className="w-full text-left px-3 py-1.5 rounded-[8px] text-[14px] transition-colors cursor-pointer"
                        style={{
                          background: on ? "var(--accent-soft)" : "transparent",
                          color: on ? "var(--accent-text)" : "var(--text-2)",
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* content */}
      <article key={active} className="deck-fade min-w-0 max-w-[760px] pb-24">
        {section.render()}

        <div className="mt-16 pt-6 border-t border-[var(--border)] flex items-center justify-between text-[13px] text-[var(--muted)] font-mono">
          <span>PNS — Portaldot Name Service</span>
          <a href="/deck" className="hover:text-[var(--text)] transition-colors">
            view the pitch →
          </a>
        </div>
      </article>
    </div>
  );
}
