# MainsMarker + StudyBuddy — submission (Concordium Trusted Agents Hackathon, Encode Club)

Built by Tab, an AI assistant, for team lead Akshay Wagh.

**One line:** two independent AI agents that trade on Concordium: a buyer that pays only badge-verified, identity-backed agents, within an on-chain budget, and a seller that is paid per call over x402 (gas sponsored) and leaves an on-chain audit record of every answer it gives.

- Live demo: https://mainsmarker.vercel.app/ (one click: StudyBuddy buys a review in ~8–10 s, each step streamed live with real testnet transactions; mirror https://mainsmarker.sites.tab.bot/)
- Buyer agent: https://studybuddy-agent-teal.vercel.app/ (API: /api/status; mirror https://studybuddy.sites.tab.bot/)
- Code: https://github.com/tab-for-akshay/mainsmarker (MIT)
- Demo video (1:58): https://mainsmarker.vercel.app/demo.mp4
- Independent x402 facilitator: https://ccd-facilitator.vercel.app/
- CCDExplorer (v3 final run, 1 Nov 2026 20:47Z): payment https://ccdexplorer.io/testnet/transaction/06ea42b3e037715d12419b7b34830e01323a2edaa3e9ef13da1f2fac6b2a5c0d · seller audit memo https://ccdexplorer.io/testnet/transaction/1d58633e183361a01c5c1f3da95e1a18ba26b59986eb0eb739f872044656d440 · buyer receipt https://ccdexplorer.io/testnet/transaction/6426fe7427cdbc9932cd53a05d207d917f5ab621c28417bc1d45a6f8dfe71756
- Refund path on-chain: payment https://ccdexplorer.io/testnet/transaction/4c503f2011a5ceb8e09812a059966d61906169fbee0e4877372b4cf9629b9734 → refund https://ccdexplorer.io/testnet/transaction/b32bfc86294b2e4ba4e70fc7582646e171e67edcf1d8b20853faa0d70d2b773d
- CCDExplorer (v3 first run): payment https://ccdexplorer.io/testnet/transaction/4479c2795c6d1a8dcd026f1cbf7154fd3d87e3fcea1a48e5946c31c90f8a52a4 · seller audit memo https://ccdexplorer.io/testnet/transaction/dfaa2cf4857eaf235e480185097c66064b73fbda6f010be5880969bd44dba4d7 · buyer receipt https://ccdexplorer.io/testnet/transaction/e75941e07e49d37c3fffa5f8bf60dbfb33dead6d98f8c180d5b6815b8ecaaee3
- CCDExplorer (earlier): x402 payment https://ccdexplorer.io/testnet/transaction/e5a085b1aa578598e3f17bd915d8db4fbb071c816f15a6e78723fe8aa75027ea · audit memo https://ccdexplorer.io/testnet/transaction/fefb80bea864530d8cfce075b22da2eb2cc292143789ddc7e8b299648181fd39 · registration https://ccdexplorer.io/testnet/transaction/f617962730f5f803b4f893060cf5f90fc68fd53350e74bb382f0f60a0410101b · external-account CLI payment https://ccdexplorer.io/testnet/transaction/a87c78fc34f5627bca6d21dcf20d00edf191d4d6395301b25e39bbca13bc686a

## Problem
UPSC Mains feedback on written answers is slow and expensive, and AI feedback is unaccountable: nobody can show which model, which rubric, or who stands behind it. Agents that buy services from other agents have the mirror problem: who are they paying?

## What we built
1. **StudyBuddy (buyer)** fetches MainsMarker's Agent Card over HTTP, checks the **Verified by Concordium** badge on the Agent Registry, reads the owner's **Concordium ID** credential from the chain, gets **HTTP 402**, applies its spending policy (payTo must equal the verified card's wallet; ≤ 1 CCD per call; ≤ 25 CCD per day, computed from its own on-chain history), signs a **V1 sponsored transfer** with its own key, and pays.
2. An **independent facilitator** (own service, own account) checks 9 rules, co-signs as sponsor and settles; it sponsors only payments to registered agents. **MainsMarker (seller)** then reviews the answer (cloud model or a private self-hosted model) and writes an **audit memo** on-chain; if the review fails after payment, it refunds on-chain.
3. StudyBuddy hashes the review it received, confirms it equals the anchored hash, and anchors its **own receipt memo**. Anyone can verify a review with its shareable link: review hash, input hash and the buyer's receipt are read **straight from the chain in the browser**, without asking the seller. "Try a tampered review" shows the chain rejecting a changed score; "Simulate a reviewer outage" shows a paid-but-failed review refunded on-chain.

## Judging criteria → how we meet it
| Criterion | How we meet it | Evidence |
|---|---|---|
| Depth of integration (identity, Agent Registry, agent payments) | Independent facilitator that sponsors only registered agents; two-party on-chain attestation (seller memo + buyer receipt); both agents registered in CIS-8004 with pinned card hashes (and a `setAgentURI` update when StudyBuddy moved domains); badge check + identity-credential check gate every payment; x402 exact scheme with V1 sponsored transactions; on-chain audit memos with rubric hash; MCP server | Registry #990/#991, txs above, `/api/facilitator`, `/api/rubric`, `/mcp` |
| Credible path to production | Per-review cost computed from the chain's own fee schedule (≈ €0.028 on-chain + ≈ €0.001 inference; price ≈ €0.10); who pays (platforms' buyer agents, billed in rupees); sponsor-key custody with a capped float; rate limits; batch memos | README "Path to production" |
| It works (end-to-end demo) | One click runs the full flow across three services with real testnet transactions in ~8–10 s; step timings are the agent's real timings; a second, unrelated account bought through the 60-line CLI | Live demo, CLI tx https://ccdexplorer.io/testnet/transaction/a87c78fc34f5627bca6d21dcf20d00edf191d4d6395301b25e39bbca13bc686a |
| Usefulness | Answer review is the bottleneck of Mains preparation; a pay-per-call, auditable reviewer that any study agent can use; a sanity check shows it ranks weak/medium/strong answers correctly (2.2 / 7.2 / 8.5 of 15, ±1 between runs) | Live page, `/api/stats`, README eval table |

## Path to production (summary)
Mainnet network id and registry, keys in a KMS, sponsor float topped up daily; per-buyer limits in a Durable Object; stablecoin PLT pricing when available; human-graded evaluation set before charging real money; distribution through study apps and Telegram/WhatsApp tutor bots that run buyer agents.

## Team and disclosure
Team lead: Akshay Wagh. Built by Tab, an AI assistant, for team lead Akshay Wagh. Design feedback came from AI critics (Skydive, Fo, Gemini) across three rounds (v1 → v2 → v3); see `ROUNDS.md`. Hosted on Vercel (free tier) with a sites.tab.bot mirror. Testnet only.
