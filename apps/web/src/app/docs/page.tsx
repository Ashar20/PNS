"use client";

import { useState, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * In-app developer docs for @pns/sdk — the ENS-shaped TypeScript SDK for Portaldot.
 * Three-column docs layout: grouped sidebar · content · "on this page" rail.
 * Reference uses parameter tables (name · type · description) rather than prose,
 * with clear section dividers and a generous type scale.
 */

/* ── presentational atoms ─────────────────────────────────────────────────── */

function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[var(--text)] font-semibold tracking-[-0.025em] text-[42px] leading-[1.05]">
      {children}
    </h1>
  );
}

/** Section heading with a hairline divider above it for clear separation. */
function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="group mt-20 pt-10 border-t border-[var(--border)] mb-2 text-[var(--text)] font-semibold tracking-[-0.01em] text-[24px] leading-tight scroll-mt-28 flex items-center gap-2"
    >
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 text-[var(--accent)] text-[18px] transition-opacity no-underline"
        aria-label="Link to section"
      >
        #
      </a>
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[var(--text-2)] text-[16px] leading-[1.8] max-w-[680px]">{children}</p>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-[var(--text-2)] text-[20px] leading-[1.6] max-w-[700px]">{children}</p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.86em] text-[var(--accent-text)] bg-[var(--accent-soft)] rounded-[6px] px-1.5 py-0.5">
      {children}
    </code>
  );
}

function Callout({ tone = "note", children }: { tone?: "note" | "tip"; children: ReactNode }) {
  const map = {
    note: { bar: "var(--accent)", bg: "var(--accent-soft)", ink: "var(--accent-text)", label: "Note" },
    tip: { bar: "var(--green-ink)", bg: "var(--green-tint)", ink: "var(--green-ink)", label: "Tip" },
  } as const;
  const t = map[tone];
  return (
    <div className="mt-6 rounded-[12px] px-5 py-4 max-w-[680px]" style={{ background: t.bg, borderLeft: `3px solid ${t.bar}` }}>
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase mb-1.5" style={{ color: t.ink }}>
        {t.label}
      </p>
      <div className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        {children}
      </div>
    </div>
  );
}

type Param = { name: string; type: string; desc: string; optional?: boolean };

/** Parameter table — clearer than inline prose for an API reference. */
function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="mt-4 rounded-[10px] border border-[var(--border)] overflow-hidden">
      <div className="grid grid-cols-[180px_1fr] bg-[var(--paper)] px-4 py-2 border-b border-[var(--border)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">
        <span>Parameter</span>
        <span>Description</span>
      </div>
      {params.map((p, i) => (
        <div
          key={p.name}
          className="grid grid-cols-[180px_1fr] px-4 py-3 bg-[var(--surface)]"
          style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
        >
          <div className="pr-3">
            <span className="font-mono text-[13px] text-[var(--accent-text)]">{p.name}</span>
            {p.optional && <span className="ml-1.5 text-[11px] text-[var(--muted)]">opt</span>}
            <span className="block font-mono text-[11px] text-[var(--muted)] mt-0.5">{p.type}</span>
          </div>
          <span className="text-[14px] text-[var(--text-2)] leading-relaxed">{p.desc}</span>
        </div>
      ))}
    </div>
  );
}

/** A method reference block: name · returns · one-line summary · optional param table. */
function Method({
  name,
  returns,
  desc,
  params,
}: {
  name: string;
  returns: string;
  desc: ReactNode;
  params?: Param[];
}) {
  return (
    <div className="mt-8 max-w-[720px]">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-[15.5px] font-semibold text-[var(--accent)]">{name}</span>
        <span className="font-mono text-[13px] text-[var(--muted)]">→ {returns}</span>
      </div>
      <p className="mt-2.5 text-[var(--text-2)] text-[15px] leading-relaxed">{desc}</p>
      {params && params.length > 0 && <ParamTable params={params} />}
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
    <div className="mt-7 rounded-[14px] border border-[var(--border)] overflow-hidden max-w-[760px]">
      <div className="grid grid-cols-[140px_1fr_1fr] px-5 py-2.5 bg-[var(--paper)] border-b border-[var(--border)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)]">
        <span>Task</span>
        <span>ENS (ens.js)</span>
        <span className="text-[var(--accent-text)]">PNS (@pns/sdk)</span>
      </div>
      {rows.map(([task, ens, pns], i) => (
        <div
          key={task}
          className="grid grid-cols-[140px_1fr_1fr] px-5 py-3 items-center text-[12.5px] bg-[var(--surface)]"
          style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
        >
          <span className="text-[var(--text)] font-medium">{task}</span>
          <span className="font-mono text-[var(--muted)]">{ens}</span>
          <span className="font-mono text-[var(--accent-text)]">{pns}</span>
        </div>
      ))}
    </div>
  );
}

/* ── sections ─────────────────────────────────────────────────────────────── */

type TocItem = { id: string; label: string };
type Section = { id: string; group: string; label: string; toc: TocItem[]; render: () => ReactNode };

const SECTIONS: Section[] = [
  {
    id: "introduction",
    group: "Getting Started",
    label: "Introduction",
    toc: [
      { id: "drop-in", label: "Drop-in for ENS devs" },
      { id: "what-you-get", label: "What you get" },
    ],
    render: () => (
      <div>
        <H1>
          An ENS-shaped SDK,{" "}
          <span className="serif-italic text-[var(--accent)]">Substrate-powered.</span>
        </H1>
        <Lead>
          <Code>@pns/sdk</Code> is a typed TypeScript client for the Portaldot Name
          Service. If you&rsquo;ve used <Code>ens.js</Code>, the surface feels familiar —{" "}
          <Code>namehash</Code>, resolution, reverse lookup, text records, registration.
          The engine underneath is different: ink! contracts for the name graph, composed
          with Portaldot&rsquo;s native pallets via <Code>utility.batchAll</Code>.
        </Lead>

        <H2 id="drop-in">Drop-in for ENS developers</H2>
        <P>The mental model maps one-to-one:</P>
        <ParityTable />
        <Callout tone="tip">
          Already wrote an ENS integration? Swap <Code>provider.resolveName</Code> for{" "}
          <Code>pns.resolveName</Code> and you&rsquo;re most of the way there.
        </Callout>

        <H2 id="what-you-get">What you get</H2>
        <P>
          A single <Code>PNSClient</Code> for resolution, registration, communities,
          attestations, identity, and bounties — plus standalone <Code>namehash</Code>{" "}
          utilities and composable flow builders. Built on <Code>@polkadot/api</Code>; runs
          in the browser and in Node.
        </P>
      </div>
    ),
  },

  {
    id: "installation",
    group: "Getting Started",
    label: "Installation",
    toc: [{ id: "abis", label: "Contract ABIs" }],
    render: () => (
      <div>
        <H1>Installation</H1>
        <Lead>Install the SDK and its peer dependencies from the Polkadot JS ecosystem.</Lead>
        <CodeBlock
          lang="bash"
          code={`# pnpm
pnpm add @pns/sdk @polkadot/api @polkadot/api-contract @polkadot/util-crypto

# npm
npm install @pns/sdk @polkadot/api @polkadot/api-contract @polkadot/util-crypto`}
        />
        <P>
          The SDK is ESM-only and ships its own types. There is no EVM tooling in the stack
          — no ethers, viem, or Hardhat. PNS is ink! and Substrate end to end.
        </P>

        <H2 id="abis">Contract ABIs</H2>
        <P>
          Contract reads and writes need the deployed ABIs. Load them once and hand them to
          the client with <Code>setAbis()</Code>.
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
    toc: [],
    render: () => (
      <div>
        <H1>Quickstart</H1>
        <Lead>Connect a client, then resolve a name in three lines.</Lead>
        <CodeBlock
          filename="quickstart.ts"
          code={`import { PNSClient } from "@pns/sdk";

const pns = new PNSClient({
  wsEndpoint: "wss://mainnet.portaldot.io",
  addresses: {
    registry:         process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    resolver:         process.env.NEXT_PUBLIC_RESOLVER_ADDRESS,
    reverseRegistrar: process.env.NEXT_PUBLIC_REVERSE_ADDRESS,
    registrar:        process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS,
    attestation:      process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS,
  },
});

await pns.connect();

const record = await pns.resolveName("leo.pot");
console.log(record.addr);         // 5GrwvaEF...
console.log(record.textRecords);  // { "com.twitter": "...", avatar: "..." }

await pns.disconnect();`}
        />
        <P>
          <Code>resolveName</Code> returns a <Code>ResolvedName</Code>: owner, resolver,
          address record, text records, contenthash, and expiry — everything to render a
          profile in one call.
        </P>
      </div>
    ),
  },

  {
    id: "client",
    group: "SDK",
    label: "PNSClient",
    toc: [
      { id: "resolution", label: "Resolution" },
      { id: "registration", label: "Registration" },
      { id: "communities", label: "Communities" },
      { id: "attestations", label: "Attestations" },
      { id: "identity-bounties", label: "Identity & Bounties" },
    ],
    render: () => (
      <div>
        <H1>PNSClient</H1>
        <Lead>
          The main entry point — one client covers resolution, registration, communities,
          attestations, identity, and bounties.
        </Lead>
        <CodeBlock
          code={`const client = new PNSClient({ wsEndpoint, addresses });
await client.connect();
client.setAbis(abis);`}
        />

        <H2 id="resolution">Resolution</H2>
        <Method
          name="resolveName(name)"
          returns="Promise<ResolvedName>"
          desc="Forward resolution. Owner, resolver, address, text records, contenthash, expiry."
          params={[{ name: "name", type: "string", desc: 'Full name, e.g. "leo.pot".' }]}
        />
        <Method
          name="resolveAddress(addr)"
          returns="Promise<string | null>"
          desc="Reverse lookup — the primary name set for an account, or null."
          params={[{ name: "addr", type: "string", desc: "SS58 account address." }]}
        />
        <Method
          name="getTextRecords(name)"
          returns="Promise<Record<string,string>>"
          desc="All key/value text records on the name's resolver."
          params={[{ name: "name", type: "string", desc: "Full name." }]}
        />
        <Method
          name="getContenthash(name)"
          returns="Promise<string | null>"
          desc="The contenthash record (CIDv1, etc.), if set."
          params={[{ name: "name", type: "string", desc: "Full name." }]}
        />

        <H2 id="registration">Registration</H2>
        <Method
          name="registerName(name, owner, signer, identityFields?)"
          returns="Promise<TxResult>"
          desc="Register a .pot name FCFS, paying the flat price in POT."
          params={[
            { name: "name", type: "string", desc: 'Name to register, e.g. "leo.pot".' },
            { name: "owner", type: "string", desc: "SS58 address that will own the name." },
            { name: "signer", type: "KeyringPair", desc: "Account that signs and pays in POT." },
            {
              name: "identityFields",
              type: "ProfileFields",
              optional: true,
              desc: "If given, batches identity.setIdentity so the name shows natively in wallets.",
            },
          ]}
        />

        <H2 id="communities">Communities</H2>
        <Method
          name="createCommunity(opts)"
          returns="Promise<CommunityHandle>"
          desc="Derive the multisig account, register the parent name to it, and wire up a CommunityRegistrar."
          params={[
            {
              name: "opts",
              type: "CreateCommunityOpts",
              desc: "parentLabel, signers[], threshold, openMembership, firstSigner.",
            },
          ]}
        />
        <Method
          name="issueSubname(opts)"
          returns="Promise<TxResult>"
          desc="The headline flow — one batchAll: subname + sub-identity + scoped proxy. See Flows."
          params={[{ name: "opts", type: "IssueSubnameOpts", desc: "parentName, label, member, role, signers, threshold." }]}
        />
        <Method
          name="revokeSubname(opts)"
          returns="Promise<TxResult>"
          desc="The reverse cascade — drops the subname, sub-identity, and proxy together."
          params={[{ name: "opts", type: "RevokeSubnameOpts", desc: "parentName, label, memberAccount, signers, threshold." }]}
        />
        <Method
          name="listMembers(parentName)"
          returns="Promise<Member[]>"
          desc="Every member of a community: label, account, role, full subname."
          params={[{ name: "parentName", type: "string", desc: 'e.g. "bandit-dao.pot".' }]}
        />

        <H2 id="attestations">Attestations</H2>
        <Method
          name="attest(opts)"
          returns="Promise<{ id } & TxResult>"
          desc="Issue a peer attestation (any name about any name) under a schema string."
          params={[{ name: "opts", type: "AttestOpts", desc: "issuerName, subjectName, schema, payload, signer." }]}
        />
        <Method
          name="listAttestationsForSubject(name, schema?)"
          returns="Promise<AttestationRecord[]>"
          desc="All attestations about a subject, optionally filtered by schema."
          params={[
            { name: "name", type: "string", desc: "Subject name." },
            { name: "schema", type: "string", optional: true, desc: 'e.g. "endorsement.skill".' },
          ]}
        />

        <H2 id="identity-bounties">Identity & Bounties</H2>
        <Method
          name="setProfile(name, fields, signer)"
          returns="Promise<TxResult>"
          desc="Write native pallet_identity fields (display, web, twitter, …)."
          params={[
            { name: "name", type: "string", desc: "The name being edited." },
            { name: "fields", type: "ProfileFields", desc: "Identity fields to set." },
            { name: "signer", type: "KeyringPair", desc: "Owner account." },
          ]}
        />
        <Method
          name="provideJudgement(regIndex, target, judgement, hash, signer)"
          returns="Promise<TxResult>"
          desc="A community registrar marks a member Reasonable or KnownGood — the verified badge."
          params={[
            { name: "regIndex", type: "number", desc: "Registrar index." },
            { name: "target", type: "string", desc: "Account being judged." },
            { name: "judgement", type: '"Reasonable" | "KnownGood"', desc: "The judgement level." },
            { name: "hash", type: "Uint8Array", desc: "Identity hash being judged." },
            { name: "signer", type: "KeyringPair", desc: "The registrar account." },
          ]}
        />
        <Method
          name="postBounty(opts) · claimBounty(opts)"
          returns="Promise<TxResult>"
          desc="Open a treasury bounty; on claim, the bounty id is written as a contribution.<id> text record on the contributor's subname."
          params={[
            { name: "PostBountyOpts", type: "value, description, signer", desc: "Propose a bounty." },
            { name: "ClaimBountyOpts", type: "bountyId, subnameName, description, signer", desc: "Claim it + record the contribution." },
          ]}
        />
      </div>
    ),
  },

  {
    id: "flows",
    group: "SDK",
    label: "Flows",
    toc: [
      { id: "claimsubname", label: "claimSubname" },
      { id: "other-flows", label: "Other flows" },
      { id: "role-proxy", label: "Role → proxy" },
    ],
    render: () => (
      <div>
        <H1>Flows</H1>
        <Lead>
          Flows are composable extrinsic builders. The signature flow —{" "}
          <span className="serif-italic text-[var(--accent)]">claimSubname</span> — is what
          makes a name a community.
        </Lead>

        <H2 id="claimsubname">claimSubname — one tx, three primitives</H2>
        <P>
          Issuing a subname is a single <Code>utility.batchAll</Code>, signed by the
          community multisig via <Code>multisig.asMulti</Code>. All three calls land
          atomically, or none do.
        </P>
        <CodeBlock
          filename="claim-subname.ts"
          code={`const calls = [
  // 1 - contract: write the name in the Registry
  contracts.call(communityRegistrar.issue_subname(label, member, role)),

  // 2 - pallet_identity: sub-identity appears in every wallet
  api.tx.identity.setSubs([[member, { Raw: stringToU8a(label) }]]),

  // 3 - pallet_proxy: grant the scoped role (native RBAC)
  api.tx.proxy.addProxy(member, roleToProxyType(role), 0),
];

const batch   = api.tx.utility.batchAll(calls);
const wrapped = api.tx.multisig.asMulti(threshold, otherSignatories, null, batch, weight);

await client.issueSubname(opts); // builds and signs the above`}
        />
        <Callout tone="note">
          After it confirms you can verify all three independently: the contract lists the
          member, <Code>identity.subsOf</Code> shows the sub-identity, and{" "}
          <Code>proxy.proxies</Code> shows the granted proxy.
        </Callout>

        <H2 id="other-flows">Other flows</H2>
        <Method
          name="registerName(api, opts)"
          returns="Promise<TxResult>"
          desc="Register a .pot name and point its resolver, optionally batching setIdentity. Also exposed as buildRegisterNameTx."
        />
        <Method
          name="attestFlow(api, addr, abi, opts)"
          returns="Promise<TxResult & { id }>"
          desc="Normalises issuer/subject names to nodes and submits the attestation."
        />
        <Method
          name="saveProfile(api, opts)"
          returns="Promise<TxResult & { txCount }>"
          desc="Diffs changed records and writes only what changed. Pair with diffRecords(previous, next)."
        />

        <H2 id="role-proxy">Role → proxy mapping</H2>
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
    toc: [],
    render: () => (
      <div>
        <H1>Namehash</H1>
        <Lead>
          ENS-compatible namehashing, exported standalone. Keccak256 over normalised,
          dot-separated labels — the exact algorithm ENS uses.
        </Lead>
        <CodeBlock
          code={`import { namehash, namehashHex, labelHash, normaliseName } from "@pns/sdk";

namehash("alice.bandit-dao.pot");  // Uint8Array(32)
namehashHex("leo.pot");            // "0x..." hex string
labelHash("leo");                  // Uint8Array(32) - keccak256 of one label
normaliseName("Leo.POT");          // "leo.pot" - UTS46 lowercase`}
        />
        <Method name="namehash(name)" returns="Uint8Array" desc="The 32-byte node identifier. Empty name returns the zero node." params={[{ name: "name", type: "string", desc: "Full name." }]} />
        <Method name="namehashHex(name)" returns="string" desc="Same node, as a 0x hex string." params={[{ name: "name", type: "string", desc: "Full name." }]} />
        <Method name="labelHash(label)" returns="Uint8Array" desc="Keccak256 of a single label — used by the registrar for FCFS registration." params={[{ name: "label", type: "string", desc: "A single label, e.g. \"leo\"." }]} />
        <Method name="normaliseName(name) · normaliseLabel(label)" returns="string" desc="UTS46 normalisation. Always normalise before hashing or comparing." />
        <Callout tone="note">
          Normalisation happens in the SDK; contracts assume lowercase ASCII. The v1
          normaliser lowercases and applies NFKC — see the README for documented
          simplifications.
        </Callout>
      </div>
    ),
  },

  {
    id: "contracts",
    group: "Reference",
    label: "Contracts & addresses",
    toc: [
      { id: "suite", label: "The contract suite" },
      { id: "addresses", label: "Configuring addresses" },
      { id: "constants", label: "Chain constants" },
    ],
    render: () => (
      <div>
        <H1>Contracts & addresses</H1>
        <Lead>
          Six ink! 5 contracts hold the name graph. Addresses are environment-driven, so
          the same SDK targets a local node or Portaldot mainnet without code changes.
        </Lead>

        <H2 id="suite">The contract suite</H2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[700px]">
          {[
            ["Registry", "Ownership + resolver pointers — the source of truth."],
            ["PublicResolver", "Addr, text, and contenthash records."],
            ["ReverseRegistrar", "Primary-name (reverse) resolution."],
            ["Registrar", "Owns the .pot TLD; FCFS registration."],
            ["CommunityRegistrar", "Per-community subname issuance & roles."],
            ["Attestation", "Peer attestation graph, indexed by subject & issuer."],
          ].map(([name, desc]) => (
            <div key={name} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
              <p className="font-mono text-[var(--accent)] text-[14px]">{name}</p>
              <p className="mt-1.5 text-[var(--text-2)] text-[13px] leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        <H2 id="addresses">Configuring addresses</H2>
        <P>
          The client takes a <Code>ContractAddresses</Code> object. In the web app these
          come from <Code>NEXT_PUBLIC_*_ADDRESS</Code> env vars written by the deploy
          script. Per-community <Code>CommunityRegistrar</Code> addresses are resolved at
          runtime, not pinned here.
        </P>
        <CodeBlock
          filename=".env"
          lang="bash"
          code={`NEXT_PUBLIC_WS_ENDPOINT=wss://mainnet.portaldot.io
NEXT_PUBLIC_REGISTRY_ADDRESS=5Fqv...
NEXT_PUBLIC_RESOLVER_ADDRESS=5Etz...
NEXT_PUBLIC_REVERSE_ADDRESS=5EaJ...
NEXT_PUBLIC_REGISTRAR_ADDRESS=5Fwo...
NEXT_PUBLIC_ATTESTATION_ADDRESS=5EnP...`}
        />

        <H2 id="constants">Chain constants</H2>
        <P>
          Re-exported from the SDK: token is <Code>POT</Code> (14 decimals), SS58 format{" "}
          <Code>42</Code>, flat <Code>REGISTRATION_PRICE</Code>, and well-known{" "}
          <Code>TEXT_KEYS</Code> / <Code>SCHEMAS</Code> maps.
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
  const idx = Math.max(0, SECTIONS.findIndex((s) => s.id === active));
  const section = SECTIONS[idx];
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;

  function goto(id: string) {
    setActive(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_180px] gap-x-12 py-10">
      {/* sidebar */}
      <aside className="lg:sticky lg:top-24 self-start">
        <div className="flex items-baseline justify-between mb-7">
          <p className="font-mono text-[13px] tracking-[0.16em] uppercase text-[var(--text)]">Docs</p>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
            @pns/sdk
          </span>
        </div>
        <nav className="space-y-7">
          {GROUPS.map((g, gi) => (
            <div key={g}>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] mb-2.5 flex items-center gap-2">
                <span className="text-[var(--border-strong)]">{String(gi + 1).padStart(2, "0")}</span>
                {g}
              </p>
              <ul className="space-y-0.5">
                {SECTIONS.filter((s) => s.group === g).map((s) => {
                  const on = s.id === active;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => goto(s.id)}
                        className="group relative w-full text-left pl-4 pr-3 py-1.5 rounded-[8px] text-[14px] transition-colors cursor-pointer"
                        style={{
                          background: on ? "var(--accent-soft)" : "transparent",
                          color: on ? "var(--accent-text)" : "var(--text-2)",
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        <span
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all"
                          style={{ height: on ? 16 : 0, background: "var(--accent)" }}
                        />
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
      <article key={active} className="deck-fade min-w-0 max-w-[820px] pb-10">
        <p className="font-mono text-[12px] text-[var(--muted)] mb-7">
          Docs <span className="text-[var(--border-strong)]">/</span> {section.group}{" "}
          <span className="text-[var(--border-strong)]">/</span>{" "}
          <span className="text-[var(--text-2)]">{section.label}</span>
        </p>

        {section.render()}

        <div className="mt-20 pt-8 border-t border-[var(--border)] grid grid-cols-2 gap-4">
          {prev ? (
            <button
              onClick={() => goto(prev.id)}
              className="text-left rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              <span className="font-mono text-[11px] text-[var(--muted)]">← Previous</span>
              <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">{prev.label}</p>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              onClick={() => goto(next.id)}
              className="text-right rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              <span className="font-mono text-[11px] text-[var(--muted)]">Next →</span>
              <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">{next.label}</p>
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className="mt-8 flex items-center justify-between text-[12px] text-[var(--muted)] font-mono">
          <span>PNS — Portaldot Name Service</span>
          <a href="/deck" className="hover:text-[var(--text)] transition-colors">view the pitch →</a>
        </div>
      </article>

      {/* on this page */}
      <aside className="hidden xl:block sticky top-24 self-start">
        {section.toc.length > 0 && (
          <div>
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] mb-3">
              On this page
            </p>
            <ul className="space-y-2 border-l border-[var(--border)]">
              {section.toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="block -ml-px pl-3 border-l-2 border-transparent text-[13px] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors leading-snug"
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
