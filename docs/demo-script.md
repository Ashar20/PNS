# Demo Script

See CLAUDE.md section 9 for the full 5-minute scripted demo.

## Pre-demo checklist

- [ ] Local dev node running: `./portaldot --dev --tmp --rpc-port 9944 --rpc-cors all`
- [ ] All contracts deployed: `pnpm run deploy:local`
- [ ] Demo state seeded: `pnpm demo:seed`
- [ ] Frontend running: `pnpm --filter @pns/web dev`
- [ ] Browser: two profiles, Alice in one, Bob in the other, both with Polkadot.js extension
- [ ] Leo account imported: `//Leo` dev seed (or any funded dev account)
- [ ] Recording software open, microphone tested

## Beat order

1. Title card (0:00)
2. Problem slide (0:10)
3. Solution statement (0:25)
4. **Claim leo.pot** — moneyshot: name appears in wallet UI (0:35)
5. Set profile (1:15)
6. Create bandit-dao.pot community (1:40)
7. **Issue alice.bandit-dao.pot** — batchAll visible in wallet (2:20)
8. Verify natively in wallet + chain explorer (3:00)
9. Post bounty, claim it, contribution text record appears (3:30)
10. Issue judgement — verified badge (4:00)
11. Peer attestation (4:20)
12. Pitch close (4:40)

## Danger zone

- Do NOT improvise the order
- Have a fallback: a pre-recorded run at the correct speed
- Test the wallet signing flow 10x before recording
