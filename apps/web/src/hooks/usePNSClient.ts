"use client";

import { useState, useEffect } from "react";
import { PNSClient } from "@pns/sdk";
import { getPNSClient } from "../lib/pns.js";

export function usePNSClient() {
  const [client, setClient] = useState<PNSClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsConnecting(true);
    const c = getPNSClient();
    c.connect()
      .then(() => {
        if (!cancelled) {
          setClient(c);
          setIsConnecting(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(String(e));
          setIsConnecting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { client, isConnecting, error };
}
