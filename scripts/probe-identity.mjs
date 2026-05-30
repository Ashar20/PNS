import { ApiPromise, WsProvider } from "@polkadot/api";
const api = await ApiPromise.create({ provider: new WsProvider("ws://127.0.0.1:9944") });
const sections = Object.keys(api.tx);
console.log("Pallets exposed (tx):", sections.sort().join(", "));
console.log("\nhas api.tx.identity?", !!api.tx.identity);
if (api.tx.identity) {
  console.log("api.tx.identity methods:", Object.keys(api.tx.identity).sort().join(", "));
  console.log("setIdentity?", !!api.tx.identity.setIdentity);
}
// Check what IdentityInfo type names exist in metadata
const types = api.registry.knownTypes || {};
const candidateTypes = Object.keys(api.registry.lookup?.types || {})
  .map(i => api.registry.createLookupType(api.registry.lookup.getSiType(i)))
  .filter(name => /identity/i.test(name))
  .slice(0, 20);
console.log("\nIdentity-related type names in metadata:");
candidateTypes.forEach(t => console.log("  -", t));
await api.disconnect();
