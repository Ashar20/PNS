import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers.jsx";
import { WalletConnect } from "../components/WalletConnect.jsx";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PNS — Portaldot Name Service",
  description: "A name is a community. ENS-shaped naming, Substrate-powered coordination.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">
        <Providers>
          <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur z-10">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                PNS
              </span>
              <span className="text-neutral-500 text-sm hidden sm:block">Portaldot Name Service</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/communities" className="text-sm text-neutral-400 hover:text-neutral-200">
                Communities
              </Link>
              <WalletConnect />
            </nav>
          </header>
          <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
