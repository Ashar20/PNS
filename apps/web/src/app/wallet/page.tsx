"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePNSClient } from "../../hooks/usePNSClient";
import { useWallet } from "../../hooks/useWallet";
import { WalletConnect } from "../../components/WalletConnect";
import { getBalance, transfer, POT, POT_DECIMALS, normaliseName, namehash, recordExists } from "@pns/sdk";
import { getOwner } from "@pns/sdk";

// ── helpers ────────────────────────────────────────────────────────────────

function formatPOT(planck: bigint): string {
  const pot = Number(planck) / Number(10n ** BigInt(POT_DECIMALS));
  return pot.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function isAddress(s: string): boolean {
  return s.startsWith("5") && s.length >= 46;
}

const HISTORY_KEY = "pns_wallet_history";
const BOOK_KEY = "pns_wallet_addressbook";

interface HistoryEntry {
  date: number;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  amount: string;
  blockHash: string;
}

interface BookEntry {
  name: string;
  address: string;
  addedAt: number;
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
}
function loadBook(): BookEntry[] {
  try { return JSON.parse(localStorage.getItem(BOOK_KEY) ?? "[]"); } catch { return []; }
}
function saveBook(b: BookEntry[]) {
  localStorage.setItem(BOOK_KEY, JSON.stringify(b));
}

// ── Resolve input: .pot name or raw address ────────────────────────────────

function useResolveInput(input: string) {
  const { client } = usePNSClient();
  const trimmed = input.trim();

  return useQuery({
    queryKey: ["resolve-input", trimmed],
    queryFn: async () => {
      if (!trimmed || !client) return null;
      if (isAddress(trimmed)) return { address: trimmed, name: null };
      const name = trimmed.endsWith(".pot") ? trimmed : `${trimmed}.pot`;
      const node = namehash(normaliseName(name));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      const exists = await recordExists(client.api, client.addresses.registry, abis.registry, node, caller);
      if (!exists) return { address: null, name };
      const owner = await getOwner(client.api, client.addresses.registry, abis.registry, node, caller);
      // prefer addr record from resolver
      let addr = owner;
      try {
        const resolved = await client.resolveName(name);
        if (resolved.addr) addr = resolved.addr;
      } catch {}
      return { address: addr, name };
    },
    enabled: !!client && !!trimmed,
    staleTime: 10_000,
  });
}

// ── Send panel ─────────────────────────────────────────────────────────────

function SendPanel({ onSent }: { onSent: (entry: HistoryEntry) => void }) {
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const { data: resolved, isFetching } = useResolveInput(to);

  const handleSend = async () => {
    if (!client || !selected?.signer || !resolved?.address) return;
    const amountPOT = parseFloat(amount);
    if (isNaN(amountPOT) || amountPOT <= 0) { setErr("Enter a valid amount."); return; }
    const planck = BigInt(Math.round(amountPOT * Number(10n ** BigInt(POT_DECIMALS))));
    setStatus("sending"); setErr(null);
    try {
      const result = await transfer(client.api, resolved.address, planck, selected.signer);
      const entry: HistoryEntry = {
        date: Date.now(),
        from: selected.address,
        to: resolved.address,
        toName: resolved.name ?? undefined,
        amount,
        blockHash: result.blockHash,
      };
      onSent(entry);
      setStatus("done");
      setTo(""); setAmount("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErr(String(e));
      setStatus("error");
    }
  };

  const canSend = !!resolved?.address && !!amount && status !== "sending" && !!selected?.signer;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-4">
      <h3 className="font-semibold text-neutral-100">Send POT</h3>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">To (.pot name or address)</label>
        <input
          value={to}
          onChange={(e) => { setTo(e.target.value); setStatus("idle"); setErr(null); }}
          placeholder="bob.pot or 5FHneW…"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-violet-500 font-mono"
        />
        {to.trim() && (
          <div className="text-xs mt-1">
            {isFetching && <span className="text-neutral-500">Resolving…</span>}
            {!isFetching && resolved?.address && (
              <span className="text-green-400">→ {resolved.address.slice(0, 16)}…{resolved.address.slice(-6)}</span>
            )}
            {!isFetching && resolved && !resolved.address && (
              <span className="text-red-400">Name not found or not registered</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Amount (POT)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1.0"
          type="number"
          min="0"
          step="0.01"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-violet-500"
        />
      </div>

      {resolved?.address && amount && (
        <div className="bg-neutral-800 rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">To</span>
            <span className="text-neutral-200 font-mono text-xs">{resolved.name ? <><span className="text-violet-400">{resolved.name}</span> ({resolved.address.slice(0, 10)}…)</> : resolved.address.slice(0, 16) + "…"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Amount</span>
            <span className="text-neutral-200">{amount} POT</span>
          </div>
        </div>
      )}

      {!selected && <p className="text-xs text-neutral-500">Connect a wallet to send.</p>}
      {selected && !selected.signer && <p className="text-xs text-yellow-500">Extension wallet sending not yet wired. Use a dev account.</p>}

      {err && <p className="text-xs text-red-400">{err}</p>}
      {status === "done" && <p className="text-xs text-green-400">Sent successfully.</p>}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
      >
        {status === "sending" ? "Sending…" : "Send"}
      </button>
    </div>
  );
}

// ── Receive panel ──────────────────────────────────────────────────────────

function ReceivePanel() {
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [copied, setCopied] = useState(false);

  const { data: primaryName } = useQuery({
    queryKey: ["primary-name", selected?.address],
    queryFn: () => client!.resolveAddress(selected!.address),
    enabled: !!client && !!selected,
  });

  const { data: balance } = useQuery({
    queryKey: ["balance", selected?.address],
    queryFn: () => getBalance(client!.api, selected!.address),
    enabled: !!client && !!selected,
    refetchInterval: 6000,
  });

  const copy = () => {
    navigator.clipboard.writeText(selected?.address ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selected) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-4">
      <h3 className="font-semibold text-neutral-100">Receive</h3>

      {primaryName && (
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-violet-400">{primaryName}</p>
          <p className="text-xs text-neutral-500 mt-1">Your primary name</p>
        </div>
      )}
      {!primaryName && (
        <p className="text-xs text-neutral-400">
          No primary name set. <Link href={`/search`} className="text-violet-400 hover:underline">Claim a name</Link> to send and receive by name.
        </p>
      )}

      <div className="bg-neutral-800 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Address</span>
          <button onClick={copy} className="text-xs text-violet-400 hover:text-violet-300">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs font-mono text-neutral-300 break-all">{selected.address}</p>
      </div>

      {balance !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-500">Balance</span>
          <span className="text-lg font-semibold text-neutral-100">{formatPOT(balance)} POT</span>
        </div>
      )}
    </div>
  );
}

// ── Address book panel ─────────────────────────────────────────────────────

function AddressBook({ onSelect }: { onSelect: (name: string) => void }) {
  const { client } = usePNSClient();
  const [book, setBook] = useState<BookEntry[]>([]);
  const [input, setInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  useEffect(() => { setBook(loadBook()); }, []);

  const add = async () => {
    if (!input.trim() || !client) return;
    setResolving(true); setResolveErr(null);
    try {
      const name = input.trim().endsWith(".pot") ? input.trim() : `${input.trim()}.pot`;
      const node = namehash(normaliseName(name));
      const caller = client.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;
      const exists = await recordExists(client.api, client.addresses.registry, abis.registry, node, caller);
      if (!exists) { setResolveErr("Name not registered."); return; }
      const owner = await getOwner(client.api, client.addresses.registry, abis.registry, node, caller);
      let address = owner ?? "";
      try { const r = await client.resolveName(name); if (r.addr) address = r.addr; } catch {}
      if (!address) { setResolveErr("Could not resolve address."); return; }
      const entry: BookEntry = { name, address, addedAt: Date.now() };
      const updated = [entry, ...book.filter(b => b.name !== name)];
      setBook(updated); saveBook(updated); setInput("");
    } catch (e) {
      setResolveErr(String(e));
    } finally {
      setResolving(false);
    }
  };

  const remove = (name: string) => {
    const updated = book.filter(b => b.name !== name);
    setBook(updated); saveBook(updated);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-4">
      <h3 className="font-semibold text-neutral-100">Address Book</h3>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setResolveErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="alice.pot"
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-violet-500"
        />
        <button
          onClick={add}
          disabled={resolving || !input.trim()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl"
        >
          {resolving ? "…" : "Add"}
        </button>
      </div>
      {resolveErr && <p className="text-xs text-red-400">{resolveErr}</p>}

      {book.length === 0 && (
        <p className="text-sm text-neutral-600">No saved names yet.</p>
      )}

      <div className="space-y-2">
        {book.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-violet-400">{entry.name}</p>
              <p className="text-xs font-mono text-neutral-500 mt-0.5">{entry.address.slice(0, 14)}…{entry.address.slice(-6)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSelect(entry.name)}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg"
              >
                Send
              </button>
              <button
                onClick={() => remove(entry.name)}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-400 text-xs rounded-lg"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── History panel ──────────────────────────────────────────────────────────

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  const { client } = usePNSClient();
  const { selected } = useWallet();

  // reverse-resolve addresses that don't have names yet
  const [resolved, setResolved] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!client || !history.length) return;
    const unresolved = history
      .flatMap(h => [h.from, h.to])
      .filter((addr, i, arr) => arr.indexOf(addr) === i && !resolved[addr]);
    if (!unresolved.length) return;
    Promise.all(
      unresolved.map(addr => client.resolveAddress(addr).then(name => ({ addr, name })).catch(() => ({ addr, name: null })))
    ).then(results => {
      const map: Record<string, string> = {};
      results.forEach(r => { if (r.name) map[r.addr] = r.name; });
      setResolved(prev => ({ ...prev, ...map }));
    });
  }, [client, history]);

  const label = (addr: string, name?: string) => {
    const n = name ?? resolved[addr];
    if (n) return <span className="text-violet-400">{n}</span>;
    return <span className="font-mono">{addr.slice(0, 10)}…{addr.slice(-6)}</span>;
  };

  if (!history.length) return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5">
      <h3 className="font-semibold text-neutral-100 mb-3">History</h3>
      <p className="text-sm text-neutral-600">No transactions yet.</p>
    </div>
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 space-y-3">
      <h3 className="font-semibold text-neutral-100">History</h3>
      <div className="space-y-2">
        {history.map((h, i) => {
          const isSent = h.from === selected?.address;
          return (
            <div key={i} className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <span className={isSent ? "text-red-400" : "text-green-400"}>{isSent ? "Sent to" : "Received from"}</span>
                  <span>{label(isSent ? h.to : h.from, isSent ? h.toName : h.fromName)}</span>
                </div>
                <p className="text-xs text-neutral-600">{new Date(h.date).toLocaleString()}</p>
              </div>
              <span className={`text-sm font-semibold ${isSent ? "text-red-400" : "text-green-400"}`}>
                {isSent ? "-" : "+"}{h.amount} POT
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { selected } = usePNSClient() as unknown as { selected: unknown };
  const { selected: account } = useWallet();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sendTo, setSendTo] = useState("");

  useEffect(() => { setHistory(loadHistory()); }, []);

  const handleSent = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const updated = [entry, ...prev];
      saveHistory(updated);
      return updated;
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-100">Wallet</h2>
        <p className="text-xs text-neutral-500">Send & receive using <span className="text-violet-400">.pot</span> names</p>
      </div>

      {!account ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Connect a wallet to get started.</p>
          <WalletConnect />
        </div>
      ) : (
        <div className="space-y-4">
          <ReceivePanel />
          <SendPanel onSent={handleSent} />
          <AddressBook onSelect={(name) => {
            // scroll to send and pre-fill
            setSendTo(name);
            document.querySelector<HTMLInputElement>('input[placeholder="bob.pot or 5FHneW…"]')?.focus();
            const input = document.querySelector<HTMLInputElement>('input[placeholder="bob.pot or 5FHneW…"]');
            if (input) { input.value = name; input.dispatchEvent(new Event("input", { bubbles: true })); }
          }} />
          <HistoryPanel history={history} />
        </div>
      )}
    </div>
  );
}
