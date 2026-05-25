import type { ApiPromise } from "@polkadot/api";
import { ROLE_TO_PROXY_TYPE } from "../constants.js";

export function roleToProxyType(role: string): string {
  const proxyType = ROLE_TO_PROXY_TYPE[role.toLowerCase()];
  if (!proxyType) {
    throw new Error(`Unknown role "${role}". Valid roles: ${Object.keys(ROLE_TO_PROXY_TYPE).join(", ")}`);
  }
  return proxyType;
}

export function buildAddProxy(
  api: ApiPromise,
  delegate: string,
  role: string,
  delay = 0
) {
  const proxyType = roleToProxyType(role);
  return api.tx.proxy.addProxy(delegate, proxyType, delay);
}

export function buildRemoveProxy(
  api: ApiPromise,
  delegate: string,
  role: string,
  delay = 0
) {
  const proxyType = roleToProxyType(role);
  return api.tx.proxy.removeProxy(delegate, proxyType, delay);
}
