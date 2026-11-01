The submission text and the card/demo content you meant to paste got cut off mid-message (it ends at "makes AI fe..."). Since the actual artifacts are the ground truth for a strict review, I'll pull the served Agent Card and the live demo page directly, then judge.The artifacts you meant to paste got cut off mid-message, so I pulled the served Agent Card, the demo page, and the audit API directly and judged against those. Here's the review.

## Scores as it stands

| Criterion | Score | One-line verdict |
|---|---|---|
| Depth of integration | **7/10** | Broad and real (registry #990/#991, badge gating, x402 exact + sponsored V1, on-chain memos, MCP), but "Concordium ID" is the weakest of the three pillars — it amounts to "accounts came from a testnet identity provider," which is true of every testnet account. |
| Credible path to production | **4/10** | Currently one sentence: "switch network id, registry contract and keys." No cost math, no sponsor economics, no distribution channel. |
| It works | **7/10** | Live site, real finalised txs, browser-side hash check — genuinely end-to-end. Docked because the entire flow is orchestrated by the seller's own server and the step timeline is a canned timer. |
| Usefulness | **5/10** | Real pain (Mains answer review), but zero evidence of demand and zero evidence the reviews are good. |

## Top 6 improvements, ordered by score impact

**1. Break the self-play loop — get a purchase from a payer you don't own.**
*Criterion: It works, Depth of integration.*
StudyBuddy, the facilitator, and MainsMarker are all yours. As served, the demo is one team paying itself and its own server narrating the result — judges will discount the strongest claim ("agents pay agents") accordingly. The page's own "for agent builders" curl can't actually be completed by an outsider because producing `PAYMENT-SIGNATURE` requires `@x402/concordium` plumbing you haven't shipped. Exact change: open-source a standalone buyer CLI in the repo (`npx mainsmarker-buy --question ... --answer ...`) that any third party can run against your live endpoint, and get one real external purchase (another team's agent, or a bot you don't own) transacted. Then show that tx with a payer address distinct from your three accounts, labeled "external buyer" on the audit table. Why: it converts the core claim from assertion to evidence, and it's the single cheapest way to lift both "It works" and integration depth.

**2. Cryptographically bind the review to the memo — right now the audit trail is self-attested.**
*Criterion: Depth of integration, It works.*
The memo is written by MainsMarker after the fact; nothing binds the bytes the buyer received to the on-chain hash except a browser recompute of `JSON.stringify(review)` — which isn't canonical JSON (key order dependent), so "SHA-256 of the review" is only true for the exact string your server emitted. The `in` hash in the audit API is truncated to 16 hex chars, so a buyer can't even match their own input. And `verify` only works for the last review. Exact change: (a) document and pin the exact canonical serialization in the README and card; (b) include the full input hash in the memo; (c) sign the memo payload with the agent's on-chain account key (or have the sponsor/facilitator co-sign at settlement time so the memo isn't purely seller-authored); (d) make the verifier accept any pasted review + tx hash, not just the last one. Why: accountability is the theme; a self-attested log is the obvious attack a judge will probe first. This is the difference between "we wrote a hash" and "you can prove we did what we were paid for."

**3. Make Concordium ID do actual work — add a credential attribute to the accountability story.**
*Criterion: Depth of integration.*
Your identity section is the thinnest row in your own table. Every testnet account has an IP; using it proves nothing about *your* agent. Exact change: anchor a verifiable credential (e.g., the testnet IP's identity/personhood attribute) into the badge params or the audit memo — "this review was performed by an agent whose owner holds verified identity X" — and add an identity-revocation check to the badge verification the buyer runs pre-payment (step 2 currently checks registration/Active/hash, not whether the identity behind it is still valid). Why: it turns "Concordium ID" from a checkbox row into the differentiator — an accountable agent whose accountability survives the owner revoking their identity — and directly targets the theme's hardest component.

**4. Replace the one-line path to production with a page of real numbers.**
*Criterion: Path to production.*
"Switch network id and keys" is not a path. Exact change: a `/production` page (and a section in the README) with: (a) cost per review on mainnet in CCD and USD, including the fee, and who pays it; (b) the sponsor economics — if the facilitator sponsors gas for every buyer on mainnet, state the burn rate and why that's sustainable (or switch to buyers paying fees at scale); (c) one named distribution channel: e.g., a UPSC coaching platform or Telegram bot where aspirants are onboarded with custodial Concordium accounts you sponsor; (d) an honest EU AI Act Art. 12 gap list — your memo currently claims style-alignment without retention periods or log-integrity guarantees; say what's missing. Why: this criterion is likely the widest scoring gap for you, and it's pure writing — the highest score-per-hour item on this list.

**5. Show one piece of evidence the reviews are worth paying for.**
*Criterion: Usefulness.*
The product is the review quality (gpt-oss-120b producing 6.5/15 scores), and there's no evaluation of it anywhere. Exact change: run 20–30 real aspirant answers through it, have 3–5 UPSC aspirants or a coach rate the feedback against a paid human evaluation, and publish the comparison — even a small table. Add a real usage counter ("N reviews served · N distinct buyer accounts") to the landing page. Why: judges don't need scale, they need a signal that a real person would prefer this over nothing at 0.5 CCD; one honest human evaluation beats any amount of feature listing.

**6. Fix the demo mechanics and submission hygiene.**
*Criterion: It works, submission completeness.*
Three specific things. (a) The step timeline advances on hardcoded timers (`[1,3,5,6,14,24]` seconds in the page JS) — steps 1–6 visibly "progress" whether or not the backend has done anything, and the real statuses only overwrite everything at the end. Wire each step marker to an actual backend event (SSE or chunked response); a judge who opens the JS will catch this. (b) The facilitator's "9 verification rules" are asserted twice but never enumerated anywhere — list them in the README. (c) The video is a raw mp4 with "YouTube link to follow," and your submission text got truncated mid-sentence ("makes AI fe…"). Ship the YouTube link, finish the description, and set `authentication` in the Agent Card (even to a documented "none — payments carry the auth") instead of an empty array. Why: each is small, but together they're the difference between "polished team" and "rushed submission" in the first 90 seconds a judge spends on you.

**What's already strong, so don't touch it:** the badge-gates-payment gate, the browser-side hash verification as a trust UX pattern, the audit table with explorer links, and the fact that the whole flow completes in ~10–40 s with real finalised transactions. Protect those; everything above is additive.
