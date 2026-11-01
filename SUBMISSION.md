# MainsMarker + StudyBuddy — submission (Concordium Trusted Agents Hackathon, Encode Club)

Built by Tab, an AI assistant, for team lead Akshay Wagh.

**One line:** two independent AI agents that trade on Concordium: a buyer that pays only badge-verified, identity-backed agents, within an on-chain budget, and a seller that is paid per call over x402 (gas sponsored) and leaves an on-chain audit record of every answer it gives.

- Live demo: https://mainsmarker.sites.tab.bot/ (one click: StudyBuddy buys a review, ~8–10 s, real testnet transactions)
- Buyer agent: https://studybuddy.sites.tab.bot/ (its API runs on a different cloud: https://studybuddy-agent-teal.vercel.app/api/status)
- Code: https://github.com/tab-for-akshay/mainsmarker (MIT)
- Demo video (≤ 3 min): https://mainsmarker.sites.tab.bot/demo.mp4
- CCDExplorer: x402 payment https://ccdexplorer.io/testnet/transaction/e5a085b1aa578598e3f17bd915d8db4fbb071c816f15a6e78723fe8aa75027ea · audit memo https://ccdexplorer.io/testnet/transaction/fefb80bea864530d8cfce075b22da2eb2cc292143789ddc7e8b299648181fd39 · registration https://ccdexplorer.io/testnet/transaction/f617962730f5f803b4f893060cf5f90fc68fd53350e74bb382f0f60a0410101b · external-account CLI payment https://ccdexplorer.io/testnet/transaction/a87c78fc34f5627bca6d21dcf20d00edf191d4d6395301b25e39bbca13bc686a

## Problem
UPSC Mains feedback on written answers is slow and expensive, and AI feedback is unaccountable: nobody can show which model, which rubric, or who stands behind it. Agents that buy services from other agents have the mirror problem: who are they paying?

## What we built
1. **StudyBuddy (buyer)** fetches MainsMarker's Agent Card over HTTP, checks the **Verified by Concordium** badge on the Agent Registry, reads the owner's **Concordium ID** credential from the chain, gets **HTTP 402**, applies its spending policy (payTo must equal the verified card's wallet; ≤ 1 CCD per call; ≤ 10 CCD per day, computed from its own on-chain history), signs a **V1 sponsored transfer** with its own key, and pays.
2. **MainsMarker (seller)** runs the x402 facilitator: 9 checks, co-signs as sponsor, waits for finality, reviews the answer (cloud model or a private self-hosted model), and writes an **audit memo** on-chain.
3. StudyBuddy hashes the review it received and confirms it equals the anchored hash. Anyone can do the same for any review on the page ("Verify any review").

## Judging criteria → how we meet it
| Criterion | How we meet it | Evidence |
|---|---|---|
| Depth of integration (identity, Agent Registry, agent payments) | Both agents registered in CIS-8004 with pinned card hashes (and a `setAgentURI` update when StudyBuddy moved domains); badge check + identity-credential check gate every payment; x402 exact scheme with V1 sponsored transactions; on-chain audit memos with rubric hash; MCP server | Registry #990/#991, txs above, `/api/facilitator`, `/api/rubric`, `/mcp` |
| Credible path to production | Per-review cost computed from the chain's own fee schedule (≈ €0.028 on-chain + ≈ €0.001 inference; price ≈ €0.10); who pays (platforms' buyer agents, billed in rupees); sponsor-key custody with a capped float; rate limits; batch memos | README "Path to production" |
| It works (end-to-end demo) | One click runs the full flow across two clouds with real testnet transactions in ~8–10 s; step timings are the agent's real timings; a second, unrelated account bought through the 60-line CLI | Live demo, CLI tx https://ccdexplorer.io/testnet/transaction/a87c78fc34f5627bca6d21dcf20d00edf191d4d6395301b25e39bbca13bc686a |
| Usefulness | Answer review is the bottleneck of Mains preparation; a pay-per-call, auditable reviewer that any study agent can use; the pattern generalises to any paid AI service | Live page, `/api/stats` usage counter |

## Path to production (summary)
Mainnet network id and registry, keys in a KMS, sponsor float topped up daily; per-buyer limits in a Durable Object; stablecoin PLT pricing when available; human-graded evaluation set before charging real money; distribution through study apps and Telegram/WhatsApp tutor bots that run buyer agents.

## Team and disclosure
Team lead: Akshay Wagh. Built by Tab, an AI assistant, for team lead Akshay Wagh. Design feedback came from AI critics (Skydive, Fo, Gemini) across three rounds; see `ROUNDS.md`. Testnet only.
