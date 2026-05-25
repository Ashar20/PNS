"use client";

import { useWallet } from "../hooks/useWallet";

export function WalletConnect() {
  const { accounts, selected, isConnecting, error, connect, selectAccount } = useWallet();

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
        {error}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
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
            {a.name ?? a.address.slice(0, 10) + "…"}
          </option>
        ))}
      </select>
      <span className="text-xs text-neutral-500 font-mono">
        {selected?.address.slice(0, 8)}…{selected?.address.slice(-6)}
      </span>
    </div>
  );
}
