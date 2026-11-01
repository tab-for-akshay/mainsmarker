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
