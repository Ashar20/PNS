"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { useState } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { SCHEMAS, buildAttestTx, namehash, normaliseName, isZeroAccount } from "@pns/sdk";
import { signAndSendTx } from "../../../lib/signer";
import { ContractPromise } from "@polkadot/api-contract";

const SCHEMA_LIST = Object.values(SCHEMAS);

export default function AttestPage() {
  const { name: subjectName } = useParams<{ name: string }>();
  const { client } = usePNSClient();
  const { selected } = useWallet();
  const [issuerName, setIssuerName] = useState("");
  const [schema, setSchema] = useState<string>(SCHEMAS.ENDORSEMENT_SKILL);
  const [payload, setPayload] = useState("");
  const [status, setStatus] = useState<"idle" | "attesting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleAttest = async () => {
    if (!client || !selected || !issuerName || !payload) return;
    setStatus("attesting");
    setErrMsg("");
    try {
      const abis = (client as unknown as { abis: Record<string, unknown> }).abis;

      // Pre-flight: verify the issuer name exists and is owned by the connected wallet.
      const fullIssuerName = issuerName.includes(".") ? issuerName : `${issuerName}.pot`;
      const issuerNode = namehash(normaliseName(fullIssuerName));
      const registryContract = new ContractPromise(
        client.api,
        abis.registry as string,
        client.addresses.registry
      );
      const gasQ = client.api.registry.createType("WeightV2", {
        refTime: 10_000_000_000n,
        proofSize: 131_072n,
      });
      const { output: ownerOut } = await registryContract.query.owner(
        selected.address,
        { gasLimit: gasQ as unknown as bigint, storageDepositLimit: null },
        Array.from(issuerNode)
      );
      const ownerJson = ownerOut?.toJSON() as { ok?: string } | string | null;
      const owner = typeof ownerJson === "object" && ownerJson && "ok" in ownerJson
        ? ownerJson.ok
        : ownerJson as string | null;

      if (!owner || isZeroAccount(owner)) {
        throw new Error(`"${fullIssuerName}" is not registered. Claim it first at /claim/${fullIssuerName.split(".")[0]}`);
      }
      if (owner !== selected.address) {
        throw new Error(`"${fullIssuerName}" is owned by a different wallet. Sign in with the correct account.`);
      }

      const tx = buildAttestTx(
        client.api,
        client.addresses.attestation,
        abis.attestation,
        issuerNode,
        namehash(normaliseName(subjectName as string)),
        schema,
        new TextEncoder().encode(payload)
      );
      await signAndSendTx(tx, selected);
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e).replace("Error: ", ""));
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">
        Attest about <span className="text-[var(--accent)]">{subjectName}</span>
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Your name (issuer)</label>
          <input
            type="text"
            value={issuerName}
            onChange={(e) => setIssuerName(e.target.value)}
            placeholder="your-name.pot"
            className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Schema</label>
          <select
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
          >
            {SCHEMA_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Payload</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='e.g. "backend rust"'
            rows={3}
            className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        <button
          onClick={handleAttest}
          disabled={status === "attesting" || !selected || !issuerName || !payload}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "attesting" ? "Submitting…" : "Submit Attestation"}
        </button>

        {status === "done" && (
          <div className="bg-[var(--success)]/10 border border-[var(--success)]/25 rounded-xl px-4 py-3 text-sm text-[var(--success)]">
            Attestation submitted successfully.
          </div>
        )}
        {status === "error" && (
          <div className="bg-[var(--error)]/10 border border-[var(--error)]/25 rounded-xl px-4 py-3 text-sm text-[var(--error)]">
            {errMsg}
          </div>
        )}
      </div>
    </div>
  );
}
