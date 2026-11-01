# Round 3 — Fo (wajo.ai), https://wajo.ai/fo/c/2df3a3eb-4f5d-4020-958d-4d4c9cb2cc76

I'll judge this hands-on: open the demo, run the flow, and read the repo before scoring.
---
Read the paper trail. Now I'll run the demo itself: buy a review on the live page, then use the verify flow.
---
Page is live with the audit log populated. Now clicking the main buy button to run the full agent flow.
---
The buy is running. I'll wait for it to finish, then test the verify flow.
---
The full buy ran end to end in 9.5 s with three on-chain transactions. Now testing the verify button and grabbing the full shareable link.
---
The in-page verify matched. Now opening the shareable verify link.
---
All three verify checks pass on the shareable link. Two last checks: the demo video file and ROUNDS.md.
---
Ran it myself: the buy flow completed end to end in 9.5 s with three real txs (payment d7bf3d3e…474ce7, seller memo 6748f285…08e018, buyer receipt 5536c0f1…a38ee), "Verify this review" returned ✓ Match, and the shareable link auto-verified with all three checks green (✓ Review matches, ✓ Input matches, ✓ Buyer receipt). The video link is live (1:58, video/mp4).

Scores as it stands: Depth of integration 9 · Path to production 7 · It works 8 · Usefulness 6.

Top 6, by score impact:

Fix the audit-log headline number. It says "15 paid reviews · 20007.0 test CCD earned"; 15 × 0.5 CCD is 7.5. A judge does this arithmetic before anything else, and a wrong stat on your own evidence page poisons trust in everything else. It works, credibility.

Human-grade a small eval set now. Your weakest criterion is Usefulness because nothing shows the reviews are good: the only evidence is a 3-answer self-graded sanity table, and the README pushes agent-vs-human scoring to "before charging real money". Grade 10 real answers against one experienced grader or published marks and publish the deltas; it's a few hours and moves Usefulness from 6 to 8.

Demonstrate the refund path on-chain. Refund-on-failure is v3's headline change and there is zero evidence of it anywhere: no refund memo tx, no demo. Force one post-settlement failure (a poison input), show the refund memo in the audit log. A claimed recovery path without a transaction is worth less than the code behind it.

Cut the seller out of verification. The shareable link's buyer-receipt check goes through mainsmarker's own /api/cosign, and /api/audit is also seller-hosted. "The chain is the database, no server-side storage to trust" is undercut when the verifier calls the seller's API. Point the verifier at a public node or CCDExplorer directly, or ship a standalone verifier page that only talks to the chain.

Publish a score histogram and per-criterion subscores. Every review in the log is 6.5 or 7.5 of 15; 15 data points in a two-value band reads as a binary grader, and it also makes the feedback less actionable. Subscores per rubric criterion give the buyer agent something to act on and visibly widen the distribution.

Make the sponsor trust legible. The "independent" facilitator is one Vercel function from the same operator, which is the trust anchor of the whole sponsored design. Add to the card and facilitator page: sponsor key custody, the float cap, rotation plan, and the buyer's behavior when the facilitator is down. Path-to-production graders ask exactly this.

Small nits: the card's authentication.schemes is an empty array (the note covers it, but list PAYMENT-SIGNATURE as the scheme), and the page's step 1 says "ERC-8004" on a Concordium-only flow.