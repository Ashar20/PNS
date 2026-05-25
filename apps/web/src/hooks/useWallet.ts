"use client";

// Re-export everything from the context so all consumers use the same state
export { useWallet } from "../context/WalletContext";
export type { WalletAccount } from "../context/WalletContext";
