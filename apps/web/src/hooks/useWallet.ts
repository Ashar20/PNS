"use client";

import { useState, useEffect, useCallback } from "react";

interface WalletAccount {
  address: string;
  name?: string;
  source: string;
}

interface WalletState {
  accounts: WalletAccount[];
  selected: WalletAccount | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  selectAccount: (account: WalletAccount) => void;
}

export function useWallet(): WalletState {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selected, setSelected] = useState<WalletAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { web3Enable, web3Accounts } = await import("@polkadot/extension-dapp");
      const extensions = await web3Enable("PNS — Portaldot Name Service");
      if (extensions.length === 0) {
        setError("No Polkadot wallet extension found. Install Polkadot.js, Talisman, or SubWallet.");
        return;
      }
      const allAccounts = await web3Accounts();
      const mapped: WalletAccount[] = allAccounts.map((a) => ({
        address: a.address,
        name: a.meta.name,
        source: a.meta.source,
      }));
      setAccounts(mapped);
      if (mapped.length > 0 && !selected) {
        setSelected(mapped[0]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [selected]);

  return { accounts, selected, isConnecting, error, connect, selectAccount: setSelected };
}
