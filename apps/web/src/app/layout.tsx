import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { WalletConnect } from "../components/WalletConnect";
import { HeaderSearch } from "../components/HeaderSearch";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PNS — Portaldot Name Service",
  description: "A name is a community.",
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden>
        <defs>
          <linearGradient id="pns-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0080BC" />
            <stop offset="100%" stopColor="#005A86" />
          </linearGradient>
        </defs>
        <path
          d="M16 2.5 L28 9 L28 23 L16 29.5 L4 23 L4 9 Z"
          fill="url(#pns-mark)"
          stroke="#003E5C"
          strokeWidth="0.5"
        />
        <path
          d="M16 8 L22 12 L22 20 L16 24 L10 20 L10 12 Z"
          fill="white"
          opacity="0.92"
        />
      </svg>
      <span className="text-[22px] font-semibold tracking-tight text-[var(--accent)] lowercase">
        pns
      </span>
      <span className="text-[var(--muted)] text-[12px]">▾</span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <header className="border-b border-transparent sticky top-0 z-30">
            <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center gap-4">
              <div className="card flex items-center gap-3 px-4 py-2 rounded-2xl">
                <Logo />
              </div>
              <HeaderSearch />
              <div className="flex-1" />
              <WalletConnect />
            </div>
          </header>

          <main className="max-w-[1280px] mx-auto px-6">{children}</main>

          <footer className="max-w-[1280px] mx-auto px-6 py-10 mt-20 text-[12px] text-[var(--muted)] flex items-center justify-between">
            <span>
              PNS <span className="serif-italic text-[var(--text-2)]">— a name is a community.</span>
            </span>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <Link href="/communities" className="hover:text-[var(--text)]">Communities</Link>
              <Link href="/wallet" className="hover:text-[var(--text)]">Wallet</Link>
              <Link href="/my-names" className="hover:text-[var(--text)]">Profile</Link>
              <Link href="/docs" className="hover:text-[var(--text)]">Docs</Link>
              <Link href="/deck" className="hover:text-[var(--text)]">Deck</Link>
              <span>·</span>
              <span>portaldot · ink! 5</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
