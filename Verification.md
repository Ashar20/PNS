Run this please 


# CHECKLIST.md — verification before we build

Run through every box below before any code is written. Each item either passes or doesn't. If it doesn't, fix the CLAUDE.md first, then come back.

Three of the sections (3, 7, 15) are not just checklists. They contain substantive content that should be lifted into CLAUDE.md and the README. If a check fails because something is missing from CLAUDE.md, copy the corresponding prose from this file into CLAUDE.md and tick the box.

---

## 1. Concept integrity

•⁠  ⁠[ ] One-line pitch fits in one breath: "PNS is the name service for Portaldot. A name is a community."
•⁠  ⁠[ ] The single most memorable demo moment is identified and named (the batched extrinsic that does Registry + sub-identity + proxy in one signature). Anyone reading the doc can point to it.
•⁠  ⁠[ ] We can answer in 30 seconds: "Why not just fork ENS to Substrate?" Because Portaldot has native primitives (multisig, proxy, bounties, identity, judgement) that ENS-on-Ethereum has to reimplement in contracts.
•⁠  ⁠[ ] We can answer in 30 seconds: "Why not just use the identity pallet directly?" See section 3 of this file.
•⁠  ⁠[ ] Project name choice (⁠ PNS ⁠) is defended or explicitly replaced.

## 2. Track alignment (Onchain Identity & Coordination)

•⁠  ⁠[ ] Maps to "clear identity or coordination problem" → identity fragmentation + community coordination.
•⁠  ⁠[ ] Maps to "simple and convincing product flow" → 5 demo beats, 5 minutes.
•⁠  ⁠[ ] Maps to "runnable MVP with real onchain value" → live deployment with real subnames, real bounties paid out.
•⁠  ⁠[ ] Maps to "meaningful use of Portaldot's native capabilities" → five pallets composed (identity, multisig, proxy, bounties, utility).
•⁠  ⁠[ ] Covers identity AND coordination, not just identity.
•⁠  ⁠[ ] Scope reads as "moderate complexity" not "infrastructure project."

## 3. Co-existence with Portaldot's native protocol — substantive answer

This is the most-likely judge question. The answer needs to be in the README, the pitch, and the demo. Use the language below verbatim or near-verbatim.

*The core claim:* PNS does not replace the identity pallet. It extends it with the primitives the pallet doesn't provide — hierarchical naming, arbitrary text records, programmable resolution, peer attestations, community semantics — and reuses the pallet for what it does well (wallet visibility, deposit-bonded display names, registrar judgements). The two are designed to live side by side and never drift.

*Responsibility split (must be in README):*

| Capability | Owned by | Reasoning |
| --- | --- | --- |
| Wallet-visible display name | identity pallet | Bonded by deposit, visible in every Substrate wallet, standard primitive |
| Verified status (Reasonable, KnownGood) | identity pallet | Registrar economics live here |
| Flat sub-identities | identity pallet | Wallet visibility per child |
| Hierarchical naming (any depth) | PNS Registry | Pallet sub-identities are one level deep |
| Arbitrary text records | PNS PublicResolver | Pallet has a fixed schema |
| Programmable resolver indirection | PNS Registry → PublicResolver | Pallet has no resolver concept |
| Reverse resolution | PNS ReverseRegistrar | Pallet has no namehash equivalent |
| ContentHash (IPFS / CID) | PNS PublicResolver | Not a pallet field |
| Peer-level attestations | PNS Attestation contract | Pallet only models registrar judgements |
| Community / membership concept | PNS CommunityRegistrar | Pallet has no community primitive |
| Role-based access control | proxy pallet | PNS records the role string; proxy enforces it |
| Treasury | multisig pallet | Native, no contract needed |
| Bounties / contribution records | bounties pallet (data) + PNS resolver (index) | Native record, PNS surfaces it on the name |
| Vote delegation | proxy pallet (Governance) | Liquid democracy is native; PNS just shows it |

*Three invariants that prevent state drift:*

1.⁠ ⁠*The identity pallet is authoritative for wallet-visible state.* PNS writes to the pallet when names are claimed and treats the pallet as the canonical mirror for anything a wallet might render.
2.⁠ ⁠*PNS is authoritative for everything the pallet does not model.* Text records, attestations, hierarchy, resolvers — pallet has no opinion, so PNS is canonical.
3.⁠ ⁠*Cross-layer composition is atomic.* Any operation that touches both layers (issuing a subname is the canonical case) runs inside a single ⁠ utility.batchAll ⁠. Partial success is impossible by construction.

*How PNS makes Portaldot's existing pallets more useful:*

1.⁠ ⁠Identity pallet gains a rich profile layer. The pallet's fixed fields are mirrored into PNS text records and joined with custom records (twitter, github, avatar, description, roles, contributions). A query for ⁠ alice.pot ⁠ returns the union.
2.⁠ ⁠Identity pallet gains discovery. Pallet has no way to ask "list all sub-identities under a parent." PNS adds the queryable index.
3.⁠ ⁠Hierarchy beyond one level. Pallet sub-identities are flat. PNS supports arbitrary depth: ⁠ team.alice.bandit-dao.pot ⁠ is a real name.
4.⁠ ⁠Proxy pallet gets human-readable roles. The pallet stores raw proxy delegations; PNS labels them ("treasurer," "voter") and surfaces them on the name's profile.
5.⁠ ⁠Bounties pallet gets a contribution graph. Pallet stores bounties; PNS records each claim as a text record on the claimant's subname, producing a verifiable contribution history bound to identity.
6.⁠ ⁠Multisig pallet gets a community shell. Native multisigs are just accounts; PNS wraps them with member directories, role mappings, and treasury views.
7.⁠ ⁠Lower on-ramp for Ethereum developers. Anyone who has used ENS recognizes the surface and ports their mental model directly. This is brand reuse, not technical reinvention.

*Migration story for users already on the identity pallet:*

A user with an existing ⁠ identity.setIdentity ⁠ record can claim ⁠ <their-name>.pot ⁠ and PNS will:
1.⁠ ⁠Read their existing identity fields.
2.⁠ ⁠Pre-populate the PNS resolver text records (display → display, web → url, etc.).
3.⁠ ⁠Register them as owner of the new node.

No data is lost. Either layer remains usable independently. PNS is opt-in.

*Co-existence checks:*

•⁠  ⁠[ ] Responsibility split table is in the README.
•⁠  ⁠[ ] Three invariants are in CLAUDE.md (lift them into section 6 of CLAUDE.md if not there yet).
•⁠  ⁠[ ] Five "PNS-helps-the-pallet" points are in the pitch deck/video.
•⁠  ⁠[ ] Migration story is documented in the README.
•⁠  ⁠[ ] The phrase "PNS does not replace the identity pallet; it extends it" appears verbatim in the README intro.

## 4. Chain assumptions (run before any contract code)

These are the eight items from CLAUDE.md section 3. Re-confirm with the local node, then tick.

•⁠  ⁠[ ] Local Portaldot dev node binary runs. Recorded version in ⁠ docs/chain-verified.md ⁠.
•⁠  ⁠[ ] ⁠ cargo contract ⁠ hello-world contract deploys and instantiates. Recorded ink! version.
•⁠  ⁠[ ] Chain extensions: confirmed presence or absence. If absent, all pallet calls happen client-side via ⁠ utility.batchAll ⁠.
•⁠  ⁠[ ] ⁠ identity.setIdentity ⁠ metadata inspected. Field list recorded.
•⁠  ⁠[ ] ⁠ proxy.addProxy ⁠ proxy-type enum inspected. Mapping recorded.
•⁠  ⁠[ ] ⁠ multisig ⁠ deposit constants recorded (⁠ DepositBase ⁠, ⁠ DepositFactor ⁠).
•⁠  ⁠[ ] ⁠ bounties ⁠ deposit and approval flow recorded. Does approval need council or treasury or sudo?
•⁠  ⁠[ ] ⁠ utility.batchAll ⁠ available.
•⁠  ⁠[ ] ⁠ balances ⁠ existential deposit recorded.
•⁠  ⁠[ ] AccountId confirmed 32 bytes, SS58 prefix confirmed ⁠ 42 ⁠.
•⁠  ⁠[ ] ⁠ ink::env::hash::Keccak256 ⁠ works in ink! 5.x (or version locked).

## 5. Contract design

•⁠  ⁠[ ] All six contracts have a single, named responsibility (no overlap).
•⁠  ⁠[ ] Authorization model is consistent: every write checks ⁠ Registry::owner ⁠ or ⁠ is_approved_for_all ⁠.
•⁠  ⁠[ ] Cross-contract calls are explicitly listed (Resolver → Registry for ownership; Registrar → Registry for subnode owner; Community → Registry).
•⁠  ⁠[ ] Errors are enumerated as a single enum per contract.
•⁠  ⁠[ ] Events are emitted for every state change.
•⁠  ⁠[ ] Constructor wiring is in the deploy script: root sets ⁠ Registrar ⁠ as owner of ⁠ keccak256("pot") ⁠.
•⁠  ⁠[ ] Namehash matches ENS convention (recursive keccak256 of node || labelhash, right-to-left).
•⁠  ⁠[ ] Reentrancy risk reviewed for cross-contract calls. Use checks-effects-interactions inside ink! messages.
•⁠  ⁠[ ] Storage layouts use ⁠ Mapping ⁠ not ⁠ Vec ⁠ for unbounded sets.
•⁠  ⁠[ ] No contract stores state that is also authoritative in a pallet (avoid drift).

## 6. Pallet integration design

•⁠  ⁠[ ] Identity: ⁠ setIdentity ⁠, ⁠ setSubs ⁠, ⁠ provideJudgement ⁠, ⁠ addRegistrar ⁠ paths all written down.
•⁠  ⁠[ ] Multisig: community account derivation path tested (⁠ createKeyMulti ⁠). ⁠ asMulti ⁠ flow documented.
•⁠  ⁠[ ] Proxy: role-to-proxy-type mapping is documented (see CLAUDE.md section 6.3). Mapping is stable.
•⁠  ⁠[ ] Bounties: full propose → approve → curator → award → claim path is sketched.
•⁠  ⁠[ ] Utility: ⁠ batchAll ⁠ used for atomicity. Inner-call failure mode tested.
•⁠  ⁠[ ] Sudo dependency is identified. ⁠ identity.addRegistrar ⁠ may require sudo on mainnet. Local fallback documented.
•⁠  ⁠[ ] Council/treasury dependency for bounty approval is identified. Local fallback documented.

## 7. SDK design

•⁠  ⁠[ ] ⁠ PNSClient ⁠ public API fits on one screen.
•⁠  ⁠[ ] Every multi-step on-chain action is wrapped in a ⁠ flows/*.ts ⁠ helper.
•⁠  ⁠[ ] Namehash and UTS46 normalization happen in SDK before any contract call.
•⁠  ⁠[ ] All inputs are typed; no ⁠ any ⁠.
•⁠  ⁠[ ] SDK works against both local dev node and mainnet by swapping a constants file.
•⁠  ⁠[ ] SDK exports types judges can import: ⁠ ResolvedName ⁠, ⁠ Member ⁠, ⁠ AttestationRecord ⁠.
•⁠  ⁠[ ] Integration tests in SDK run against a real node, not a stub.

## 8. Frontend completeness

•⁠  ⁠[ ] All 10 pages from CLAUDE.md section 8 have a route, a component skeleton, and at least a TODO list of fields.
•⁠  ⁠[ ] Wallet connect works with Polkadot.js extension at minimum. Talisman and SubWallet listed as bonus.
•⁠  ⁠[ ] Every page that displays chain data uses React Query against the SDK (no inline ⁠ fetch ⁠ of mock data).
•⁠  ⁠[ ] No page contains hard-coded chain data or placeholder strings.
•⁠  ⁠[ ] Empty states are handled (community with zero members, name with no records).
•⁠  ⁠[ ] Profile page renders identity pallet display name and judgement badges, not just PNS records.

## 9. Demo viability

•⁠  ⁠[ ] All 5 minutes of demo are scripted, beat by beat.
•⁠  ⁠[ ] The "moneyshot" beat (1:15 in CLAUDE.md section 9) is achievable: the wallet UI actually shows the new sub-identity after the extrinsic confirms.
•⁠  ⁠[ ] ⁠ scripts/demo-seed.ts ⁠ is idempotent. Running it twice in a row does not break anything.
•⁠  ⁠[ ] Time budget per beat is realistic (test in a real recording session).
•⁠  ⁠[ ] Fallback plan if mainnet deploy fails: demo runs on local dev node, video makes this explicit.
•⁠  ⁠[ ] Captions/subtitles planned for the demo video.

## 10. Testing rigor (no mocking)

•⁠  ⁠[ ] All 15 critical scenarios from CLAUDE.md section 12 have a test file.
•⁠  ⁠[ ] No file in ⁠ packages/sdk/tests ⁠ or ⁠ apps/web/tests ⁠ contains ⁠ mock ⁠, ⁠ stub ⁠, or ⁠ jest.fn ⁠ patterns for chain calls.
•⁠  ⁠[ ] ⁠ #[ink_e2e::test] ⁠ is used for every contract test that involves state.
•⁠  ⁠[ ] CI spins up a real substrate-contracts-node or Portaldot dev node before running e2e tests.
•⁠  ⁠[ ] Playwright tests drive a real wallet extension (via ⁠ @polkadot/extension-dapp ⁠ test harness) against a real local node.
•⁠  ⁠[ ] No test is skipped, marked ⁠ .only ⁠, or has a TODO without a tracking issue.

## 11. Risk coverage

•⁠  ⁠[ ] Every risk from CLAUDE.md section 15 has a documented fallback.
•⁠  ⁠[ ] Council/sudo dependencies have a non-sudo path or a local-node-only demo path.
•⁠  ⁠[ ] Multisig UX can degrade to single-signer demo if needed.
•⁠  ⁠[ ] Worst-case plan exists for "Portaldot mainnet is unreachable on demo day" (run demo on local node, narrate the gap).

## 12. Submission completeness

•⁠  ⁠[ ] README has all 10 items from CLAUDE.md section 14.
•⁠  ⁠[ ] Demo video is under 5 minutes, has voice, has captions, is uploaded unlisted.
•⁠  ⁠[ ] Contract addresses are documented in the README.
•⁠  ⁠[ ] Live frontend URL is in the README.
•⁠  ⁠[ ] DoraHacks submission form is filled.
•⁠  ⁠[ ] Repo is public on GitHub.
•⁠  ⁠[ ] License is set (MIT or Apache-2.0).

## 13. Style and quality

•⁠  ⁠[ ] Rust clippy clean.
•⁠  ⁠[ ] TypeScript strict mode passes.
•⁠  ⁠[ ] No ⁠ any ⁠, no ⁠ // @ts-ignore ⁠, no ⁠ // eslint-disable ⁠ without a comment explaining why.
•⁠  ⁠[ ] No em dashes in any user-facing copy.
•⁠  ⁠[ ] No AI-generated boilerplate phrasing in README ("delve into," "in the realm of," etc.).
•⁠  ⁠[ ] Commit messages are conventional and atomic.

## 14. Internal consistency of CLAUDE.md itself

•⁠  ⁠[ ] Section 5 storage definitions match what section 7 SDK consumes.
•⁠  ⁠[ ] Section 6 pallet calls match what section 9 demo claims happens.
•⁠  ⁠[ ] Section 12 test scenarios cover every contract and pallet integration mentioned.
•⁠  ⁠[ ] Section 13 verification list aligns with section 14 submission requirements.
•⁠  ⁠[ ] No section references a function, file, or behaviour that isn't defined elsewhere in the doc.

## 15. The "would a judge ask this?" pre-mortem

Read these out loud. If you can't answer any of them in 30 seconds with what's in CLAUDE.md, the doc needs an update.

•⁠  ⁠[ ] "Why is this on Portaldot and not Polkadot or Kusama or any other Substrate chain?" Answer: it works on any Substrate chain with the same pallets; the demo runs on Portaldot because that's the hackathon. The architecture is portable, which is itself a virtue.
•⁠  ⁠[ ] "Why not just use the identity pallet?" Section 3 of this file.
•⁠  ⁠[ ] "What stops two people from claiming the same name?" FCFS in the Registrar. The first transaction to land wins; later transactions see the label as taken.
•⁠  ⁠[ ] "What if the community multisig loses a key?" Multisig threshold protects against single-key loss. Beyond that, recovery is out of scope for the demo and listed as roadmap.
•⁠  ⁠[ ] "How do you handle malicious attestations?" Anyone can attest anything; the contract just records. Reputation comes from who is attesting (look up the issuer's own reputation). This is the model EAS uses; we inherit its semantics.
•⁠  ⁠[ ] "What about ENS-style commit/reveal to prevent frontrunning?" Out of scope for the demo. FCFS is acceptable for a hackathon and is documented as a known limitation with a roadmap entry for commit/reveal.
•⁠  ⁠[ ] "Why text records and not arbitrary bytes?" Text records cover 95% of profile use cases (twitter, github, avatar, description). ContentHash covers the rest. Arbitrary bytes can be added later without breaking the schema.
•⁠  ⁠[ ] "Is this just JustaName?" No. JustaName issues ENS subnames on Ethereum-compatible chains. PNS is a clean-room Substrate-native name service that composes with native pallets. Different stack, different primitives, different mental model.
•⁠  ⁠[ ] "What happens if Portaldot upgrades the identity pallet schema?" PNS resolver text records are decoupled from pallet fields. The mirror is a write-time operation, not a continuous binding. Schema upgrades on the pallet do not break PNS.

---

## How to use this checklist

1.⁠ ⁠Print it (or open it next to CLAUDE.md).
2.⁠ ⁠Walk through every box with the doc open.
3.⁠ ⁠Anything that fails → fix CLAUDE.md or the design.
4.⁠ ⁠Once all boxes pass, save this file as ⁠ docs/checklist.md ⁠ and tag the commit ⁠ spec-locked ⁠.
5.⁠ ⁠Re-run before submission as a final sanity pass.

End of checklist. If you find a box that should exist but doesn't, add it before you build.