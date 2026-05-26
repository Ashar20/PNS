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
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-sm rounded-lg transition-colors"
            title="Use dev account"
          >
            Dev
          </button>
        </div>

        {showPanel && (
          <div className="absolute right-0 top-12 z-50 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 space-y-4">

            {/* Connect by .pot name — primary flow */}
            <div className="space-y-2">
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide">Connect by .pot name</p>
              <input
                type="text"
                value={potName}
                onChange={(e) => { setPotName(e.target.value); setPotErr(null); }}
                placeholder="silas.pot"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-violet-600 font-mono"
              />
              <input
                type="text"
                value={potUri}
                onChange={(e) => { setPotUri(e.target.value); setPotErr(null); }}
                placeholder="Signing URI (e.g. //Alice or seed phrase)"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-violet-600 font-mono"
              />
              {potErr && <p className="text-xs text-red-400">{potErr}</p>}
              <button
                onClick={handleNameConnect}
                disabled={!potName.trim() || !potUri.trim() || isConnecting}
                className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isConnecting ? "Connecting…" : "Connect as .pot name"}
              </button>
            </div>

            <hr className="border-neutral-700" />

            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Quick Dev Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEV_ACCOUNTS.map(({ name, uri }) => (
                <button
                  key={uri}
                  onClick={() => handleDevAccount(uri, name)}
                  disabled={isConnecting}
                  className="py-2 px-3 bg-neutral-800 hover:bg-violet-900/40 hover:border-violet-700 border border-neutral-700 text-neutral-200 text-sm rounded-lg transition-colors text-left disabled:opacity-50"
                >
                  {name}
                </button>
              ))}
            </div>

            <hr className="border-neutral-700" />

            <div className="space-y-2">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Seed Phrase / URI</p>
              <input
                type="text"
                value={seedName}
                onChange={(e) => setSeedName(e.target.value)}
                placeholder="Account name (optional)"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-violet-600"
              />
              <textarea
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter seed phrase or //URI"
                rows={2}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-violet-600 resize-none font-mono"
              />
              <button
                onClick={handleSeedConnect}
                disabled={!seedInput.trim() || isConnecting}
                className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
              >
                Import
              </button>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={() => setShowPanel(false)}
              className="w-full text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected?.address ?? ""}
        onChange={(e) => {
          const acc = accounts.find((a) => a.address === e.target.value);
          if (acc) selectAccount(acc);
        }}
        className="text-sm bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200"
      >
        {accounts.map((a) => (
          <option key={a.address} value={a.address}>
            {a.name ?? a.address.slice(0, 10) + "…"}{a.source === "dev" ? " (dev)" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={() => setShowPanel(true)}
        className="text-xs text-neutral-500 hover:text-neutral-300 border border-neutral-700 hover:border-neutral-600 rounded-lg px-2 py-1.5 transition-colors"
        title="Add account"
      >
        +
      </button>
      <button
        onClick={disconnect}
        className="text-xs text-neutral-500 hover:text-red-400 border border-neutral-700 hover:border-red-800 rounded-lg px-2 py-1.5 transition-colors"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  );
}
