"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { KeyringPair } from "@polkadot/keyring/types";

export interface WalletAccount {
  address: string;
  name?: string;
  source: "extension" | "dev";
  signer?: KeyringPair;
}

interface WalletState {
  accounts: WalletAccount[];
  selected: WalletAccount | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  connectDev: (uri: string, name: string) => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: WalletAccount) => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
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
        setError("No Polkadot wallet extension found. Use a dev account instead.");
        return;
      }
      const allAccounts = await web3Accounts();
      const mapped: WalletAccount[] = allAccounts.map((a) => ({
        address: a.address,
        name: a.meta.name,
        source: "extension" as const,
      }));
      setAccounts((prev) => {
        const devAccounts = prev.filter((a) => a.source === "dev");
        return [...devAccounts, ...mapped];
      });
      if (mapped.length > 0 && !selected) setSelected(mapped[0]);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [selected]);

  const connectDev = useCallback(async (uri: string, name: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const { Keyring } = await import("@polkadot/keyring");
      const { cryptoWaitReady } = await import("@polkadot/util-crypto");
      await cryptoWaitReady();
      const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
      const pair = keyring.addFromUri(uri);
      const account: WalletAccount = {
        address: pair.address,
        name,
        source: "dev",
        signer: pair,
      };
      setAccounts((prev) => {
        const others = prev.filter((a) => a.address !== pair.address);
        return [...others, account];
      });
      setSelected(account);
    } catch (e) {
      setError(`Invalid URI: ${String(e)}`);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccounts([]);
    setSelected(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider value={{ accounts, selected, isConnecting, error, connect, connectDev, disconnect, selectAccount: setSelected }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
