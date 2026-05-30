import { HomeSearch } from "../components/HomeSearch";
import { Notice } from "../components/Notice";
import { SampleProfileCard } from "../components/SampleProfileCard";

export default function LandingPage() {
  return (
    <div className="-mx-6">
      <Notice>
        PNS is in active development on Portaldot. Registered names on the local dev node may be reset
        periodically due to routine contract deployments.
      </Notice>

      {/* Hero */}
      <section className="px-6 pt-12 md:pt-20 pb-24 text-center">
        <h1 className="text-[var(--accent)] leading-[0.95] tracking-[-0.02em]">
          <span className="block text-[64px] md:text-[88px] font-semibold">Claim your</span>
          <span className="block serif-italic text-[72px] md:text-[112px] text-[var(--text)] mt-1">
            .pot identity
          </span>
        </h1>
        <p className="mt-8 text-[20px] md:text-[24px] text-[var(--accent)] font-medium">
          A simple, portable identity that you control.
        </p>

        <div className="mt-14">
          <HomeSearch />
        </div>
      </section>

      {/* Color-blocked feature panels — ENS-style */}
      <section className="px-6 max-w-[1180px] mx-auto">
        {/* Row 1 — green */}
        <PanelRow
          theme="green"
          eyebrow="01"
          title="One name"
          italic="everywhere."
          body="Your name lives onchain — you own it, not a platform. Sign in to dapps with your .pot name, and your PNS profile loads automatically wherever you go."
          floatingCard={<FloatingSendCard />}
        />

        {/* Row 2 — pink (reversed) */}
        <PanelRow
          theme="pink"
          eyebrow="02"
          title="A name is"
          italic="a community."
          body="Parent names are multisig-owned communities. Issue subnames in a single batched extrinsic that grants a native sub-identity and a scoped Substrate proxy. RBAC, native."
          floatingCard={<FloatingCommunityCard />}
          reverse
        />

        {/* Row 3 — blue */}
        <PanelRow
          theme="blue"
          eyebrow="03"
          title="Reputation that"
          italic="travels with you."
          body="The community registers as an identity-pallet registrar. Judgements become verifiable badges. Peer attestations form a graph. Bounties become contribution history bound to the name."
          floatingCard={<FloatingBadgeCard />}
        />
      </section>

      {/* Profile customization section */}
      <section className="px-6 max-w-[1180px] mx-auto mt-28">
        <h2 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.02em] text-[var(--accent)] leading-tight max-w-2xl">
          Customize your profile to share what matters
        </h2>
        <p className="mt-4 text-[16px] text-[var(--text-2)] max-w-2xl leading-relaxed">
          Your PNS name is your onchain identity. Personalize it with an avatar, banner, social
          links, and contribution history. Showcase your work and make it easy for anyone to
          verify and follow you across the Portaldot ecosystem.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <SampleProfileCard
            name="gavin.pot"
            registered="May 26, 2020"
            bio="Founder of Polkadot, Kusama, Web3 Foundation, and Parity. Co-founder of Ethereum. Inventor of Solidity. Currently building JAM."
            links={[
              { kind: "twitter", value: "@gavofyork" },
              { kind: "github", value: "gavofyork" },
              { kind: "url", value: "gavwood.com" },
            ]}
            theme="green"
            avatarUrl="https://github.com/gavofyork.png"
          />
          <SampleProfileCard
            name="rob.pot"
            registered="June 14, 2020"
            bio="Co-founder of Polkadot. Researcher and core engineer at Parity. Likes parachains, consensus, and the colour blue."
            links={[
              { kind: "twitter", value: "@rphmeier" },
              { kind: "github", value: "rphmeier" },
            ]}
            theme="blue"
            avatarUrl="https://github.com/rphmeier.png"
          />
          <SampleProfileCard
            name="shawn.pot"
            registered="March 11, 2019"
            bio="Substrate engineer at Parity. Educator, FRAME pallet author, and one of the friendliest faces in the Polkadot dev community."
            links={[
              { kind: "twitter", value: "@shawntabrizi" },
              { kind: "github", value: "shawntabrizi" },
              { kind: "url", value: "shawntabrizi.com" },
            ]}
            theme="pink"
            avatarUrl="https://github.com/shawntabrizi.png"
          />
        </div>
      </section>

      {/* Composition strip */}
      <section className="px-6 max-w-[1180px] mx-auto mt-28 mb-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)] mb-4">
          Built on
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {["ink! 5", "pallet_identity", "pallet_multisig", "pallet_proxy", "pallet_bounties", "utility.batchAll", "keccak256 namehash", "SS58 · prefix 42"].map((t) => (
            <span
              key={t}
              className="px-3.5 py-2 rounded-full border border-[var(--border)] text-[var(--text-2)] font-mono bg-[var(--surface)]"
            >
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

interface PanelRowProps {
  theme: "green" | "pink" | "blue";
  eyebrow: string;
  title: string;
  italic: string;
  body: string;
  floatingCard: React.ReactNode;
  reverse?: boolean;
}

const PANEL_THEME: Record<PanelRowProps["theme"], { bg: string; ink: string }> = {
  green: { bg: "var(--green-bg)", ink: "var(--green-ink)" },
  pink:  { bg: "var(--pink-bg)",  ink: "var(--pink-ink)" },
  blue:  { bg: "var(--blue-bg)",  ink: "var(--blue-ink)" },
};

function PanelRow({ theme, eyebrow, title, italic, body, floatingCard, reverse }: PanelRowProps) {
  const t = PANEL_THEME[theme];
  return (
    <div
      className="dot-overlay rounded-[36px] overflow-hidden border border-[var(--border)] mb-6"
      style={{ background: t.bg }}
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 p-10 md:p-14 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div style={{ color: t.ink }} className="max-w-md">
          <p className="font-mono text-[12px] tracking-[0.18em] opacity-70 mb-5">{eyebrow}</p>
          <h3 className="text-[40px] md:text-[52px] font-semibold leading-[1] tracking-[-0.02em]">
            {title}
          </h3>
          <p className="serif-italic text-[44px] md:text-[56px] leading-[1.05] mt-1">
            {italic}
          </p>
          <p className="mt-6 text-[15px] leading-relaxed font-medium opacity-90 max-w-sm">
            {body}
          </p>
        </div>
        <div className="flex items-center justify-center md:justify-end">
          {floatingCard}
        </div>
      </div>
    </div>
  );
}

/* Floating mock cards */

function FloatingSendCard() {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] px-5 py-4 w-[280px]">
      <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-3">Send</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full" style={{ background: "linear-gradient(135deg,#BDDDB7,#DBEDD7)" }} />
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[var(--text)]">gavin.pot</p>
          <p className="text-[11px] text-[var(--muted)] font-mono">15oF4u…2QyEi</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-widest text-[var(--muted)]">Amount</span>
        <span className="font-mono text-[20px] text-[var(--text)]">3,333.<span className="text-[var(--muted)]">50</span></span>
      </div>
    </div>
  );
}

function FloatingCommunityCard() {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] px-5 py-4 w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-[var(--text)]">parity.pot</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[var(--pink-tint)] text-[var(--pink-ink)]">3-of-5</span>
      </div>
      <div className="space-y-2">
        {[
          { n: "gavin",  role: "admin",     proxy: "Any" },
          { n: "rob",    role: "voter",     proxy: "Governance" },
          { n: "shawn",  role: "treasurer", proxy: "NonTransfer" },
        ].map((m) => (
          <div key={m.n} className="flex items-center justify-between text-[13px]">
            <span className="font-mono text-[var(--text-2)]">{m.n}.parity</span>
            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-[var(--paper)] text-[var(--muted)]">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingBadgeCard() {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] px-5 py-4 w-[300px]">
      <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-3">Attestations on gavin.pot</p>
      <div className="space-y-2.5">
        {[
          { schema: "verified.kyc",            from: "web3foundation.pot" },
          { schema: "endorsement.skill",       from: "rob.pot" },
          { schema: "contribution.jam-spec",   from: "parity.pot" },
        ].map((a) => (
          <div key={a.schema} className="flex items-center justify-between text-[12px]">
            <span className="font-mono text-[var(--text-2)]">{a.schema}</span>
            <span className="text-[var(--muted)]">{a.from}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-[var(--muted)]">Judgement</span>
        <span className="text-[11px] font-semibold text-[var(--success)]">KnownGood ✓</span>
      </div>
    </div>
  );
}
