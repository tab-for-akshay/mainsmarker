# MainsMarker (Concordium) — review rounds

Built by Tab, an AI assistant, for team lead Akshay Wagh.

## Round 1 — v1 (live 2026-11-01 19:36Z)
Critics: **Skydive** (agent Arden; fetched the card, page and audit API itself), **Fo** (wajo.ai, opened the live demo and ran the full flow itself: 7.6 s, "✓ Match" on verify) and **Gemini 3.5 Flash** (Hark at daily limit).

Scores v1 — Skydive: Depth 7, Path 4, It works 7, Usefulness 5. Fo: Depth 7, Path to production 5, It works 7, Usefulness 6. Gemini: Depth 8.5, Path 3.5*, It works 7.5, Usefulness 5.5 (*Gemini saw a truncated copy of the path section).

Top changes taken into v2:
1. Make StudyBuddy a genuinely separate agent: its own worker/domain and key, calling MainsMarker cross-origin over real HTTP x402 (Fo #1).
2. Fix audit-log lag: show the new record as "pending finality" at once and fill it in when final; link it from the proof panel (Fo #3).
3. Path to production with numbers: mainnet unit economics, who pays and how; sponsor-key custody; list the 9 facilitator rules; add per-payer rate limit (Fo #4, #5; Gemini #1, #4).
Also: anchor the rubric/prompt version hash in each audit memo (Gemini #6); runnable external buyer script + a buy from a fresh account (Fo #6); demo video (both).

From Skydive (taken into v2): canonical JSON for the review hash and the full input hash in the memo; a verifier that accepts any pasted review + tx; real step timings instead of a timer-driven step list; an identity-credential check before paying; a usage counter; the 9 rules listed.

Raw critiques: rounds/r1_skydive.md, rounds/r1_fo.md, rounds/r1_gemini.md

## Round 2 — v2 (live 2026-11-01 20:13Z)
Critics: **Fo** (bought a review itself in 9.1 s, verified "✓ Match"), **Skydive / Arden** (ran the buy and "Verify any review" itself: ✓ Match), **Gemini 3.5 Flash-Lite** (from README + run log).

Scores v2 — Fo: Depth 9, Path 7, It works 6, Usefulness 7. Skydive: Depth 8, Path 7, It works 7, Usefulness 5. Gemini: 10 / 8 / 9 / 7.
(v1 → v2, Fo: Depth 7→9, Path 5→7; Skydive: Path 4→7.)

What both browsing critics flagged: the demo video link was a 404; "Verify any review" needs hand-pasted JSON; nothing shows the reviews are good.

Taken into v3:
1. Ship the ≤3-min demo video at /demo.mp4 (Fo #1, Skydive #1).
2. One-click verification: "copy verify link" on every review (the link carries the review and audit tx; the page auto-verifies), and check the **input** hash too, not just the review hash (Fo #2–3, Skydive #6).
3. **Two-party proof**: StudyBuddy anchors its own receipt memo (hash of the review it received + the seller's audit tx), so a seller can't anchor a review the buyer never got (Skydive #3).
4. **Facilitator separated from the seller**: an independent x402 facilitator service on its own cloud and account (Skydive #2).
5. Settlement-succeeded-but-review-failed path: automatic refund with an on-chain refund memo (Fo #6).
6. Price, scheme and x402 endpoint in the Agent Card; card re-pinned on-chain (Fo #5).
7. A small, honest quality check published (consistency and strong-vs-weak discrimination; not a human evaluation) (Fo #4, Skydive #5).
Not taken: broadening beyond UPSC (Gemini #4; the point is a real user), docker local chain (Gemini #5).

Raw: rounds/r2_fo.md, rounds/r2_skydive.md, rounds/r2_gemini.md

## Round 3 — v3 (live 2026-11-01 20:27Z), final check
Critics: **Fo** (bought a review itself in 9.5 s; ✓ Match in-page; the shareable link went all green: review, input, buyer receipt) and **Skydive / Arden** (ran the buy, verify and verify link itself).

Scores v3 — Fo: Depth 9, Path 7, It works 8, Usefulness 6. Skydive: Depth 8, Path 6, It works 9, Usefulness 5 (28/40).
(Fo across rounds: Depth 7→9→9, Path 5→7→7, It works 7→6→8.)

Taken into v3 final (live 2026-11-01 20:47Z, now hosted on Vercel at https://mainsmarker.vercel.app with the sites.tab.bot mirror):
1. **The verifier no longer asks the seller.** Audit memo and buyer receipt are read straight from Concordium's public wallet-proxy in the browser (Fo #4, Skydive #3).
2. **"Try a tampered review"** shows the chain rejecting a changed score (✗ Review does not match) (Skydive #1).
3. **Refund path proven on-chain:** "Simulate a reviewer outage" pays, fails on purpose and refunds with an `mm/refund` memo; refunds show in the audit log (Fo #3, Skydive #1). First real run: payment 4c503f20…, refund b32bfc86….
4. **Live step-by-step progress:** StudyBuddy streams each step as it happens (Skydive #5).
5. **Stats fixed:** the headline said "20007.0 test CCD earned" because a faucet top-up was counted; now only transfers of exactly the price count, refunds are subtracted (Fo #1).
6. **Per-criterion subscores** (rubric v1-b) so reviews are less of a two-value band and more actionable (Fo #5).
7. **Sponsor trust made legible:** custody, float cap, rotation, behaviour when the facilitator is down, on the facilitator page, `/api/facilitator` and README (Fo #6).
8. Fixes: "ERC-8004" wording on step 1 (both); private-mode model described plainly (Skydive #6); a nonce race between back-to-back buys found while testing (StudyBuddy now waits for its last receipt to finalise).
Not taken: a human-graded eval (Fo #2, Skydive #6): we will not invent human grades; it stays the first item on the roadmap. A per-judge funded buyer account (Skydive #2): the 60-line CLI already lets anyone pay from their own testnet account. Durable Object rate limiter (Skydive #4): needs a paid binding on these hosts; the money-critical budget is already on-chain. Card `authentication.schemes` (Fo nit): changing the card means re-pinning its hash; left as is, with the note in the card.

Raw: rounds/r3_fo.md, rounds/r3_skydive.md
