"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { usePNSClient } from "../../../hooks/usePNSClient";
import { useWallet } from "../../../hooks/useWallet";
import { SCHEMAS } from "@pns/sdk";

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
    try {
      const { web3FromAddress } = await import("@polkadot/extension-dapp");
      const injector = await web3FromAddress(selected.address);
      await client.attest({
        issuerName,
        subjectName: subjectName as string,
        schema,
        payload: new TextEncoder().encode(payload),
        signer: selected as never,
      });
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-neutral-100">
        Attest about <span className="text-violet-400">{subjectName}</span>
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Your name (issuer)</label>
          <input
            type="text"
            value={issuerName}
            onChange={(e) => setIssuerName(e.target.value)}
            placeholder="your-name.pot"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-violet-600"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Schema</label>
          <select
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100"
          >
            {SCHEMA_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Payload</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='e.g. "backend rust"'
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-violet-600 resize-none"
          />
        </div>

        <button
          onClick={handleAttest}
          disabled={status === "attesting" || !selected || !issuerName || !payload}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
        >
          {status === "attesting" ? "Submitting…" : "Submit Attestation"}
        </button>

        {status === "done" && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-sm text-green-300">
            Attestation submitted.
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            {errMsg}
          </div>
        )}
      </div>
    </div>
  );
}
