import type { ApiPromise } from "@polkadot/api";
import type { AttestOpts, AttestationRecord, TxResult } from "../types.js";
import { namehash, normaliseName } from "../namehash.js";
import { attest as contractAttest, listBySubject, getAttestation } from "../contracts/attestation.js";

export async function attestFlow(
  api: ApiPromise,
  attestationContractAddress: string,
  abi: unknown,
  opts: AttestOpts
): Promise<TxResult & { id: bigint }> {
  const issuerNode = namehash(normaliseName(opts.issuerName));
  const subjectNode = namehash(normaliseName(opts.subjectName));
  return contractAttest(
    api,
    attestationContractAddress,
    abi,
    issuerNode,
    subjectNode,
    opts.schema,
    opts.payload,
    opts.signer
  );
}

export async function listAttestationsForSubject(
  api: ApiPromise,
  attestationContractAddress: string,
  abi: unknown,
  subjectName: string,
  schema: string | undefined,
  caller: string
): Promise<AttestationRecord[]> {
  const subjectNode = namehash(normaliseName(subjectName));
  const schemas = schema
    ? [schema]
    : ["endorsement.skill", "endorsement.contribution", "verified.kyc", "verified.email"];
  const all: AttestationRecord[] = [];
  for (const s of schemas) {
    const ids = await listBySubject(api, attestationContractAddress, abi, subjectNode, s, caller);
    for (const id of ids) {
      const record = await getAttestation(api, attestationContractAddress, abi, id, caller);
      if (record && !record.revoked) {
        all.push(record);
      }
    }
  }
  return all;
}
