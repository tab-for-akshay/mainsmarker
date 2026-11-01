# MainsMarker — an accountable AI answer-review agent on Concordium

**Live demo:** https://mainsmarker.sites.tab.bot/ · **Network:** Concordium testnet · **License:** MIT

> Built by Tab, an AI assistant, for team lead Akshay Wagh. Entry for the Concordium Trusted Agents Hackathon (Encode Club, 2026).

MainsMarker reviews answers written for India's UPSC Civil Services / Forest Service Mains exams. It is an *agent other agents can trust and pay*:

1. **Verified identity.** MainsMarker is agent **#990** in the CIS-8004 Agent Registry (testnet contract `<12802,0>`). Its badge `JyP9Y5PqyaZge2fzDzyQa` resolves to an identity-backed Concordium account, and the SHA-256 of its Agent Card (served at `/.well-known/agent-card.json`) is pinned on-chain. The card carries the *Verified by Concordium* A2A extension and an ERC-8004 `registrations` entry.
2. **Pay per call with x402.** `POST /x402/review` answers **HTTP 402** with `PAYMENT-REQUIRED` (scheme `exact`, network `ccd:4221332d34e1694168c2a0c0b3fd0f27`, 0.5 test CCD). The buyer signs a **V1 sponsored transaction** with `@x402/concordium`; MainsMarker's facilitator verifies the 9 rules, adds the sponsor signature, pays the fee and waits for finality. Buyers never need CCD for gas.
3. **Verify before paying.** The buyer agent, **StudyBuddy** (agent #991), checks MainsMarker's badge on the Agent Registry (`/v1/check-badge`) and refuses to pay if it is not registered, Active and hash-matched.
4. **Accountability log.** After every paid review MainsMarker writes an audit memo from its own account: review id, SHA-256 of the input, SHA-256 of the review, model name, payment tx prefix and score. The chain *is* the log: `/api/audit` reads it back, and anyone can recompute the review hash in the browser and compare (EU AI Act Article 12-style record keeping, with the payer linked through the payment tx).
5. **MCP server.** `POST /mcp` (JSON-RPC 2.0) exposes `get_payment_requirements`, `review_answer` (x402-gated), `get_audit_log`, `verify_review`.
6. **Private model option.** "Private self-hosted" routes the review to Tab's own open-weights model (Huihui-Qwythos-9B abliterated, self-hosted), falling back to cloud models; the model actually used is written on-chain.

## Proof on testnet (CCDExplorer)

| What | Transaction |
|---|---|
| Register MainsMarker (CIS-8004 `register`) | [f617962730f5…](https://ccdexplorer.io/testnet/transaction/f617962730f5f803b4f893060cf5f90fc68fd53350e74bb382f0f60a0410101b) |
| Pin final Agent Card hash (`setAgentURI`) | [0e683e9d3545…](https://ccdexplorer.io/testnet/transaction/0e683e9d35458281f5a30053a96cfd07fd0b1f4c0db9d0d54a03c47e135b40ef) |
| Register StudyBuddy (buyer agent) | [b41da04fc4f4…](https://ccdexplorer.io/testnet/transaction/b41da04fc4f4b931c2ade0e62992511573dcf5e98b93413a752d9e181862a6aa) |
| First x402 sponsored payment (StudyBuddy → MainsMarker) | [9e1b62cd5d2f…](https://ccdexplorer.io/testnet/transaction/9e1b62cd5d2f5fa0bf9d7617fb8eaf09d6c4e7936767956b8b6fc8184a4ffcfa) |
| Live-demo payment + audit memo | [7d581e7a…](https://ccdexplorer.io/testnet/transaction/7d581e7ae2d46adc36ccf870717f2db86b668372e47c212533dcbd4a7c91bc5e) · [066db2ed…](https://ccdexplorer.io/testnet/transaction/066db2ed78c74806967b21259895b9323b16882133feb6db01266889c75c10a6) |

Accounts: MainsMarker [4J2SFgeVrL…](https://ccdexplorer.io/testnet/account/4J2SFgeVrLHVqPkb3dczpYKP99wFMm7FDFp3fEPwXMff3ieLi2) · StudyBuddy [4L8TkAeST2…](https://ccdexplorer.io/testnet/account/4L8TkAeST26KMDvTajRZbnqxUYCWGgrBUUzeZkZ1awEKcTt2aG) · Facilitator/sponsor [3p6DTnSwRw…](https://ccdexplorer.io/testnet/account/3p6DTnSwRwczJL5JxmB89jveUFJq6x6npc1azREG7bzXvQiP6c)

## Architecture

```
Browser / any x402 client / MCP client
        │
        ▼
Cloudflare Worker (one file, worker/worker.js → bundled)
  ├─ /x402/review     402 → verify+settle (in-process x402 facilitator, sponsor key) → LLM review → audit memo tx
  ├─ /api/demo/buy    StudyBuddy agent: badge check → 402 → sign sponsored payment → retry
  ├─ /api/audit       reads audit memos back from the chain (wallet-proxy)
  ├─ /api/verify      SHA-256(review) vs anchored hash
  ├─ /mcp             JSON-RPC MCP tools
  └─ static: index.html, /.well-known/agent-card.json, /agents/studybuddy.json
        │ gRPC-web (fetch)                   │ HTTPS
        ▼                                    ▼
Concordium testnet node             Agent Registry MCP (check-badge)   LLMs (cloud + self-hosted)
```

Cloudflare Workers cannot use HTTP/2 gRPC, so `worker/grpcshim.js` maps the Node gRPC client that `@x402/concordium` asks for onto `ConcordiumGRPCWebClient` (gRPC-web over `fetch`). That one shim lets the official x402 client, server and facilitator run at the edge.

## Why it matters

Lakhs of aspirants prepare for UPSC Mains every year, and answer writing is the hardest part to practise alone; human evaluation is paid per answer and slow. An AI reviewer is cheap but unaccountable: which model marked me, was the feedback changed later, who stands behind it? MainsMarker answers those questions with Concordium: a verified owner, pay-per-use without subscriptions or card details, and a public, tamper-evident record of every review. The same pattern fits any paid AI evaluation (code review, essay grading, compliance checks).

## How to run

```bash
npm install
# 1. testnet accounts (test identity provider, no real ID): scripts/genseed.mjs → scripts/idreq.mjs → follow the test-IP form → scripts/deploy.mjs 0|1|2
#    then the faucet: PUT https://wallet-proxy.testnet.concordium.com/v0/testnetGTUDrop/<address>
# 2. register agents with the Agent Registry MCP (build_agent_card → build_register → scripts/upd.mjs → build_set_agent_uri)
# 3. end-to-end x402 test from Node: CCD_SEED="…" node scripts/x402test.mjs
npm run build            # bundles worker/worker.js → build/worker.mjs
```
Secrets (account keys, LLM keys) are injected at deploy time as `globalThis.__MM_SECRETS__` and never committed.

## Roadmap / path to production

See [SUBMISSION.md](SUBMISSION.md#path-to-production).

## AI disclosure

Built by Tab, an AI assistant, for team lead Akshay Wagh. Code, text and the demo were produced by Tab; reviews are generated by LLMs (cloud: gpt-oss-120b via Groq, fallbacks gpt-oss-20b and Gemini; private: a self-hosted open-weights model). Reviews are practice feedback, not official UPSC evaluation. Testnet only; test identities use the Concordium testnet identity provider with fictional attributes.
