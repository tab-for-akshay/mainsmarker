# MainsMarker — submission (Concordium Trusted Agents Hackathon, Encode Club)

Built by Tab, an AI assistant, for team lead Akshay Wagh.

**One line:** an AI answer-review agent that proves who stands behind it, gets paid per review by other agents over x402 with sponsored gas, and logs every review on Concordium so anyone can check what it did.

- Live demo: https://mainsmarker.sites.tab.bot/
- Code: https://github.com/tab-for-akshay/mainsmarker (MIT)
- Demo video (≤3 min): https://mainsmarker.sites.tab.bot/demo.mp4 (YouTube link to follow)
- CCDExplorer: agent account https://ccdexplorer.io/testnet/account/4J2SFgeVrLHVqPkb3dczpYKP99wFMm7FDFp3fEPwXMff3ieLi2 · registration tx https://ccdexplorer.io/testnet/transaction/f617962730f5f803b4f893060cf5f90fc68fd53350e74bb382f0f60a0410101b · x402 sponsored payment https://ccdexplorer.io/testnet/transaction/7d581e7ae2d46adc36ccf870717f2db86b668372e47c212533dcbd4a7c91bc5e · audit memo https://ccdexplorer.io/testnet/transaction/066db2ed78c74806967b21259895b9323b16882133feb6db01266889c75c10a6

## What we built and how it works

MainsMarker reviews UPSC Mains answers (score, strengths, gaps, model outline, diagram tip). StudyBuddy is a buyer agent. In the demo, StudyBuddy:
1. reads MainsMarker's Agent Card and checks its **Verified by Concordium** badge on the Agent Registry (registered, Active, card hash = on-chain hash) — no pass, no payment;
2. calls `POST /x402/review`, receives **402** with `PAYMENT-REQUIRED`;
3. signs a **V1 sponsored CCD transfer** with `@x402/concordium` (sponsor = MainsMarker's facilitator);
4. retries with `PAYMENT-SIGNATURE`; the facilitator verifies 9 rules, co-signs as sponsor, submits and waits for finality;
5. MainsMarker reviews the answer and writes an **audit memo** on-chain: input hash, review hash, model, payment ref, score.
Anyone can then verify the review: the page recomputes SHA-256 of the review in the browser and compares it with the anchored hash.

## Concordium components used

| Component | How it is used |
|---|---|
| Agent Registry (CIS-8004) + Verified by Concordium badge | Both agents are registered (#990 MainsMarker, #991 StudyBuddy); Agent Cards built with the Registry MCP, hosted, hashes pinned with `setAgentURI`; badge check gates every payment |
| x402 payments | `@x402/concordium` exact scheme: client, server and facilitator, running inside a Cloudflare Worker via a gRPC-web shim |
| Sponsored transactions | V1 sponsored transfers: buyers pay the price, the facilitator pays the fee |
| Concordium ID | Every account (owner of each agent) is created from an identity issued by an identity provider (testnet IP for the demo); the badge therefore points to an accountable, identity-backed owner |
| Agent Registry MCP server | Used to build cards, registration and update payloads, and badge checks; MainsMarker also exposes its own MCP server |
| Accountability | On-chain audit memos per review (EU AI Act Art. 12-style logs), read back by `/api/audit` |

## Judging criteria → how we meet it

| Criterion | How MainsMarker meets it |
|---|---|
| Depth of integration (identity, Agent Registry, agent payments) | Two registered agents with badges; badge verification gates payment; x402 exact scheme with sponsored V1 transactions settled end-to-end; on-chain audit memos; MCP server |
| Credible path to production | Same code runs on mainnet by switching network id, registry contract `<10082,0>` and keys; see below |
| It works (end-to-end demo) | One click on the live site runs the full flow in ~10 s with real testnet transactions and explorer links |
| Usefulness | Answer review is the costliest, slowest part of UPSC preparation; pay-per-review with a public record makes AI feedback cheap and checkable |

## Path to production

1. **Mainnet:** switch CAIP-2 network to `ccd:9dd9ca4d19e9393877d2c44b70f89acb`, register on the official registry `<10082,0>`, keep keys in a KMS/HSM rather than worker secrets.
2. **Stable pricing:** price reviews in a PLT stablecoin (EURR/USDR are supported by `@x402/concordium`) — about ₹10 per review — instead of CCD.
3. **Real owner identity:** the agent owner account is created from a real ID-provider identity; add Verify & Access so learners can prove age/residency without sharing documents.
4. **Hosted facilitator:** move settlement to Concordium's or a third-party facilitator; keep our in-process one as a fallback.
5. **Quality and appeals:** publish the rubric hash on-chain, let a human mentor co-sign disputed reviews, and add rate limits and abuse checks.
6. **Distribution:** coaching institutes and study apps call the MCP/x402 endpoint from their own agents; learners pay per answer, no subscription.

## Team

Akshay Wagh (team lead). Built by Tab, an AI assistant, for team lead Akshay Wagh.
