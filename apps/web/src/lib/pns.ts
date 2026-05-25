"use client";

import { PNSClient } from "@pns/sdk";
import { LOCAL_ADDRESSES, LOCAL_WS } from "@pns/sdk";

// Singleton client — reused across pages
let _client: PNSClient | null = null;

export function getPNSClient(): PNSClient {
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
  return _client;
}
