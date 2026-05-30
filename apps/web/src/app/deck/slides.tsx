/* PNS pitch deck — slide content. Pure presentational; rendered by /deck. */
import type { ReactNode } from "react";

export interface SlideDef {
  kicker: string; // shown top-left in mono
  render: () => ReactNode;
}

/* ── shared bits ──────────────────────────────────────────────────────────── */

function Eyebrow({ n, label }: { n: string; label: string }) {
  return (
    <p className="font-mono text-[12px] tracking-[0.22em] text-[var(--muted)] uppercase mb-6">
      <span className="text-[var(--accent)]">{n}</span> · {label}
    </p>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="px-3.5 py-2 rounded-full border border-[var(--border)] text-[var(--text-2)] font-mono text-[13px] bg-[var(--surface)]">
      {children}
    </span>
  );
}

function rise(delay: number): { style: React.CSSProperties; className: string } {
  return { className: "deck-rise", style: { animationDelay: `${delay}ms` } };
}

function FloatingCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white border border-black/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

/* The signature artifact: one batched extrinsic, three native primitives. */
function BatchAllCard() {
  const calls = [
    { tag: "contracts.call", desc: "CommunityRegistrar.issue_subname", note: "name graph" },
    { tag: "identity.setSubs", desc: "alice.bandit-dao sub-identity", note: "shows in every wallet" },
    { tag: "proxy.addProxy", desc: "NonTransfer · treasurer role", note: "native RBAC" },
  ];
  return (
    <FloatingCard className="px-6 py-5 w-full max-w-[440px]">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[12px] text-[var(--text-2)]">utility.batchAll</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[var(--pink-tint)] text-[var(--pink-ink)]">
          asMulti · 2-of-3
        </span>
      </div>
      <div className="space-y-2.5">
        {calls.map((c, idx) => (
          <div
            key={c.tag}
            className="rounded-xl border border-[var(--border)] bg-[var(--paper)] px-3.5 py-3 flex items-start gap-3 deck-rise"
            style={{ animationDelay: `${260 + idx * 140}ms` }}
          >
            <span className="font-mono text-[11px] text-[var(--accent)] mt-0.5">{String(idx + 1)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[12px] text-[var(--text)] truncate">{c.tag}</p>
              <p className="text-[12px] text-[var(--text-2)] truncate">{c.desc}</p>
            </div>
            <span className="text-[10px] text-[var(--muted)] shrink-0 mt-1">{c.note}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[12px]">
        <span className="text-[var(--muted)]">All three, or none.</span>
        <span className="font-semibold text-[var(--success)]">atomic ✓</span>
      </div>
    </FloatingCard>
  );
}

/* ── slides ───────────────────────────────────────────────────────────────── */

export const SLIDES: SlideDef[] = [
  /* 00 — Title */
  {
    kicker: "Portaldot · Onchain Identity & Coordination",
    render: () => (
      <div className="text-center">
        <p {...rise(0)} className="font-mono text-[12px] tracking-[0.22em] text-[var(--muted)] uppercase mb-8">
          Portaldot Mini Hackathon · S1
        </p>
        <h1 className="leading-[0.92] tracking-[-0.02em]">
          <span {...rise(80)} className="block text-[56px] md:text-[80px] font-semibold text-[var(--accent)]">
            A name is
          </span>
          <span
            {...rise(180)}
            className="block serif-italic text-[72px] md:text-[120px] text-[var(--text)] mt-1"
          >
            a community.
          </span>
        </h1>
        <p {...rise(320)} className="mt-10 text-[18px] md:text-[22px] text-[var(--text-2)] max-w-2xl mx-auto">
          <span className="font-semibold text-[var(--accent)]">PNS</span> — the Portaldot Name Service.
          ENS-shaped naming, composed with the chain&apos;s native coordination pallets.
        </p>
        <div {...rise(440)} className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <Pill>ink! 5</Pill>
          <Pill>POT gas</Pill>
          <Pill>deployed on Portaldot</Pill>
          <Pill>open source</Pill>
        </div>
      </div>
    ),
  },

  /* 01 — Problem */
  {
    kicker: "The problem",
    render: () => (
      <div className="max-w-3xl">
        <Eyebrow n="01" label="The problem" />
        <h2 className="text-[40px] md:text-[60px] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--text)]">
          Web3 identity is <span className="serif-italic text-[var(--accent)]">fragmented.</span>
        </h2>
        <p className="mt-8 text-[18px] md:text-[20px] text-[var(--text-2)] leading-relaxed max-w-2xl">
          Your name, your reputation, your roles in a DAO, and your contribution history all live in
          separate systems — different chains, formats, and registries that don&apos;t talk to each other.
        </p>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { k: "Names", v: "one registry" },
            { k: "Reputation", v: "another silo" },
            { k: "Roles / RBAC", v: "a third app" },
            { k: "Contributions", v: "off-chain spreadsheets" },
          ].map((x, idx) => (
            <div
              key={x.k}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
              style={{ animationDelay: `${120 + idx * 90}ms` }}
            >
              <p className="text-[15px] font-semibold text-[var(--text)]">{x.k}</p>
              <p className="mt-1 text-[13px] text-[var(--muted)] font-mono">{x.v}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-[15px] text-[var(--muted)]">
          Coordinating a community means stitching a dozen disconnected tools together.
        </p>
      </div>
    ),
  },

  /* 02 — Solution */
  {
    kicker: "The solution",
    render: () => (
      <div
        className="dot-overlay rounded-[36px] overflow-hidden border border-[var(--border)]"
        style={{ background: "var(--green-bg)" }}
      >
        <div className="p-10 md:p-16" style={{ color: "var(--green-ink)" }}>
          <p className="font-mono text-[12px] tracking-[0.22em] uppercase opacity-70 mb-6">02 · The solution</p>
          <h2 className="text-[40px] md:text-[58px] font-semibold leading-[1] tracking-[-0.02em] max-w-3xl">
            One name unifies
          </h2>
          <p className="serif-italic text-[44px] md:text-[64px] leading-[1.04] mt-1">
            identity, roles &amp; reputation.
          </p>
          <p className="mt-8 text-[17px] md:text-[19px] leading-relaxed font-medium opacity-90 max-w-2xl">
            Every PNS name is a programmable identity bundle. Every <em>parent</em> name is a fully
            functional onchain community — multisig treasury, proxy-based roles, native reputation, and
            an attestation graph, all bound to a single human-readable name.
          </p>
          <div className="mt-10 flex flex-wrap gap-2 font-mono text-[13px]">
            {["leo.pot", "bandit-dao.pot", "alice.bandit-dao.pot"].map((n, idx) => (
              <span
                key={n}
                className="px-3.5 py-2 rounded-full bg-white/55 deck-rise"
                style={{ animationDelay: `${200 + idx * 120}ms` }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* 03 — The moneyshot */
  {
    kicker: "How it works · the moment",
    render: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <Eyebrow n="03" label="The moment" />
          <h2 className="text-[36px] md:text-[52px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)]">
            One transaction.
            <br />
            <span className="serif-italic text-[var(--accent)]">Three native primitives.</span>
          </h2>
          <p className="mt-7 text-[17px] text-[var(--text-2)] leading-relaxed max-w-md">
            Minting a subname fires a single batched extrinsic that writes the name in our Registry
            contract, sets a Substrate sub-identity on the recipient, and grants a scoped proxy on the
            community account — composed, atomic, native.
          </p>
          <p className="mt-6 text-[14px] text-[var(--muted)]">
            No chain extensions required. <span className="font-mono text-[var(--text-2)]">utility.batchAll</span>{" "}
            does the composition the contract can&apos;t.
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
          <BatchAllCard />
        </div>
      </div>
    ),
  },

  /* 04 — Product flow */
  {
    kicker: "Product flow · five beats",
    render: () => (
      <div>
        <Eyebrow n="04" label="The product flow" />
        <h2 className="text-[32px] md:text-[46px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          Claim a name → coordinate a community, in five beats.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { n: "1", t: "Claim", d: "Register leo.pot. Sets a native identity — appears in every wallet." },
            { n: "2", t: "Profile", d: "Add avatar, socials, description as resolver text records." },
            { n: "3", t: "Community", d: "Spin up bandit-dao.pot as a native multisig account." },
            { n: "4", t: "Invite", d: "One batched tx: subname + sub-identity + scoped proxy role." },
            { n: "5", t: "Reputation", d: "Judgements, bounties & attestations surface on the profile." },
          ].map((s, idx) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
              style={{ animationDelay: `${120 + idx * 110}ms` }}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] font-mono text-[13px] font-semibold">
                {s.n}
              </span>
              <p className="mt-4 text-[17px] font-semibold text-[var(--text)]">{s.t}</p>
              <p className="mt-2 text-[13px] text-[var(--text-2)] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 font-mono text-[13px] text-[var(--muted)]">
          Five minutes, scripted — the same flow a reviewer can reproduce live.
        </p>
      </div>
    ),
  },

  /* 05 — Native pallet composition */
  {
    kicker: "Portaldot-native deployment",
    render: () => (
      <div>
        <Eyebrow n="05" label="Meaningful use of Portaldot" />
        <h2 className="text-[32px] md:text-[48px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          We compose with the chain&apos;s <span className="serif-italic text-[var(--accent)]">native pallets</span> —
          not reimplement them.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { p: "identity", u: "Sub-identities + registrar judgements = verified badges." },
            { p: "multisig", u: "Community accounts are native multisigs. No Safe contract." },
            { p: "proxy", u: "Scoped delegations = revocable, native RBAC per role." },
            { p: "bounties", u: "Treasury bounties become onchain contribution history." },
            { p: "utility", u: "batchAll makes contract + pallet writes atomic." },
          ].map((x, idx) => (
            <div
              key={x.p}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
              style={{ animationDelay: `${120 + idx * 90}ms` }}
            >
              <p className="font-mono text-[14px] text-[var(--accent)]">pallet_{x.p}</p>
              <p className="mt-3 text-[13px] text-[var(--text-2)] leading-relaxed">{x.u}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--muted)] mb-3">
            Role → proxy mapping
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-[12px]">
            {[
              "admin → Any",
              "treasurer → NonTransfer",
              "voter → Governance",
              "staker → Staking",
              "judge → IdentityJudgement",
            ].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* 06 — ENS comparison */
  {
    kicker: "Why Portaldot",
    render: () => (
      <div className="max-w-4xl">
        <Eyebrow n="06" label="ENS-shaped, Substrate-powered" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 deck-rise" style={{ animationDelay: "120ms" }}>
            <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-[var(--muted)]">On Ethereum</p>
            <p className="mt-4 text-[20px] text-[var(--text-2)] leading-relaxed">
              ENS is one contract suite <span className="font-semibold text-[var(--text)]">plus a dozen
              third-party contracts</span> — Safe, EAS, custom RBAC — to coordinate around it.
            </p>
          </div>
          <div
            className="dot-overlay rounded-2xl border border-[var(--border)] p-7 deck-rise"
            style={{ background: "var(--blue-bg)", color: "var(--blue-ink)", animationDelay: "240ms" }}
          >
            <p className="font-mono text-[12px] tracking-[0.18em] uppercase opacity-70">On Portaldot</p>
            <p className="mt-4 text-[20px] leading-relaxed font-medium">
              PNS is one contract suite that <span className="font-semibold">talks to the chain&apos;s native
              coordination pallets directly.</span>
            </p>
          </div>
        </div>
        <p className="mt-10 text-[18px] md:text-[22px] text-[var(--text)] leading-snug max-w-3xl">
          The primitives ENS needs an ecosystem to fake,{" "}
          <span className="serif-italic text-[var(--accent)]">Portaldot ships in the runtime.</span>
        </p>
      </div>
    ),
  },

  /* 07 — MVP / what's live */
  {
    kicker: "Runnable MVP · onchain value",
    render: () => (
      <div>
        <Eyebrow n="07" label="A runnable MVP with real onchain value" />
        <h2 className="text-[32px] md:text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          Live, demo-ready, and paying gas in <span className="font-mono text-[var(--accent)]">POT</span>.
        </h2>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { big: "6", small: "ink! 5 contracts", sub: "Registry · Resolver · Reverse · Registrar · Community · Attestation" },
            { big: "5", small: "native pallets composed", sub: "identity · multisig · proxy · bounties · utility" },
            { big: "1 tx", small: "subname issuance", sub: "batchAll: name + sub-identity + proxy, atomic" },
            { big: "POT", small: "native gas token", sub: "14 decimals · SS58 prefix 42 · mainnet-verified" },
          ].map((x, idx) => (
            <div
              key={x.small}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 deck-rise"
              style={{ animationDelay: `${120 + idx * 100}ms` }}
            >
              <p className="text-[40px] font-semibold tracking-tight text-[var(--accent)] leading-none">{x.big}</p>
              <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">{x.small}</p>
              <p className="mt-1.5 text-[11px] text-[var(--muted)] font-mono leading-relaxed">{x.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            "Next.js + @polkadot/api frontend",
            "@pns/sdk TypeScript SDK",
            "real subnames issued",
            "scoped proxies granted",
            "judgements + attestations",
          ].map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>
      </div>
    ),
  },

  /* 08 — Architecture */
  {
    kicker: "Architecture",
    render: () => (
      <div>
        <Eyebrow n="08" label="How it's wired" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <FloatingCard className="p-6">
            <p className="font-mono text-[12px] tracking-[0.18em] uppercase text-[var(--muted)] mb-4">
              ink! contracts — the name graph
            </p>
            <div className="space-y-2 font-mono text-[13px] text-[var(--text-2)]">
              {["Registry", "PublicResolver", "ReverseRegistrar", "Registrar (.pot)", "CommunityRegistrar", "Attestation"].map((c) => (
                <div key={c} className="px-3 py-2 rounded-lg bg-[var(--paper)] border border-[var(--border)]">
                  {c}
                </div>
              ))}
            </div>
          </FloatingCard>

          <div className="flex flex-col items-center justify-center text-center py-4">
            <span className="font-mono text-[12px] text-[var(--accent)] rotate-0 md:rotate-0">
              utility.batchAll
            </span>
            <span className="text-[var(--muted)] text-[24px] my-1">⇄</span>
            <span className="font-mono text-[11px] text-[var(--muted)] max-w-[120px]">
              atomic composition via the SDK
            </span>
          </div>

          <div
            className="dot-overlay rounded-2xl border border-[var(--border)] p-6"
            style={{ background: "var(--blue-bg)", color: "var(--blue-ink)" }}
          >
            <p className="font-mono text-[12px] tracking-[0.18em] uppercase opacity-70 mb-4">
              native pallets — account state
            </p>
            <div className="space-y-2 font-mono text-[13px]">
              {["identity — sub-ids, judgements", "multisig — community accounts", "proxy — scoped RBAC", "bounties — contributions", "utility — batching"].map((c) => (
                <div key={c} className="px-3 py-2 rounded-lg bg-white/55">
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-8 text-[14px] text-[var(--muted)] max-w-2xl">
          Contracts own <span className="text-[var(--text-2)]">who owns what</span>. Pallets own{" "}
          <span className="text-[var(--text-2)]">account state</span>. The SDK composes both into one
          signed extrinsic — each side enforces its own invariants.
        </p>
      </div>
    ),
  },

  /* 09 — Application value */
  {
    kicker: "Application value",
    render: () => (
      <div className="max-w-3xl">
        <Eyebrow n="09" label="Market potential" />
        <h2 className="text-[34px] md:text-[50px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)]">
          Naming is the <span className="serif-italic text-[var(--accent)]">first thing</span> every chain needs.
        </h2>
        <div className="mt-10 space-y-4">
          {[
            { t: "For people", d: "A portable .pot identity that works in every Substrate wallet on day one — no integration needed." },
            { t: "For communities", d: "Spin up a DAO with treasury, roles, reputation, and contribution tracking from a single name. Onboarding a member is one transaction." },
            { t: "For the ecosystem", d: "PNS becomes the identity & coordination layer other Portaldot dapps resolve against — the network effect ENS proved on Ethereum." },
          ].map((x, idx) => (
            <div
              key={x.t}
              className="flex gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
              style={{ animationDelay: `${140 + idx * 120}ms` }}
            >
              <span className="font-mono text-[12px] text-[var(--accent)] uppercase tracking-[0.14em] w-32 shrink-0 pt-1">
                {x.t}
              </span>
              <p className="text-[15px] text-[var(--text-2)] leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  /* 10 — Roadmap / honest limitations */
  {
    kicker: "Roadmap",
    render: () => (
      <div className="max-w-3xl">
        <Eyebrow n="10" label="Honest scope · what's next" />
        <h2 className="text-[32px] md:text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)]">
          Cut for the hackathon — <span className="serif-italic text-[var(--accent)]">on the roadmap.</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Commit/reveal registrar + auctions",
            "NameWrapper-style fuses & permissions",
            "Multi-coin / cross-chain address records",
            "ZKP-based selective disclosure",
            "Liquid-democracy delegation UI",
            "Curated registrar marketplace",
          ].map((x, idx) => (
            <div
              key={x}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[14px] text-[var(--text-2)] deck-rise"
              style={{ animationDelay: `${100 + idx * 70}ms` }}
            >
              {x}
            </div>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-[var(--muted)]">
          We deliberately built on standard Substrate pallets only — nothing that depends on
          marketing-tier chain features.
        </p>
      </div>
    ),
  },

  /* 11 — Close */
  {
    kicker: "Thank you",
    render: () => (
      <div className="text-center">
        <h2 className="leading-[1] tracking-[-0.02em]">
          <span {...rise(0)} className="block text-[34px] md:text-[48px] font-semibold text-[var(--accent)]">
            ENS-shaped surface.
          </span>
          <span {...rise(120)} className="block serif-italic text-[52px] md:text-[88px] text-[var(--text)] mt-2">
            Substrate-powered underneath.
          </span>
        </h2>
        <p {...rise(260)} className="mt-10 text-[18px] md:text-[20px] text-[var(--text-2)] max-w-2xl mx-auto">
          One name, every coordination primitive — composed natively on Portaldot, paid for in POT.
        </p>
        <div {...rise(380)} className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="bg-[var(--accent)] text-white px-7 py-3.5 rounded-full text-[15px] font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Try the live MVP
          </a>
          <span className="font-mono text-[13px] text-[var(--muted)]">github.com/Ashar20/PNS</span>
        </div>
        <p {...rise(480)} className="mt-12 serif-italic text-[22px] text-[var(--text-2)]">
          A name is a community.
        </p>
      </div>
    ),
  },
];
