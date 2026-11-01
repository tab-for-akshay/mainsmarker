Now testing "Verify any review" — I need a fresh review JSON, so I'll buy one via StudyBuddy's API directly, then feed it to the verifier.Ran the whole thing myself: full buy flow end-to-end (all 8 steps green, 8.6s, real tx), "Verify this review" ✓ Match, and the standalone "Verify any review" — I bought a fresh review via StudyBuddy's API directly and pasted it into the verifier: ✓ Match, anchored `94fd34be73…`, model and rubric prefix shown. Badge check against Concordium's own registry MCP passes cleanly. Scores first, then the fixes.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Depth of integration | **8** | CIS-8004 #990/#991 with pinned card hashes, badge + identity-credential check gating every payment, x402 exact/V1 sponsored, audit memos, MCP. Genuinely deep. Docked for the facilitator conflict below. |
| Credible path to production | **7** | Real unit economics from the chain's fee schedule, sponsor-key custody, Durable Object plan. But rate limits are in worker memory *today* and the sponsor is the seller. |
| It works | **7** | The flow itself is flawless and fast. But the demo video linked in README and SUBMISSION.md is a **404** (`/demo.mp4`), and `rounds/r1_*.md` files referenced in ROUNDS.md don't exist in the repo. |
| Usefulness | **5** | Real problem, but nothing demonstrates the reviews are *good* (no eval set), and "accountability" currently has no consequence attached. |

## Top 6 improvements, by score impact

1. **Fix the dead demo video (criterion 3, biggest single-point loss).** SUBMISSION.md's first evidence line points to a 404. Any judge who clicks it before the live page sees a broken submission. Ship the actual file at `/demo.mp4`, or delete the link — a broken primary evidence link reads as "didn't check their own submission."

2. **Separate the facilitator from the seller (criteria 1 & 2).** Right now MainsMarker sets the price, runs the facilitator that validates its own payment, sponsors the gas, and anchors the audit. That's the buyer and the referee being the same entity — it's the exact trust problem this hackathon is about. Concrete: run the facilitator as a distinct service with its own account and domain (you already have three clouds), or integrate an independent public facilitator. Even just moving it off the seller domain and labeling it in the UI moves this from 8 to 9 on depth.

3. **Make the audit record counter-signed by the buyer (criterion 1).** The memo is self-attested: a dishonest seller can anchor anything, including fabricated reviews, because only the seller signs it. You already have the hook — the x402 payment tx exists on *StudyBuddy's* account. Add a buyer co-signature (StudyBuddy signs the canonical review digest with its own key and the memo carries it), so verification fails if the seller anchors a review the buyer never received. This is the difference between "log" and "proof" and it's maybe 50 lines given both agents already hold keys.

4. **Attach a consequence to a bad review (criteria 1 & 4).** "Accountable" currently means "recorded," but a 4/15 review costs the seller nothing. Cheapest credible version: an on-chain challenge flow — a buyer can flag a review tx, MainsMarker re-reviews with a different model (you have two), both scores stay on-chain. Or publish a rolling on-chain score history per rubric version. Without any stake/reputation, judges will read the accountability claim as record-keeping only.

5. **Ship the evaluation set you promised (criterion 4).** The README says "human-graded evaluation set before charging real money" — that's a plan, not evidence, and it's the entire usefulness question. 20 real answers with your own marks vs. the agent's, mean absolute error published, one table. A judge doubting score quality (mine scored the pre-filled strong answer 6.5/15) has no rebuttal on the page.

6. **Make "Verify any review" one click and permanent (criteria 3 & 4).** It works (I verified), but the user must hand-paste a 1.5KB review JSON — nobody will. Add a "copy verify link" button on every review: URL carries the audit tx + review hash, the page fetches the review server-side (`/api/review/<tx>`) and auto-verifies. Also surface the **input hash** and **payment tx link** in the proof panel — they're in the memo but invisible in the UI, and the payment link is your independent cross-check from the buyer's side.

Honorable mention: StudyBuddy's `ALLOWED_SELLERS` is a hardcoded single-seller list, which undercuts the "pays any badge-verified agent" story — add a second registered seller, even a trivial one, to prove the gate generalizes.That task already fed into the review above — nothing new to add.
