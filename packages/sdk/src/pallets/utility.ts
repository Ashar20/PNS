import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";

export function batchAll(
  api: ApiPromise,
  calls: SubmittableExtrinsic<"promise">[]
) {
  return api.tx.utility.batchAll(calls);
}

export function batch(
  api: ApiPromise,
  calls: SubmittableExtrinsic<"promise">[]
) {
  return api.tx.utility.batch(calls);
}
