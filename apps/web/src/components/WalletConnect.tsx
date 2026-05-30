"use client";

import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

const DEV_ACCOUNTS = [
  { name: "Alice", uri: "//Alice" },
  { name: "Bob", uri: "//Bob" },
  { name: "Charlie", uri: "//Charlie" },
  { name: "Dave", uri: "//Dave" },
];

export function WalletConnect() {
  const { accounts, selected, isConnecting, error, connect, connectDev, connectByName, disconnect, selectAccount } = useWallet();
  const [showPanel, setShowPanel] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [seedName, setSeedName] = useState("");
  const [potName, setPotName] = useState("");
  const [potUri, setPotUri] = useState("");
  const [potErr, setPotErr] = useState<string | null>(null);

  const handleSeedConnect = async () => {
    if (!seedInput.trim()) return;
    await connectDev(seedInput.trim(), seedName.trim() || "Custom");
    setSeedInput("");
    setSeedName("");
    setShowPanel(false);
  };

  const handleDevAccount = async (uri: string, name: string) => {
    await connectDev(uri, name);
    setShowPanel(false);
  };

  const handleNameConnect = async () => {
    if (!potName.trim() || !potUri.trim()) {
      setPotErr("Enter both a .pot name and a signing URI.");
      return;
    }
    setPotErr(null);
    await connectByName(potName.trim(), potUri.trim());
    setPotName("");
    setPotUri("");
    setShowPanel(false);
  };

  if (accounts.length === 0 || showPanel) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            onClick={connect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold tracking-wide uppercase rounded-2xl transition-colors disabled:opacity-50 shadow-[0_2px_0_rgba(0,80,120,0.18)]"
          >
            {isConnecting ? "Connecting…" : "Connect"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="px-3 py-2.5 bg-[var(--surface)] hover:bg-[var(--paper)] border border-[var(--border)] text-[var(--text-2)] text-[13px] font-medium rounded-2xl transition-colors"
            title="Use dev account"
          >
            Dev
          </button>
        </div>

        {showPanel && (
          <div className="absolute right-0 top-14 z-50 w-[340px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[0_24px_60px_-20px_rgba(14,26,38,0.18)] p-5 space-y-5">

            {/* Connect by .pot name — primary flow */}
            <div className="space-y-2">
              <p className="text-[11px] text-[var(--accent)] font-semibold uppercase tracking-[0.14em]">Connect by .pot name</p>
              <input
                type="text"
                value={potName}
                onChange={(e) => { setPotName(e.target.value); setPotErr(null); }}
                placeholder="silas.pot"
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] font-mono"
              />
              <input
                type="text"
                value={potUri}
                onChange={(e) => { setPotUri(e.target.value); setPotErr(null); }}
                placeholder="Signing URI (//Alice or seed phrase)"
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] font-mono"
              />
              {potErr && <p className="text-[12px] text-[var(--error)]">{potErr}</p>}
              <button
                onClick={handleNameConnect}
                disabled={!potName.trim() || !potUri.trim() || isConnecting}
                className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white text-[13px] font-semibold rounded-xl transition-colors"
              >
                {isConnecting ? "Connecting…" : "Connect as .pot name"}
              </button>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div>
              <p className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-[0.14em] mb-2">Quick dev accounts</p>
              <div className="grid grid-cols-2 gap-2">
                {DEV_ACCOUNTS.map(({ name, uri }) => (
                  <button
                    key={uri}
                    onClick={() => handleDevAccount(uri, name)}
                    disabled={isConnecting}
                    className="py-2 px-3 bg-[var(--paper)] hover:bg-[var(--accent-soft)] border border-[var(--border)] hover:border-[var(--accent)]/30 text-[var(--text)] text-[13px] font-medium rounded-xl transition-colors text-left disabled:opacity-50"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div className="space-y-2">
              <p className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-[0.14em]">Seed phrase / URI</p>
              <input
                type="text"
                value={seedName}
                onChange={(e) => setSeedName(e.target.value)}
                placeholder="Account name (optional)"
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]"
              />
              <textarea
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter seed phrase or //URI"
                rows={2}
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] resize-none font-mono"
              />
              <button
                onClick={handleSeedConnect}
                disabled={!seedInput.trim() || isConnecting}
                className="w-full py-2 bg-[var(--paper)] hover:bg-[var(--accent-soft)] border border-[var(--border)] disabled:opacity-40 text-[var(--text)] text-[13px] font-medium rounded-xl transition-colors"
              >
                Import
              </button>
            </div>

            {error && <p className="text-[12px] text-[var(--error)]">{error}</p>}

            <button
              onClick={() => setShowPanel(false)}
              className="w-full text-[12px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
        <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
        <select
          value={selected?.address ?? ""}
          onChange={(e) => {
            const acc = accounts.find((a) => a.address === e.target.value);
            if (acc) selectAccount(acc);
          }}
          className="text-[13px] bg-transparent border-0 outline-none text-[var(--text)] font-medium cursor-pointer"
        >
          {accounts.map((a) => (
            <option key={a.address} value={a.address}>
              {a.name ?? a.address.slice(0, 10) + "…"}{a.source === "dev" ? " · dev" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowPanel(true)}
          className="text-[var(--muted)] hover:text-[var(--accent)] w-6 h-6 rounded-full hover:bg-[var(--paper)] transition-colors flex items-center justify-center"
          title="Add account"
        >
          +
        </button>
      </div>
      <button
        onClick={disconnect}
        className="text-[12px] text-[var(--muted)] hover:text-[var(--error)] w-9 h-9 rounded-2xl border border-[var(--border)] hover:border-[var(--error)]/30 bg-[var(--surface)] transition-colors flex items-center justify-center"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  );
}
