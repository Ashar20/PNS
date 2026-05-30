"use client";

import { PNSClient } from "@pns/sdk";
import { chainAddresses, chainWsEndpoint } from "./chain-config";

let _client: PNSClient | null = null;
let _ready: Promise<PNSClient> | null = null;
let _wiredRegistry: string | null = null;

/** Drop cached RPC client after `pnpm run deploy:local` updates addresses. */
export function resetPNSClient(): void {
  _client = null;
  _ready = null;
  _wiredRegistry = null;
}

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
  const addresses = chainAddresses();
  if (_wiredRegistry !== addresses.registry) {
    resetPNSClient();
    _wiredRegistry = addresses.registry;
  }
  if (_ready) return _ready;
  _ready = (async () => {
    if (!_client) {
      _client = new PNSClient({
        wsEndpoint: chainWsEndpoint(),
        addresses,
      });
    }
    const [abis] = await Promise.all([loadAbis(), _client.connect()]);
    _client.setAbis(abis);
    return _client;
  })();
  return _ready;
}
