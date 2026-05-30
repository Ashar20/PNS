/* PNS pitch deck — slide content. Pure presentational; rendered by /deck.
 *
 * The deck's spine is the four official judging criteria:
 *   Portaldot Native Deployment · Demo Completion · Application Value · Presentation Quality
 * Each slide's kicker names the criterion it serves, so the narrative maps 1:1 to the rubric.
 */
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
          <Pill>POT as gas</Pill>
          <Pill>deployed on Portaldot</Pill>
          <Pill>open source</Pill>
        </div>
      </div>
    ),
  },

  /* 01 — Problem (Track: a clear identity / coordination problem) */
  {
    kicker: "Track · the problem",
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

  /* 02 — Solution (Track: a simple, convincing idea) — folds in the ENS-shaped contrast */
  {
    kicker: "Track · the solution",
    render: () => (
      <div
        className="dot-overlay rounded-[36px] overflow-hidden border border-[var(--border)]"
        style={{ background: "var(--green-bg)" }}
      >
        <div className="p-10 md:p-14" style={{ color: "var(--green-ink)" }}>
          <p className="font-mono text-[12px] tracking-[0.22em] uppercase opacity-70 mb-6">02 · The solution</p>
          <h2 className="text-[38px] md:text-[54px] font-semibold leading-[1] tracking-[-0.02em] max-w-3xl">
            One name unifies
          </h2>
          <p className="serif-italic text-[42px] md:text-[60px] leading-[1.04] mt-1">
            identity, roles &amp; reputation.
          </p>
          <p className="mt-7 text-[17px] md:text-[19px] leading-relaxed font-medium opacity-90 max-w-2xl">
            Every PNS name is a programmable identity bundle. Every <em>parent</em> name is a fully
            functional onchain community — multisig treasury, proxy-based roles, native reputation, and
            an attestation graph, all bound to one human-readable name.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[13px]">
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
          <p className="mt-7 text-[14px] md:text-[15px] opacity-80 max-w-2xl">
            On Ethereum, ENS needs a dozen third-party contracts — Safe, EAS, NameWrapper — to coordinate
            around it. <span className="font-semibold">On Portaldot, PNS talks to the chain&apos;s native
            pallets directly.</span>
          </p>
        </div>
      </div>
    ),
  },

  /* 03 — Native pallet composition (Portaldot Native Deployment — mandatory criterion) */
  {
    kicker: "Native deployment · mandatory criterion",
    render: () => (
      <div>
        <Eyebrow n="03" label="Built on Portaldot · POT as gas · open source" />
        <h2 className="text-[32px] md:text-[48px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          We compose with the chain&apos;s <span className="serif-italic text-[var(--accent)]">native pallets</span> —
          not reimplement them.
        </h2>
        <div className="mt-9 grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-5">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--muted)] mb-3">
              Role → native proxy mapping
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
          <div className="flex md:flex-col gap-2 shrink-0">
            <Pill>gas = POT</Pill>
            <Pill>SS58 · 42</Pill>
            <Pill>contracts open source</Pill>
          </div>
        </div>
      </div>
    ),
  },

  /* 04 — Multichain identity · one cryptographic namehash (Application Value) */
  {
    kicker: "Application value · the multichain identity",
    render: () => (
      <div>
        <Eyebrow n="04" label="The multichain identity solution" />
        <h2 className="text-[32px] md:text-[46px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          One name. One hash. <span className="serif-italic text-[var(--accent)]">Every chain.</span>
        </h2>
        <p className="mt-5 text-[16px] md:text-[18px] text-[var(--text-2)] leading-relaxed max-w-2xl">
          Identity is fragmented across chains because each chain has its own address format. PNS
          fixes that at the cryptographic layer: a name&apos;s node is a{" "}
          <span className="font-semibold text-[var(--text)]">deterministic keccak256 namehash</span> —
          the <em>same 32 bytes</em>, computed identically by anyone, anywhere. One identifier, every
          ecosystem.
        </p>

        {/* fragments → one node → many chains */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          {/* the node */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 text-center deck-rise" style={{ animationDelay: "120ms" }}>
            <p className="font-mono text-[12px] text-[var(--muted)]">namehash(&quot;alice.pot&quot;)</p>
            <p className="mt-2 font-mono text-[18px] md:text-[22px] font-semibold text-[var(--accent)] tracking-tight">
              0x9f1c…a3e7
            </p>
            <p className="mt-2 text-[12px] text-[var(--text-2)]">
              ENS-compatible · one node, identical everywhere
            </p>
          </div>

          {/* what it composes across */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="dot-overlay rounded-2xl border border-[var(--border)] p-4 deck-rise"
              style={{ background: "var(--blue-bg)", color: "var(--blue-ink)", animationDelay: "220ms" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">Portaldot Wallet</p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/60">live</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug opacity-90">
                Same node = a native sub-identity. The name shows in the wallet with zero integration.
              </p>
            </div>
            <div
              className="dot-overlay rounded-2xl border border-[var(--border)] p-4 deck-rise"
              style={{ background: "var(--green-bg)", color: "var(--green-ink)", animationDelay: "320ms" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">ENS-compatible</p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/60">interop</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug opacity-90">
                Any ENS-style resolver computes the identical 32-byte node. Names interoperate by construction.
              </p>
            </div>
            <div
              className="dot-overlay rounded-2xl border border-[var(--border)] p-4 deck-rise"
              style={{ background: "var(--pink-bg)", color: "var(--pink-ink)", animationDelay: "420ms" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">iBridge</p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/60">next</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug opacity-90">
                Multi-coin records under that one node → bridge to <span className="font-mono">alice.pot</span>, not a 0x per chain.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-[16px] md:text-[18px] text-[var(--text)] leading-snug max-w-3xl">
          Identity stops being per-chain — one name resolves across apps, wallets, and chains:{" "}
          <span className="serif-italic text-[var(--accent)]">a single, composable, multichain identity.</span>
        </p>
      </div>
    ),
  },

  /* 05 — Product flow (Demo Completion) */
  {
    kicker: "Demo · five beats",
    render: () => (
      <div>
        <Eyebrow n="05" label="Demo completion · the product flow" />
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

  /* 06 — MVP / what's live + architecture (Demo Completion) */
  {
    kicker: "Demo · what's live",
    render: () => (
      <div>
        <Eyebrow n="06" label="A runnable MVP with real onchain value" />
        <h2 className="text-[30px] md:text-[44px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)] max-w-3xl">
          Live, demo-ready, and paying gas in <span className="font-mono text-[var(--accent)]">POT</span>.
        </h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          {/* stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { big: "6", small: "ink! 5 contracts", sub: "Registry · Resolver · Reverse · Registrar · Community · Attestation" },
              { big: "5", small: "native pallets composed", sub: "identity · multisig · proxy · bounties · utility" },
              { big: "1 tx", small: "subname issuance", sub: "batchAll: name + sub-identity + proxy, atomic" },
              { big: "POT", small: "native gas token", sub: "14 decimals · SS58 prefix 42 · mainnet-verified" },
            ].map((x, idx) => (
              <div
                key={x.small}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
                style={{ animationDelay: `${120 + idx * 90}ms` }}
              >
                <p className="text-[34px] font-semibold tracking-tight text-[var(--accent)] leading-none">{x.big}</p>
                <p className="mt-2.5 text-[13px] font-semibold text-[var(--text)]">{x.small}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)] font-mono leading-relaxed">{x.sub}</p>
              </div>
            ))}
          </div>
          {/* architecture, compact */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-5">
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--muted)] mb-3">
              How it&apos;s wired
            </p>
            <div className="space-y-2 font-mono text-[12px] text-[var(--text-2)]">
              <div className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                ink! contracts — the name graph (who owns what)
              </div>
              <div className="text-center text-[var(--accent)] text-[13px]">
                ⇅ utility.batchAll · @pns/sdk
              </div>
              <div className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                native pallets — account state (ids, proxies, bounties)
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Next.js + polkadot.js", "@pns/sdk", "in-app /docs"].map((t) => (
                <span key={t} className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 07 — Application value + roadmap (Application Value: market potential) */
  {
    kicker: "Application value · market & roadmap",
    render: () => (
      <div className="max-w-3xl">
        <Eyebrow n="07" label="Market potential" />
        <h2 className="text-[32px] md:text-[48px] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)]">
          Naming is the <span className="serif-italic text-[var(--accent)]">first thing</span> every chain needs.
        </h2>
        <div className="mt-8 space-y-3">
          {[
            { t: "For people", d: "A portable .pot identity that works in every Substrate wallet — including Portaldot Wallet — on day one." },
            { t: "For communities", d: "Treasury, roles, reputation, and contribution tracking from one name. Onboarding a member is a single transaction." },
            { t: "For the ecosystem", d: "The resolution layer the Portaldot Wallet and iBridge plug into — the network effect ENS proved on Ethereum." },
          ].map((x, idx) => (
            <div
              key={x.t}
              className="flex gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 deck-rise"
              style={{ animationDelay: `${140 + idx * 110}ms` }}
            >
              <span className="font-mono text-[12px] text-[var(--accent)] uppercase tracking-[0.14em] w-32 shrink-0 pt-1">
                {x.t}
              </span>
              <p className="text-[15px] text-[var(--text-2)] leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-7 font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--muted)] mb-2">Roadmap</p>
        <div className="flex flex-wrap gap-2">
          {[
            "multi-coin records → iBridge",
            "commit/reveal registrar",
            "NameWrapper-style fuses",
            "ZK selective disclosure",
          ].map((x) => (
            <span key={x} className="text-[12px] font-mono px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]">
              {x}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  /* 08 — Judging scorecard (Presentation Quality: key points clearly highlighted) */
  {
    kicker: "Presentation · the rubric, answered",
    render: () => (
      <div>
        <Eyebrow n="08" label="How PNS scores against every criterion" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              t: "Portaldot Native Deployment",
              tag: "mandatory",
              tone: "blue",
              d: "Deployed on Portaldot, gas paid in POT. Composes 5 native pallets via batchAll — not portable to any other chain.",
            },
            {
              t: "Demo Completion",
              tag: "MVP",
              tone: "green",
              d: "Runnable today: 6 contracts, a TypeScript SDK, and a full app. Five-beat flow a reviewer can reproduce live.",
            },
            {
              t: "Application Value",
              tag: "market",
              tone: "pink",
              d: "A composable, cryptographically-portable identity — the layer the Portaldot Wallet and iBridge plug into.",
            },
            {
              t: "Presentation Quality",
              tag: "clarity",
              tone: "blue",
              d: "ENS-shaped surface every reviewer recognises; one idea — fragmented identity, unified under one name.",
            },
          ].map((x) => {
            const bg =
              x.tone === "green" ? "var(--green-tint)" : x.tone === "pink" ? "var(--pink-tint)" : "var(--blue-bg)";
            const ink =
              x.tone === "green" ? "var(--green-ink)" : x.tone === "pink" ? "var(--pink-ink)" : "var(--blue-ink)";
            return (
              <div key={x.t} className="dot-overlay rounded-2xl border border-[var(--border)] p-5" style={{ background: bg, color: ink }}>
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-semibold">{x.t}</p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/55">{x.tag}</span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed opacity-90">{x.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    ),
  },

  /* 09 — Close */
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
          <a
            href="/docs"
            className="border border-[var(--border-strong)] text-[var(--text-2)] px-7 py-3.5 rounded-full text-[15px] font-medium hover:bg-[var(--surface)] transition-colors"
          >
            Read the SDK docs
          </a>
        </div>
        <p {...rise(480)} className="mt-12 serif-italic text-[22px] text-[var(--text-2)]">
          A name is a community.
        </p>
      </div>
    ),
  },
];
