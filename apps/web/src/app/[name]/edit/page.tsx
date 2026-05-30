"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { signAndSendTx } from "../../../lib/signer";
import { Avatar, ProfileBanner } from "../../../components/Avatar";
import {
  buildSaveProfileTx,
  diffRecords,
  hasIdentityPallet,
  TEXT_KEYS,
  recordExists,
  namehash,
  normaliseName,
} from "@pns/sdk";

const FIELDS: { key: string; label: string; placeholder: string; identityMirror?: string }[] = [
  { key: "description",   label: "Description",  placeholder: "A short bio",                       identityMirror: "additional" },
  { key: TEXT_KEYS.URL,   label: "Website",      placeholder: "gavwood.com",                       identityMirror: "identity.web" },
  { key: TEXT_KEYS.TWITTER, label: "Twitter",    placeholder: "@gavofyork",                        identityMirror: "identity.twitter" },
  { key: TEXT_KEYS.GITHUB,  label: "GitHub",     placeholder: "gavofyork" },
  { key: TEXT_KEYS.DISCORD, label: "Discord",    placeholder: "gavofyork#0001" },
  { key: TEXT_KEYS.EMAIL,   label: "Email",      placeholder: "gavin@parity.io",                   identityMirror: "identity.email" },
  { key: TEXT_KEYS.AVATAR,  label: "Avatar URL", placeholder: "https://github.com/gavofyork.png",  identityMirror: "identity.image" },
];

export default function EditProfilePage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [addrInput, setAddrInput] = useState("");
  const [setPrimary, setSetPrimary] = useState(false);
  const [syncIdentity, setSyncIdentity] = useState(false);
  const identityAvailable = client ? hasIdentityPallet(client.api) : false;

  // Default syncIdentity ON only when the connected runtime actually has the pallet.
  useEffect(() => {
    if (identityAvailable) setSyncIdentity(true);
  }, [identityAvailable]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txCount, setTxCount] = useState(0);

  const { data: resolved } = useQuery({
    queryKey: ["profile", name],
    queryFn: () => client!.resolveName(name as string),
    enabled: !!client,
  });

  const { data: primaryName } = useQuery({
    queryKey: ["primary-name", selected?.address],
    queryFn: () => client!.resolveAddress(selected!.address),
    enabled: !!client && !!selected,
  });

  // Initialise the draft from the resolved profile
  useEffect(() => {
    if (resolved) {
      setDraft({ ...resolved.textRecords });
      if (resolved.addr) setAddrInput(resolved.addr);
    }
  }, [resolved]);

  const abis = client ? (client as unknown as { abis: Record<string, unknown> }).abis : null;

  const { data: nameRegistered } = useQuery({
    queryKey: ["record-exists", name, client?.addresses.registry],
    queryFn: async () => {
      const node = namehash(normaliseName(name as string));
      const caller = selected?.address ?? client!.api.registry.createType("AccountId", new Uint8Array(32)).toString();
      return recordExists(
        client!.api,
        client!.addresses.registry,
        abis!.registry,
        node,
        caller
      );
    },
    enabled: !!client && !!abis && !!name,
  });

  const isOwner =
    !!selected &&
    !!resolved &&
    nameRegistered === true &&
    resolved.owner.toLowerCase() === selected.address.toLowerCase();

  const addrChanged = !!addrInput && addrInput.trim() !== (resolved?.addr ?? "");
  const recordDiff = useMemo(
    () => (resolved ? diffRecords(resolved.textRecords, draft) : {}),
    [resolved, draft]
  );
  const changedRecordKeys = Object.keys(recordDiff);
  const isPrimary = primaryName === name;
  const willSetPrimary = setPrimary && !isPrimary;

  const operations: string[] = [];
  changedRecordKeys.forEach((k) =>
    operations.push(`PublicResolver.set_text(${k}, "${recordDiff[k].slice(0, 24)}${recordDiff[k].length > 24 ? "…" : ""}")`)
  );
  if (addrChanged) operations.push(`PublicResolver.set_addr(${addrInput.slice(0, 12)}…)`);
  if (syncIdentity && identityAvailable && (changedRecordKeys.length > 0 || addrChanged)) {
    operations.push("identity.setIdentity(display + mirrored fields)");
  }
  if (willSetPrimary) operations.push(`ReverseRegistrar.set_name(${name})`);

  const nothingToSave = operations.length === 0;

  const handleSave = async () => {
    if (!client || !abis || !selected) return;
    if (!isOwner) {
      setErrMsg(
        nameRegistered === false
          ? `${name} is not registered on this chain. Claim it first, then edit the profile.`
          : `Your wallet (${selected.address.slice(0, 10)}…) is not the Registry owner of ${name}.`
      );
      setStatus("error");
      return;
    }
    setStatus("saving");
    setErrMsg(null);
    try {
      const { tx, txCount } = buildSaveProfileTx(client.api, {
        name: name as string,
        textRecords: recordDiff,
        addr: addrChanged ? addrInput.trim() : undefined,
        syncIdentity,
        setPrimary: willSetPrimary,
        resolverAddress: client.addresses.resolver,
        resolverAbi: abis.resolver,
        reverseRegistrarAddress: client.addresses.reverseRegistrar,
        reverseRegistrarAbi: abis.reverse,
      });
      const blockHash = await signAndSendTx(tx, selected);
      setTxHash(blockHash);
      setTxCount(txCount);
      setStatus("done");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", name] }),
        queryClient.invalidateQueries({ queryKey: ["primary-name", selected.address] }),
      ]);
      setTimeout(() => router.push(`/${name}`), 1800);
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  if (!resolved) {
    return <div className="max-w-2xl mx-auto py-20 text-center text-[14px] text-[var(--muted)]">Loading…</div>;
  }

  const inputBase =
    "w-full bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-colors";

  return (
    <div className="max-w-3xl mx-auto pt-2">
      <Link
        href={`/${name}`}
        className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Back to profile
      </Link>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="h-28 relative">
          <ProfileBanner seed={name as string} className="absolute inset-0" />
        </div>
        <div className="px-7 pb-6 -mt-12">
          <Avatar
            seed={name as string}
            size={88}
            imageUrl={draft[TEXT_KEYS.AVATAR]}
            className="ring-[5px] ring-[var(--surface)]"
          />
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] mt-4 mb-1">Edit profile</p>
          <h1 className="text-[28px] font-mono font-semibold text-[var(--text)] break-all">{name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Records */}
          <section className="card p-6 space-y-4">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text)] mb-0.5">Profile records</h3>
              <p className="text-[12px] text-[var(--muted)]">
                Stored in <code className="font-mono text-[var(--accent)]">PublicResolver</code>.
                Marked fields are mirrored into <code className="font-mono text-[var(--accent)]">pallet_identity</code>.
              </p>
            </div>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-2)]">
                    {f.label}{" "}
                    <span className="font-mono text-[10px] text-[var(--muted)]">{f.key}</span>
                  </label>
                  {f.identityMirror && (
                    <span
                      className="text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider"
                      title="Mirrored into the identity pallet"
                    >
                      → {f.identityMirror}
                    </span>
                  )}
                </div>
                {f.key === "description" ? (
                  <textarea
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    rows={2}
                    className={inputBase + " resize-none"}
                  />
                ) : (
                  <input
                    type="text"
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className={inputBase + (f.key === TEXT_KEYS.AVATAR || f.key === TEXT_KEYS.GITHUB || f.key === TEXT_KEYS.TWITTER ? " font-mono" : "")}
                  />
                )}
              </div>
            ))}
          </section>

          {/* Address record */}
          <section className="card p-6 space-y-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text)] mb-0.5">Address record</h3>
              <p className="text-[12px] text-[var(--muted)]">
                The SS58 account this name resolves to when looked up.
              </p>
            </div>
            <input
              type="text"
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value)}
              placeholder="5GrwvaEF… (SS58)"
              className={inputBase + " font-mono"}
            />
            {selected && (
              <button
                onClick={() => setAddrInput(selected.address)}
                className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                Use my address ({selected.address.slice(0, 12)}…)
              </button>
            )}
          </section>

          {/* Toggles */}
          <section className="card p-6 space-y-3">
            <h3 className="text-[15px] font-semibold text-[var(--text)]">Onchain composition</h3>

            <label className={`flex items-start gap-3 ${identityAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}>
              <input
                type="checkbox"
                checked={syncIdentity && identityAvailable}
                onChange={(e) => setSyncIdentity(e.target.checked)}
                disabled={!identityAvailable}
                className="mt-0.5 accent-[var(--accent)] w-4 h-4"
              />
              <div>
                <p className="text-[13px] text-[var(--text)] font-medium flex items-center gap-2">
                  Mirror to <code className="font-mono text-[var(--accent)]">pallet_identity</code>
                  {!identityAvailable && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                      unavailable on this chain
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-[var(--muted)]">
                  {identityAvailable ? (
                    <>
                      Adds <code className="font-mono">identity.setIdentity(info)</code> to the batch.
                      Twitter, website, email, avatar URL, and the .pot name flow into native identity fields —
                      so this profile shows in every Polkadot wallet without integrating PNS.
                    </>
                  ) : (
                    <>
                      The connected runtime does not expose <code className="font-mono">pallet_identity</code>.
                      Substrate-contracts-node ships without it. Connect to Portaldot, Polkadot, Kusama, or
                      a Westend dev node to enable identity sync.
                    </>
                  )}
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={setPrimary}
                onChange={(e) => setSetPrimary(e.target.checked)}
                disabled={isPrimary}
                className="mt-0.5 accent-[var(--accent)] w-4 h-4"
              />
              <div>
                <p className="text-[13px] text-[var(--text)] font-medium">
                  Set as primary name {isPrimary && <span className="text-[11px] text-[var(--success)] ml-1">· already primary</span>}
                </p>
                <p className="text-[12px] text-[var(--muted)]">
                  Adds <code className="font-mono">ReverseRegistrar.set_name({name})</code> so your address
                  reverse-resolves to this name. Currently:{" "}
                  <span className="font-mono text-[var(--text-2)]">{primaryName ?? "none"}</span>
                </p>
              </div>
            </label>
          </section>
        </div>

        {/* Right — batch summary + save */}
        <aside>
          <div className="card p-5 sticky top-24 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] mb-2">
                One signature, {operations.length || "no"} write{operations.length === 1 ? "" : "s"}
              </p>
              <p className="text-[12px] text-[var(--text-2)]">
                All operations below run inside a single{" "}
                <code className="font-mono text-[var(--accent)]">utility.batchAll</code>.
                All-or-nothing.
              </p>
              {client && (
                <p className="text-[10px] font-mono text-[var(--muted)] mt-2 break-all">
                  registry {client.addresses.registry.slice(0, 14)}…
                </p>
              )}
            </div>

            {!isOwner && nameRegistered !== undefined && (
              <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-3 text-[12px] text-[var(--text-2)]">
                {nameRegistered === false ? (
                  <>
                    <strong className="text-[var(--warning)]">Name not registered.</strong> Claim{" "}
                    <span className="font-mono">{name}</span> on the home page before saving profile records.
                  </>
                ) : (
                  <>
                    <strong className="text-[var(--warning)]">Not the owner.</strong> Connect the account that
                    registered this name (see Ownership on the profile).
                  </>
                )}
              </div>
            )}

            <ol className="space-y-1.5">
              {operations.length === 0 ? (
                <li className="text-[12px] text-[var(--muted)] italic">No changes yet</li>
              ) : (
                operations.map((op, i) => (
                  <li
                    key={i}
                    className="text-[11px] font-mono text-[var(--text-2)] bg-[var(--paper)] rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-[var(--muted)] mr-1.5">{String(i + 1).padStart(2, "0")}</span>
                    {op}
                  </li>
                ))
              )}
            </ol>

            {status === "done" ? (
              <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/10 px-3 py-3">
                <p className="text-[13px] text-[var(--success)] font-semibold mb-1">
                  ✓ Saved · {txCount} write{txCount === 1 ? "" : "s"}
                </p>
                {txHash && (
                  <p className="text-[10px] text-[var(--muted)] font-mono">
                    {txHash.slice(0, 22)}…
                  </p>
                )}
                <p className="text-[11px] text-[var(--muted)] mt-1">Redirecting…</p>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={status === "saving" || nothingToSave || !selected || !isOwner}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white font-semibold uppercase tracking-wider text-[13px] rounded-2xl transition-colors shadow-[0_2px_0_rgba(0,80,120,0.18)]"
              >
                {status === "saving" ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing…
                  </>
                ) : nothingToSave ? (
                  "No changes"
                ) : (
                  <>
                    Save · 1 signature
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            )}

            {errMsg && (
              <p className="text-[12px] text-[var(--error)] border border-[var(--error)]/25 bg-[var(--error)]/10 rounded-lg px-3 py-2">
                {errMsg}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
