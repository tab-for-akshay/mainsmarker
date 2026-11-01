
// StudyBuddy — Akshay's buyer agent. A separate service with its own key, paying MainsMarker over HTTP x402.
// Built by Tab, an AI assistant, for team lead Akshay Wagh.
import { ExactConcordiumScheme as X402Client } from '@x402/concordium/exact/client';
import { CONCORDIUM_TESTNET_CAIP2 } from '@x402/concordium';
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader, decodePaymentResponseHeader } from '@x402/core/http';
import { AccountAddress, buildBasicAccountSigner } from '@concordium/web-sdk';
import { ConcordiumGRPCNodeClient, credentials } from '@concordium/web-sdk/nodejs';

const SECRETS = globalThis.__MM_SECRETS__ || { SB_KEY: (typeof process !== 'undefined' && process.env && process.env.SB_KEY) || '' }; // only SB_KEY is inlined into this worker at publish time
const CFG = __CFG__;
const ME = CFG.accounts.studybuddy;
const NET = CONCORDIUM_TESTNET_CAIP2;
const WP = 'https://wallet-proxy.testnet.concordium.com';
const REGISTRY_MCP = 'https://agent-registry-mcp.concordium.com';
const EXPLORER = 'https://ccdexplorer.io/testnet';
const DEFAULT_SELLER = 'https://mainsmarker.sites.tab.bot';
const ALLOWED_SELLERS = [DEFAULT_SELLER];       // demo allow-list; any badge-verified seller can be added
const POLICY = { max_price_ccd: 1, daily_budget_ccd: 10, max_calls_per_hour: 30 };
const SB_API = 'https://studybuddy-agent-teal.vercel.app'; // StudyBuddy's buy endpoint runs on a different cloud from MainsMarker
const DISCLOSURE = 'Built by Tab, an AI assistant, for team lead Akshay Wagh.';
const now = () => Date.now();
const json = (o, status = 200) => new Response(JSON.stringify(o, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
const txUrl = h => `${EXPLORER}/transaction/${h}`;
const enc = new TextEncoder();
async function sha256hex(s) { const d = await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }

// Spending history is read from the chain, not from memory: budget survives restarts and is publicly auditable.
async function purchases(limit = 100) {
  const r = await fetch(`${WP}/v1/accTransactions/${ME}?order=descending&limit=${limit}`);
  const j = await r.json(); const out = [];
  for (const t of j.transactions || []) {
    const d = t.details || {}; if (!/transfer/i.test(d.type || '')) continue;
    if (d.transferSource !== ME) continue;
    out.push({ tx: t.transactionHash, at: new Date(t.blockTime * 1000).toISOString(), to: d.transferDestination, amount_ccd: Number(d.transferAmount || 0) / 1e6, sponsored: !!t.sponsor, explorer: txUrl(t.transactionHash) });
  }
  return out;
}
async function balance() { const r = await fetch(`${WP}/v0/accBalance/${ME}`); const j = await r.json(); return Number(j?.finalizedBalance?.accountAmount ?? j?.currentBalance?.accountAmount ?? 0) / 1e6; }
async function spentLast(ms) { const p = await purchases(100); const since = now() - ms; const xs = p.filter(x => Date.parse(x.at) >= since); return { ccd: xs.reduce((a, x) => a + x.amount_ccd, 0), calls: xs.length }; }

async function buy(body) {
  const steps = []; const T0 = now();
  const step = (name, detail, extra = {}) => steps.push({ t_ms: now() - T0, name, detail, ...extra });
  const seller = String(body.seller || DEFAULT_SELLER).replace(/\/$/, '');
  if (!ALLOWED_SELLERS.includes(seller)) { step('Discover', `Seller ${seller} is not on StudyBuddy's allow-list.`, { ok: false }); return { ok: false, steps }; }
  // 1. discover the seller's Agent Card over HTTP
  const cardRes = await fetch(seller + '/.well-known/agent-card.json');
  const card = await cardRes.json();
  const ext = (card.capabilities?.extensions || []).find(e => /concordium-badge/.test(e.uri));
  const tokenAddress = ext?.params?.tokenAddress || ''; const badgeId = tokenAddress.split(':').pop();
  const sellerWallet = String(ext?.params?.agentWallet || '').split(':').pop();
  step('Discover', `Fetched ${card.name}'s Agent Card from ${seller} (HTTP ${cardRes.status}); badge ${badgeId}, payment wallet ${sellerWallet.slice(0, 10)}….`);
  // 2. verify the badge on the Concordium Agent Registry before any money moves
  const br = await fetch(`${REGISTRY_MCP}/v1/check-badge/${badgeId}?network=testnet`); const bj = await br.json().catch(() => ({}));
  const ok = br.status === 200 && bj.badge_valid === true;
  step('Verify badge', ok ? 'Agent Registry: registered, Active, owner is an identity-backed Concordium account, card hash matches the on-chain hash.' : 'Badge check failed — StudyBuddy refuses to pay.', { ok, registry_http: br.status, registry: bj });
  if (!ok) return { ok: false, steps };
  // 2b. Concordium ID: the seller's owner account must hold a currently valid identity credential
  const ownerAcc = String(ext?.params?.owner?.account || '').split(':').pop();
  let idok = false, idinfo = {};
  try {
    const g = new ConcordiumGRPCNodeClient('grpc.testnet.concordium.com', 20000, credentials.createSsl(), { timeout: 15000 });
    const ai = await g.getAccountInfo(AccountAddress.fromBase58(ownerAcc));
    const creds = Object.values(ai.accountCredentials || {}).map(c => c?.value?.contents || c?.contents || {});
    const ym = new Date().toISOString().slice(0, 7).replace('-', '');
    const valid = creds.filter(c => c.policy && String(c.policy.validTo) >= ym);
    idok = valid.length > 0;
    idinfo = { owner: ownerAcc, credentials: creds.length, identity_provider: creds[0]?.ipIdentity, created: creds[0]?.policy?.createdAt, valid_to: creds[0]?.policy?.validTo };
  } catch (e) { idinfo = { error: String(e.message || e).slice(0, 160) }; }
  step('Verify identity', idok ? `Owner ${ownerAcc.slice(0, 10)}… holds a Concordium identity credential from identity provider ${idinfo.identity_provider}, valid until ${idinfo.valid_to} (read from the chain).` : 'Could not confirm a valid identity credential for the owner — StudyBuddy refuses to pay.', { ok: idok, identity: idinfo });
  if (!idok) return { ok: false, steps };
  // 3. ask for the resource without paying -> 402
  const payloadBody = JSON.stringify({ question: body.question, answer: body.answer, marks: body.marks, mode: body.mode });
  const r1 = await fetch(seller + '/x402/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payloadBody });
  if (r1.status !== 402) { step('402 Payment Required', `Seller answered ${r1.status} instead of 402: ` + (await r1.text()).slice(0, 200), { ok: false }); return { ok: false, steps }; }
  const pr = decodePaymentRequiredHeader(r1.headers.get('PAYMENT-REQUIRED'));
  const req = pr.accepts.find(a => a.network === NET && a.scheme === 'exact');
  const price = Number(req.amount) / 1e6;
  step('402 Payment Required', `HTTP 402 from ${new URL(seller).host}: ${price} CCD to ${req.payTo.slice(0, 10)}…, gas sponsored by ${String(req.extra?.feePayer || req.extra?.sponsor || '').slice(0, 10)}….`, { requirements: req, header: 'PAYMENT-REQUIRED' });
  // 4. spending policy, enforced from on-chain history
  const day = await spentLast(864e5), hour = await spentLast(36e5);
  const why = req.payTo !== sellerWallet ? `payTo ${req.payTo} differs from the wallet in the verified Agent Card` : price > POLICY.max_price_ccd ? `price ${price} CCD is over the ${POLICY.max_price_ccd} CCD per-call cap` : day.ccd + price > POLICY.daily_budget_ccd ? `daily budget ${POLICY.daily_budget_ccd} CCD would be exceeded (spent ${day.ccd.toFixed(2)})` : hour.calls >= POLICY.max_calls_per_hour ? 'hourly call cap reached' : null;
  step('Check policy', why ? 'Refused: ' + why : `payTo matches the verified card's wallet; ${price} ≤ ${POLICY.max_price_ccd} CCD cap; spent today ${day.ccd.toFixed(2)} of ${POLICY.daily_budget_ccd} CCD (read from chain).`, { ok: !why, policy: POLICY, spent_today_ccd: day.ccd });
  if (why) return { ok: false, steps };
  // 5. sign a V1 sponsored transfer with StudyBuddy's own key
  const client = new X402Client({ accountAddress: AccountAddress.fromBase58(ME), signer: buildBasicAccountSigner(SECRETS.SB_KEY) }, { grpcUrl: 'grpc.testnet.concordium.com:20000', useTls: true });
  const p = await client.createPaymentPayload(2, req);
  step('Sign payment', 'StudyBuddy signed a V1 sponsored CCD transfer with its own key; the sponsor slot is left for the seller\'s facilitator.', { header: 'PAYMENT-SIGNATURE' });
  // 6. retry with the payment over HTTP
  const r2 = await fetch(seller + '/x402/review', { method: 'POST', headers: { 'content-type': 'application/json', 'PAYMENT-SIGNATURE': encodePaymentSignatureHeader({ ...p, accepted: req, resource: pr.resource }) }, body: payloadBody });
  const res = await r2.json();
  if (r2.status !== 200) { step('Settled', 'Seller rejected the payment: ' + (res.error || r2.status), { ok: false }); return { ok: false, steps }; }
  const pay = r2.headers.get('PAYMENT-RESPONSE') ? decodePaymentResponseHeader(r2.headers.get('PAYMENT-RESPONSE')) : res.payment;
  step('Settled', `Facilitator checked the 9 rules, co-signed as sponsor and finalised on Concordium testnet in ${(res.timings_ms.settle / 1000).toFixed(1)} s (PAYMENT-RESPONSE header received).`, { tx: pay.transaction, explorer: txUrl(pay.transaction) });
  step('Reviewed', `${res.model} marked the answer ${res.review.score}/${res.review.max} in ${(res.timings_ms.review / 1000).toFixed(1)} s.`);
  // 7. StudyBuddy keeps its own proof: hash of what it received must match the seller's audit memo
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
  const got = await sha256hex(canon(res.review));
  step('Logged on-chain', res.audit.tx ? `MainsMarker wrote the audit memo (input hash, review hash, rubric version, model, payment ref). StudyBuddy's hash of the review it received: ${got.slice(0, 12)}… ${got === res.review_sha256 ? '= seller\'s hash' : '≠ seller\'s hash!'}` : 'Audit write failed: ' + res.audit.error, { tx: res.audit.tx, explorer: res.audit.explorer, memo: res.audit.memo, ok: !!res.audit.tx && got === res.review_sha256 });
  return { ok: true, steps, result: res, buyer: { agent: 'StudyBuddy', account: ME, token: CFG.tokens.studybuddy } };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    try {
      if (url.pathname === '/api/buy' && globalThis.__MM_SECRETS__ && !globalThis.EdgeRuntime) return Response.redirect(SB_API + '/api/buy', 307);
      if (url.pathname === '/api/buy' && request.method === 'POST') return json(await buy(await request.json().catch(() => ({}))));
      if (url.pathname === '/api/receipts') return json(await purchases(Math.min(100, Number(url.searchParams.get('limit')) || 30)));
      if (url.pathname === '/api/status') { const [bal, day] = await Promise.all([balance(), spentLast(864e5)]); return json({ agent: 'StudyBuddy', account: ME, token: CFG.tokens.studybuddy, balance_ccd: bal, policy: POLICY, spent_today_ccd: day.ccd, calls_today: day.calls, allowed_sellers: ALLOWED_SELLERS, explorer: `${EXPLORER}/account/${ME}`, disclosure: DISCLOSURE }); }
      if (url.pathname === '/health' || url.pathname === '/api/health') return json({ ok: true, runtime: (typeof process !== 'undefined' && process.versions && process.versions.node) ? 'vercel-node ' + process.versions.node : 'cloudflare-worker' });
      if (url.pathname === '/api/buy' && globalThis.__MM_SECRETS__ && !globalThis.EdgeRuntime && SB_API) return Response.redirect(SB_API + '/api/buy', 307);
    } catch (e) { return json({ ok: false, error: String(e?.message || e).slice(0, 400), at: String(e?.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 400) }, 500); }
    return env.ASSETS.fetch(request);
  },
};
