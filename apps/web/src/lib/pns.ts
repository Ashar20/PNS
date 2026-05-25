"use client";

import { PNSClient } from "@pns/sdk";
import { LOCAL_ADDRESSES, LOCAL_WS } from "@pns/sdk";

let _client: PNSClient | null = null;
let _ready: Promise<PNSClient> | null = null;

async function loadAbis(): Promise<Record<string, unknown>> {
  const names = ["registry", "resolver", "reverse", "registrar", "community", "attestation"];
  const entries = await Promise.all(
    names.map(async (name) => {
      const res = await fetch(`/abis/${name}.json`);
      return [name, await res.json()] as [string, unknown];
    })
  );
  return Object.fromEntries(entries);
}

export function getPNSClient(): Promise<PNSClient> {
  if (_ready) return _ready;
  _ready = (async () => {
    if (!_client) {
      _client = new PNSClient({
        wsEndpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT ?? LOCAL_WS,
        addresses: {
          registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? LOCAL_ADDRESSES.registry,
          resolver: process.env.NEXT_PUBLIC_RESOLVER_ADDRESS ?? LOCAL_ADDRESSES.resolver,
          reverseRegistrar: process.env.NEXT_PUBLIC_REVERSE_ADDRESS ?? LOCAL_ADDRESSES.reverseRegistrar,
          registrar: process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS ?? LOCAL_ADDRESSES.registrar,
          attestation: process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS ?? LOCAL_ADDRESSES.attestation,
        },
      });
    }
    const [abis] = await Promise.all([loadAbis(), _client.connect()]);
    _client.setAbis(abis);
    return _client;
  })();
  return _ready;
}
