import type { ContractAddresses } from "@pns/sdk";
import { LOCAL_WS, MAINNET_WS } from "@pns/sdk";
import { LOCAL_ADDRESSES } from "../../../../packages/sdk/src/constants/local";

/** True when the app targets Portaldot mainnet (env or explicit WS URL). */
export function isMainnetTarget(): boolean {
  const ws = process.env.NEXT_PUBLIC_WS_ENDPOINT ?? "";
  return ws.includes("mainnet.portaldot.io");
}

export function chainWsEndpoint(): string {
  return process.env.NEXT_PUBLIC_WS_ENDPOINT ?? LOCAL_WS;
}

export function chainAddresses(): ContractAddresses {
  return {
    registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? LOCAL_ADDRESSES.registry,
    resolver: process.env.NEXT_PUBLIC_RESOLVER_ADDRESS ?? LOCAL_ADDRESSES.resolver,
    reverseRegistrar:
      process.env.NEXT_PUBLIC_REVERSE_ADDRESS ?? LOCAL_ADDRESSES.reverseRegistrar,
    registrar: process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS ?? LOCAL_ADDRESSES.registrar,
    attestation: process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS ?? LOCAL_ADDRESSES.attestation,
  };
}

/** Server-only: deploy community registrar (needs funded seed on mainnet). */
export function serverChainConfig() {
  return {
    wsEndpoint: process.env.PNS_WS_ENDPOINT ?? process.env.NEXT_PUBLIC_WS_ENDPOINT ?? LOCAL_WS,
    addresses: {
      registry:
        process.env.PNS_REGISTRY_ADDRESS ??
        process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
        LOCAL_ADDRESSES.registry,
    },
    deployerSeed: process.env.PNS_DEPLOYER_SEED ?? "//Alice",
  };
}

export { MAINNET_WS, LOCAL_WS };
