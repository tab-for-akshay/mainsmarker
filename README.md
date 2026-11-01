# MainsMarker + StudyBuddy — accountable AI agents that pay each other on Concordium

Built by Tab, an AI assistant, for team lead Akshay Wagh.

**MainsMarker** reviews UPSC / IFoS Mains answers (score, strengths, gaps, model outline, diagram tip). **StudyBuddy** is Akshay's study agent: it buys those reviews. They are two separate services, on two different clouds, with their own keys, and they trade over plain HTTP x402 on Concordium testnet:

- StudyBuddy will not pay an agent until it has checked that agent's **Verified by Concordium** badge in the CIS-8004 Agent Registry and that the owner holds a valid **Concordium ID** credential;
- it pays with a **V1 sponsored transaction** (MainsMarker's facilitator pays the gas), within a spending policy it enforces from its own on-chain history;
- MainsMarker writes an **audit memo** for every review on-chain (full input hash, review hash, rubric version, model, payment ref, score), so anyone can later prove what the agent was paid for and what it returned.

| | Link |
|---|---|
| Live demo (seller page; the button calls StudyBuddy) | https://mainsmarker.sites.tab.bot/ |
| StudyBuddy (buyer agent home: card, balance, receipts) | https://studybuddy.sites.tab.bot/ |
| StudyBuddy API (runs on a different cloud) | https://studybuddy-agent-teal.vercel.app/api/status |
| MainsMarker Agent Card | https://mainsmarker.sites.tab.bot/.well-known/agent-card.json |
| StudyBuddy Agent Card | https://studybuddy.sites.tab.bot/.well-known/agent-card.json |
| Demo video (≤ 3 min) | https://mainsmarker.sites.tab.bot/demo.mp4 |

## Architecture

```
 Browser ──POST /api/buy──▶ StudyBuddy (Vercel, Node)                   MainsMarker (Cloudflare Worker)
                            1 GET  /.well-known/agent-card.json ───────▶ card (hash pinned on-chain, token #990)
                            2 check badge ─▶ Concordium Agent Registry (CIS-8004 <12802,0>, badge MCP)
                            3 read owner's identity credential ─▶ Concordium node (gRPC)
                            4 POST /x402/review ───────────────────────▶ 402 + PAYMENT-REQUIRED
                            5 policy: payTo = card wallet, price cap, daily budget (from chain)
                            6 sign V1 sponsored transfer (own key)
                            7 POST /x402/review + PAYMENT-SIGNATURE ───▶ facilitator: 9 checks, co-sign, submit, wait final
                                                                         LLM review (cloud or private self-hosted model)
                                                                         audit memo on-chain (MainsMarker's account)
                            8 hash the review it got = anchored hash ◀── 200 + review + PAYMENT-RESPONSE
```

| Concordium component | How it is used |
|---|---|
| Agent Registry (CIS-8004) + badge | MainsMarker #990 and StudyBuddy #991 are registered; cards built with the Registry MCP; card SHA-256 pinned with `setAgentURI` (StudyBuddy's card was moved to its own domain in v2 with a second `setAgentURI`). The buyer checks the badge before every payment. |
| Concordium ID | Every account comes from an identity issued by an identity provider. StudyBuddy reads the seller owner's credential from the chain (identity provider, valid-to) and refuses to pay if none is valid. |
| x402 + sponsored transactions | `@x402/concordium` exact scheme, V1 sponsored transfers. Buyers only need the price; the facilitator pays the fee. |
| On-chain accountability | One transfer-with-memo per review: full input hash, review hash (canonical JSON), rubric hash prefix, model, payment ref, score. `/api/audit` reads it back from the chain; the page verifies any review in the browser. |
| MCP | MainsMarker exposes `POST /mcp` (get_payment_requirements, review_answer, get_audit_log, verify_review). |

### What the facilitator checks before it sponsors a payment
1. Transaction version: V1 sponsored format, deserialisable
2. Sender identity: header.sender equals payload.sender, valid base58
3. Sponsor identity: header.sponsor.account is this facilitator's own account
4. Transfer destination equals PaymentRequirements.payTo
5. Amount equals PaymentRequirements.amount exactly
6. Asset type: SimpleTransfer for CCD (TokenUpdate with matching tokenId for PLT)
7. Expiry in the future and at most 10 minutes ahead
8. Sender signature verified against the sender's on-chain credentials
9. Payload safety: exactly one operation; sponsor is neither sender nor recipient

Plus per-payer limits (6 paid reviews per payer per 10 minutes, at most 4 settlements in flight; `/api/facilitator`). Today these limits live in the worker's memory; in production they move to a Durable Object so they hold across instances.

### Hashing (so anyone can reproduce it)
All hashes are SHA-256 over **canonical JSON**: object keys sorted recursively, no whitespace (`canon()` in `worker/worker.js`, the page and `scripts/buy.mjs`). The rubric is public at `/api/rubric`; its hash prefix is in every memo, so a review is tied to the exact rubric that produced it.

## Proof on Concordium testnet
| What | Transaction |
|---|---|
| MainsMarker registered (#990) | https://ccdexplorer.io/testnet/transaction/f617962730f5f803b4f893060cf5f90fc68fd53350e74bb382f0f60a0410101b |
| StudyBuddy registered (#991) | https://ccdexplorer.io/testnet/transaction/b41da04fc4f4b931c2ade0e62992511573dcf5e98b93413a752d9e181862a6aa |
| StudyBuddy card moved to its own domain (`setAgentURI`) | https://ccdexplorer.io/testnet/transaction/ba4ddcb5fcc05a72bd9816ee46b1fc7d6661616fb3cb5ab93a4354ce777f73f9 |
| StudyBuddy → MainsMarker x402 payment (sponsored) | https://ccdexplorer.io/testnet/transaction/e5a085b1aa578598e3f17bd915d8db4fbb071c816f15a6e78723fe8aa75027ea |
| …its audit memo | https://ccdexplorer.io/testnet/transaction/fefb80bea864530d8cfce075b22da2eb2cc292143789ddc7e8b299648181fd39 |
| A 4th account buying with the standalone CLI (`scripts/buy.mjs`) | https://ccdexplorer.io/testnet/transaction/a87c78fc34f5627bca6d21dcf20d00edf191d4d6395301b25e39bbca13bc686a |
| …its audit memo | https://ccdexplorer.io/testnet/transaction/09edd43bf811cca8f2e0b45cecc92a37973172d7bb5853f97c52f07316da7032 |

Accounts: MainsMarker `4J2SFgeVrLHVqPkb3dczpYKP99wFMm7FDFp3fEPwXMff3ieLi2`, StudyBuddy `4L8TkAeST26KMDvTajRZbnqxUYCWGgrBUUzeZkZ1awEKcTt2aG`, facilitator (gas sponsor) `3p6DTnSwRwczJL5JxmB89jveUFJq6x6npc1azREG7bzXvQiP6c`.

## Run it
**Buy a review with your own testnet account** (any x402 client works; this one is ~60 lines):
```
npm i @x402/concordium @x402/core @concordium/web-sdk
BUYER_ADDRESS=<your testnet account> BUYER_KEY=<its signing key, hex> node scripts/buy.mjs
```
It fetches the card, checks the badge, gets the 402, pays (sponsored) and checks that its own hash of the review equals the anchored hash.

**Deploy your own:** `worker/` is the MainsMarker Cloudflare Worker (esbuild bundle, `grpcshim.js` maps the Node gRPC client to the gRPC-web client). `studybuddy/` is the buyer (runs as a Cloudflare Worker for its home page and as a Vercel Node function for `/api/buy`). Keys are injected at deploy time and are never in this repo. `scripts/` creates testnet identities and accounts (`idreq.mjs`, `deploy.mjs`), registers agents (`upd.mjs`), and builds bundles.

## Impact
UPSC Mains is written, and feedback on written answers is the slowest, costliest part of preparation; many aspirants practise without any. An answer-review agent that other agents (a study planner, a coaching platform's bot, a Telegram tutor) can pay per call, and that leaves a public record of what it did, makes AI feedback cheap and checkable. The same pattern (badge-gated payment + audit memo) fits any paid AI service where the buyer needs to know who stands behind the agent.

## Path to production
| Item (per review, mainnet fee schedule) | Energy | EUR | CCD at €0.0025 |
|---|---|---|---|
| Sponsored x402 transfer (facilitator pays) | 635 | €0.0127 | ≈ 5.1 |
| Audit memo (transfer with memo) | 739 | €0.0148 | ≈ 5.9 |
| **Chain cost per review** | | **€0.028** | **≈ 11** |
| LLM inference (gpt-oss-120b, ~0.7k in / ~0.9k out tokens, provider list price, approx.) | | ≈ €0.001 | ≈ 0.4 |
| **Price we would charge** | | **≈ €0.10 (₹10)** | **≈ 40** |

Concordium fees are pegged to the euro (0.00002 €/energy, read from the chain's parameters on 1 Nov 2026); energy figures are from our own testnet transactions; the CCD rate is CoinGecko's on 1 Nov 2026 (≈ €0.0025). The 0.5 CCD test price is a demo number and is below cost. At €0.10 a review the margin covers sponsoring the buyer's gas and the audit write. Batching (one memo carrying a Merkle root of up to N reviews) cuts the audit cost per review by about N.

1. **Mainnet:** same code with network `ccd:9dd9ca4d19e9393877d2c44b70f89acb`, the mainnet registry, and keys in a KMS (the sponsor key signs only after the 9 checks; it holds a small float that is topped up daily, so a leak caps the loss).
2. **Who pays:** students never touch crypto. A coaching platform or study app runs a StudyBuddy-style buyer agent and pays per review; it bills students in rupees. MainsMarker is a backend any such agent can call.
3. **Distribution:** a Telegram / WhatsApp tutor bot that buys reviews through this API; coaching institutes that batch-buy reviews for test series.
4. **Trust:** rubric versions published and hashed; a public audit log; per-buyer limits in a Durable Object; batch memos (Merkle root per N reviews).
5. **Quality:** a published evaluation set (real answers, human scores vs. the agent's scores) before charging real money.

## Roadmap
- Payment in a stablecoin PLT once available on Concordium (x402 already supports `TokenUpdate`).
- Human-graded evaluation set and score calibration per paper.
- Hindi answers; diagram feedback from photos of handwritten answers.

## Models
Cloud: gpt-oss-120b/20b (Groq), Gemini Flash-Lite as fallback. **Private mode:** a self-hosted open-weights model (an abliterated Qwen-family 9B) for users who do not want answers to leave infrastructure we control. The model used is written into every audit memo.

## Credits and disclosure
Built by Tab, an AI assistant, for team lead Akshay Wagh. Design reviews during the build came from three AI critics (Skydive's agent Arden, Fo on wajo.ai, Gemini); see `ROUNDS.md`. Testnet only; no real money moves.

MIT licence.
