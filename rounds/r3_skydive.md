# Round 3 — Skydive (agent Arden)

I'll review this hands-on. Starting with the seller site, then walking the buy flow.Repo is solid. Now I'll run the demo live in the browser.The buy flow worked end to end. Now testing verification.Verify works. Now the shareable link, and the buyer-side status.Shareable link works: it checks review hash, input hash, and buyer receipt. Quick check of the buyer side and facilitator, then verdict.I ran the whole thing myself: clicked "Let StudyBuddy buy a review", watched the full x402 flow land (6.5/15, gpt-oss-20b, payment tx `3a409f83…` with the facilitator shown as gas sponsor), clicked "Verify this review against the chain" (✓ match), opened the shareable verify link (✓ review hash, ✓ input hash, ✓ buyer receipt from StudyBuddy's own account), and hit the buyer status API and facilitator page. Everything you claimed works. The audit log also populated live on the page.

## Scores as it stands

| Criterion | Score | Notes |
|---|---|---|
| 1. Depth of integration | **8/10** | Badge check before payment, CIS-8004 #990/#991, Concordium ID read from chain, sponsored x402 with a real independent facilitator, two-party attestation. Loses points because the "independence" of facilitator and buyer is your own word — nothing adversarial proves it. |
| 2. Credible path to production | **6/10** | Genuinely good cost table (€0.028/review), Merkle batching idea, KMS plan. But you admit rate limits live in worker memory, there's no human-scored eval yet, and your "private mode" model is *abliterated* — a censorship-stripped model is a trust liability in an accountability hackathon. |
| 3. It works | **9/10** | True end-to-end, reproducible hashes, works from a stranger's browser. Lost point: ~25s buy with no visible progress, and the failure paths are invisible. |
| 4. Usefulness | **5/10** | The seller is real and checkable; the buyer side is a demo with one allowed seller. It's a vertical slice of an ecosystem, not a thing a coaching platform could sign up for tomorrow. |

**28/40.** The engineering is top-tier for this track; the score ceiling is proof-of-independence and usefulness.

## Top 6 improvements by score impact

1. **Demonstrate a failed verification on purpose.** Add a button "Try a tampered review" that flips one character in the review JSON and shows the verifier reject it, plus one refund actually on-chain shown with its tx. Criterion: #3/#1. Why: your entire pitch is "the chain catches a lying agent," and the demo only ever shows truth succeeding. One red-X screen is worth more than three more green flows — it converts the architecture diagram into a proven property.

2. **Let the judge buy with a buyer you don't control.** Ship `scripts/buy.mjs` as a hosted form: judge pastes a testnet account they create in-browser (or you fund a fresh one per judge session), and *their* account becomes the payer, so the buyer receipt lands on their own chain account. Criterion: #1/#4. Why: right now buyer, seller, and facilitator are all yours, so "two-party attestation" reads as two of your own accounts attesting. A third-party payer account makes the independence claim structurally undeniable — biggest single jump for the depth criterion.

3. **Move the buyer-receipt lookup off the seller's domain.** `/api/cosign/<tx>` is served by MainsMarker; a verifier "checks" the buyer's receipt through the seller's API. Criterion: #1/#2. Why: the weakest link in your verification story is that the seller is a party to verifying itself. Serve cosign lookup from the facilitator domain or a thin read-only service, and the verify page becomes a chain-only check. One day of work, closes an obvious judge attack.

4. **Implement the Durable Object rate limiter now, on testnet.** Criterion: #2. Why: "in production these limits move to a Durable Object" is a promise; the criterion is *credible path to production*. Cloudflare Workers free tier gives you Durable Objects cheaply, and "per-payer limits survive restarts" is a 2-line line-item you can demo by restarting. Right now it's the one place your code is knowingly not what you'd ship.

5. **Show live step-by-step progress during the buy.** Criterion: #3. Why: 25 silent seconds wastes your best asset. Stream each of the 9 steps ("badge checked · tx link", "402 received", "sponsored tx submitted", "final on chain") as they complete with CCDExplorer links appearing in real time — the flow itself is the pitch, make it visible.

6. **Replace the abliterated model and run 20 human-graded answers.** Criterion: #2/#4. Why: "abliterated Qwen" will read to any judge as a jailbroken model inside an *accountability* product — it actively costs you points on the trust axis; swap to an unmodified Qwen and say "private mode = open-weights model on our infra." And a tiny eval (20 real answers, one human's scores vs the agent's, correlation reported) converts your "we will publish before charging real money" hedge into a shippable number. Both are one-evening changes that close the two most quotable criticisms in your README.

One nit, no score impact: the README says "ERC-8004 / A2A card" in one spot on the page while everywhere else says CIS-8004 — pick one; a judge skimming will wonder if you confused two registries.
