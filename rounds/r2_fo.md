Docs read. Now the live demo, buyer agent, and the seller card.
---
The run completed in 9.1s with real testnet txs. Now verifying the review against the chain, as a judge would.
---
Verification matched. Before I score, checking the video link and the facilitator/rubric endpoints the submission cites.
---
Judged it live: bought a review (9.1 s, real testnet txs), verified the hash in-browser ("✓ Match"), read the repo, cards, facilitator and buyer policy. One thing broke: the demo video link is a 404 — https://mainsmarker.sites.tab.bot/demo.mp4 is referenced in both README and SUBMISSION.md and returns nothing.

Scores as it stands

Depth of integration: 9 — registry #990/#991 with pinned card hashes, badge + identity-credential gating, x402 V1 sponsored, 9-check facilitator, rubric-hash memos, MCP. Rare depth.
Credible path to production: 7 — real fee math, sponsor float cap, KMS, Durable Object plan. Held back by in-memory rate limits and no settlement-failure story.
It works (end-to-end demo): 6 — the live flow is excellent; the demo video is dead and the manual verifier needs insider knowledge.
Usefulness: 7 — real problem, right buyer; no evidence the reviews are actually good.

Top 6 improvements, by score impact

Record and ship demo.mp4 (criterion: It works). Both README and SUBMISSION link a 404. A judge who clicks it before the live demo starts at a credibility deficit. A 2-minute screencast of the run you already have (button → 9.1 s → verify) fixes this today.

Make "Verify any review" self-serve (It works + Depth). The manual form needs the audit hash AND the review JSON pasted by hand, and the page exposes neither for past reviews — the proof block shows only the sha256. Add "copy review JSON" / "copy audit hash" to the proof block and make each audit-log row click-to-fill the verifier. Verification is your whole pitch; right now it only works for the review you just bought.

Verify the input hash too, not just the review hash (Depth). The memo anchors input hash + review hash, but the verifier recomputes only the review hash, so a judge can confirm "this review text was anchored" but not "this review was produced for this answer." Accept question + answer in the same form and show both checks. That closes the actual accountability loop and is a two-line change to the existing canon() code.

Publish evidence the reviews are good (Usefulness). Every review on the log reads like generic LLM feedback ("add depth, Indian examples"). Grade 10 real Mains answers yourself, publish agent-vs-your scores next to the rubric, even a tiny table in the README. Without it, €0.10/review is asserted, not shown, and this is the difference between 7 and 9 on usefulness.

Put the price and x402 accept block in the Agent Card (Depth/Usefulness). The card has no price, no payment-requirements pointer, and authentication.schemes is empty. "Any x402 client can buy a review" is currently true only after reading your README. External agents discover via the card; bake the 402 endpoint, price and scheme into it.

Show the hardening, don't just promise it (Production). Per-payer limits live in worker memory and you say so; a judge can't tell the float balance or limits exist at all. Expose /api/facilitator limits + sponsor float live, and add one paragraph: what happens if payment settles but the review fails (retry, refund memo). Cheap to state, and it moves production from 7 to 8.

Biggest single win: 1 and 2 together cost you under an hour and lift the "It works" criterion from 6 to 8, because that criterion is judged by exactly the two clicks you told me to do.