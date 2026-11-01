
// MainsMarker — an accountable answer-review agent on Concordium testnet.
// Built by Tab, an AI assistant, for team lead Akshay Wagh.
import { ExactConcordiumScheme as X402Client } from '@x402/concordium/exact/client';
import { ExactConcordiumScheme as X402Server } from '@x402/concordium/exact/server';
import { ExactConcordiumScheme as X402Facilitator } from '@x402/concordium/exact/facilitator';
import { CONCORDIUM_TESTNET_CAIP2, toConcordiumFacilitatorSigner } from '@x402/concordium';
import { encodePaymentRequiredHeader, decodePaymentSignatureHeader, encodePaymentResponseHeader, encodePaymentSignatureHeader } from '@x402/core/http';
import { ConcordiumGRPCWebClient, AccountAddress, AccountTransactionType, CcdAmount, DataBlob, TransactionExpiry, TransactionHash, buildBasicAccountSigner, signTransaction } from '@concordium/web-sdk';

const SECRETS = globalThis.__MM_SECRETS__ || {}; // set by a line prepended at publish time only (never committed)
const CFG = __CFG__;  // public chain config (accounts, badges, contracts)
const NET = CONCORDIUM_TESTNET_CAIP2;
const GRPC = 'https://grpc.testnet.concordium.com';
const WP = 'https://wallet-proxy.testnet.concordium.com';
const REGISTRY_MCP = 'https://agent-registry-mcp.concordium.com';
const EXPLORER = 'https://ccdexplorer.io/testnet';
const PRICE_MICRO = '500000'; // 0.5 test CCD per review
const DISCLOSURE = 'Built by Tab, an AI assistant, for team lead Akshay Wagh.';

let _client;
const grpc = () => (_client ||= new ConcordiumGRPCWebClient(GRPC, 20000, { timeout: 30000 }));
let _fac;
function facilitator() {
  if (!_fac) {
    const signer = toConcordiumFacilitatorSigner(CFG.accounts.facilitator, SECRETS.FAC_KEY, { host: 'grpc.testnet.concordium.com', port: 20000, useTls: true });
    _fac = new X402Facilitator({ signer, finalizationTimeoutMs: 60000 });
  }
  return _fac;
}

const enc = new TextEncoder();
async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s);
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// Canonical JSON (keys sorted recursively, no whitespace): the exact bytes every hash in MainsMarker is computed over.
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-Audit-Tx', ...headers } });
const txUrl = h => `${EXPLORER}/transaction/${h}`;
const accUrl = a => `${EXPLORER}/account/${a}`;
const now = () => Date.now();

// ---------- x402: payment requirements ----------
async function requirements(resourceUrl) {
  const server = new X402Server();
  const amt = await server.parsePrice({ amount: PRICE_MICRO, asset: 'CCD' }, NET);
  let req = { scheme: 'exact', network: NET, payTo: CFG.accounts.mainsmarker, amount: amt.amount, asset: amt.asset, maxTimeoutSeconds: 300, extra: amt.extra || {} };
  req = await server.enhancePaymentRequirements(req, { x402Version: 2, scheme: 'exact', network: NET, extra: facilitator().getExtra(NET) }, []);
  return {
    x402Version: 2,
    error: 'Payment required: 0.5 test CCD per answer review (gas sponsored by the facilitator).',
    resource: { url: resourceUrl, description: 'MainsMarker: accountable review of one UPSC Mains answer (score, feedback, model outline) with an on-chain audit record.', mimeType: 'application/json' },
    accepts: [req],
  };
}

// ---------- LLM review ----------
const RUBRIC_VERSION = 'mm-rubric-2026-11-01';
const SYS = `You are MainsMarker, a strict but fair UPSC Civil Services / IFoS Mains examiner.
Evaluate the candidate's answer to the question. Judge: directive word compliance (discuss/explain/critically examine...), introduction, structure, content accuracy and coverage, Indian examples and data, diagram/flowchart use where it earns marks, conclusion, and word limit (about 150 words for 10 marks, 250 for 15).
Be specific and actionable. Never invent statistics; if you mention a figure, say it must be checked.
Return ONLY JSON with keys:
"score" (number, to one decimal), "max" (number), "verdict" (one sentence),
"strengths" (array of up to 3 short strings), "improvements" (array of up to 4 short strings),
"missing_points" (array of up to 5 short strings), "model_outline" (array of 4-7 short lines: intro, body points, diagram idea, conclusion),
"diagram_tip" (string or ""), "word_count_note" (string).`;

let _rb; const rubricHash = async () => (_rb ||= await sha256hex(RUBRIC_VERSION + '\n' + SYS));
async function chat(url, key, model, messages, extra = {}, timeoutMs = 45000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages, temperature: 0.2, ...extra }) });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content;
    if (!r.ok || !text) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return text;
  } finally { clearTimeout(t); }
}
function parseReview(text, max) {
  let s = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  const o = JSON.parse(s.slice(a, b + 1));
  const arr = v => Array.isArray(v) ? v.map(String).slice(0, 7) : [];
  return {
    score: Math.max(0, Math.min(Number(max), Number(o.score) || 0)), max: Number(max),
    verdict: String(o.verdict || ''), strengths: arr(o.strengths), improvements: arr(o.improvements),
    missing_points: arr(o.missing_points), model_outline: arr(o.model_outline),
    diagram_tip: String(o.diagram_tip || ''), word_count_note: String(o.word_count_note || ''),
  };
}
async function review({ question, answer, marks, mode }) {
  const max = [10, 15, 20].includes(Number(marks)) ? Number(marks) : 10;
  const words = (answer.match(/\S+/g) || []).length;
  const messages = [{ role: 'system', content: SYS }, { role: 'user', content: `Question (${max} marks): ${question}\n\nCandidate answer (${words} words):\n${answer}` }];
  const tries = [];
  if (mode === 'private') tries.push(['self-hosted/huihui-qwythos-9b-abliterated', () => chat(SECRETS.PRIV_URL + '/chat/completions', SECRETS.PRIV_KEY, 'any', messages, { max_tokens: 900, chat_template_kwargs: { enable_thinking: false } }, 60000)]);
  tries.push(['groq/openai/gpt-oss-120b', () => chat('https://api.groq.com/openai/v1/chat/completions', SECRETS.GROQ, 'openai/gpt-oss-120b', messages, { max_tokens: 1800, reasoning_effort: 'low', response_format: { type: 'json_object' } })]);
  tries.push(['groq/openai/gpt-oss-20b', () => chat('https://api.groq.com/openai/v1/chat/completions', SECRETS.GROQ, 'openai/gpt-oss-20b', messages, { max_tokens: 1800, reasoning_effort: 'low', response_format: { type: 'json_object' } })]);
  tries.push(['google/gemini-3.5-flash-lite', () => chat('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', SECRETS.GEMINI, 'gemini-3.5-flash-lite', messages, { max_tokens: 1800 })]);
  const errors = [];
  for (const [model, fn] of tries) {
    try { const out = parseReview(await fn(), max); return { review: { ...out, words, model }, model, fallbacks: errors }; }
    catch (e) { errors.push(`${model}: ${String(e.message || e).slice(0, 120)}`); }
  }
  throw new Error('All models failed: ' + errors.join(' | '));
}

// ---------- accountability log (EU AI Act Art. 12 style) ----------
function cborText(s) {
  const b = enc.encode(s); const n = b.length; let h;
  if (n < 24) h = [0x60 + n]; else if (n < 256) h = [0x78, n]; else h = [0x79, n >> 8, n & 255];
  const out = new Uint8Array(h.length + n); out.set(h); out.set(b, h.length); return out;
}
function decodeCborTextHex(hex) {
  try {
    const b = Uint8Array.from(hex.match(/../g).map(x => parseInt(x, 16)));
    let off = 1, n = b[0] - 0x60;
    if (b[0] === 0x78) { n = b[1]; off = 2; } else if (b[0] === 0x79) { n = (b[1] << 8) | b[2]; off = 3; }
    return new TextDecoder().decode(b.slice(off, off + n));
  } catch { return null; }
}
async function anchorAudit(rec) {
  const memo = JSON.stringify(rec);
  if (enc.encode(memo).length > 250) throw new Error('memo too long');
  const me = AccountAddress.fromBase58(CFG.accounts.mainsmarker);
  const c = grpc();
  const nonce = (await c.getNextAccountNonce(me)).nonce;
  const tx = { type: AccountTransactionType.TransferWithMemo, header: { expiry: TransactionExpiry.futureMinutes(10), nonce, sender: me }, payload: { amount: CcdAmount.fromMicroCcd(1n), toAddress: me, memo: new DataBlob(cborText(memo)) } };
  const sig = await signTransaction(tx, buildBasicAccountSigner(SECRETS.MM_KEY));
  const h = await c.sendAccountTransaction(tx, sig);
  return TransactionHash.toHexString ? TransactionHash.toHexString(h) : h.toString();
}
async function auditLog(limit = 25) {
  const r = await fetch(`${WP}/v1/accTransactions/${CFG.accounts.mainsmarker}?order=descending&limit=100`);
  const j = await r.json();
  const out = [];
  for (const t of j.transactions || []) {
    const m = t.details?.memo; if (!m) continue;
    const txt = decodeCborTextHex(m); let rec; try { rec = JSON.parse(txt); } catch { continue; }
    if (!rec || !/^mm\/[12]$/.test(rec.t)) continue;
    out.push({ ...rec, tx: t.transactionHash, at: new Date(t.blockTime * 1000).toISOString(), block: t.blockHeight, explorer: txUrl(t.transactionHash) });
    if (out.length >= limit) break;
  }
  return out;
}
async function stats() {
  const r = await fetch(`${WP}/v1/accTransactions/${CFG.accounts.mainsmarker}?order=descending&limit=1000`);
  const j = await r.json(); const buyers = new Set(); let paid = 0, ccd = 0;
  for (const t of j.transactions || []) { const d = t.details || {}; if (d.type === 'transfer' && d.transferDestination === CFG.accounts.mainsmarker && d.transferSource !== CFG.accounts.mainsmarker) { paid++; buyers.add(d.transferSource); ccd += Number(d.transferAmount || 0) / 1e6; } }
  return { paid_reviews: paid, distinct_buyer_accounts: buyers.size, revenue_test_ccd: ccd, buyers: [...buyers] };
}
async function auditByTx(hash) {
  const st = await grpc().getBlockItemStatus(TransactionHash.fromHexString(hash));
  const sum = st?.outcome?.summary || st?.outcomes?.[0]?.summary;
  const memo = sum?.memo?.memo;
  if (!memo) return { found: false, status: st?.status };
  const txt = decodeCborTextHex(typeof memo === 'string' ? memo : memo.toString?.());
  return { found: true, status: st.status, record: JSON.parse(txt), explorer: txUrl(hash) };
}

// ---------- abuse limits on the sponsored path ----------
// The facilitator pays gas for every settled payment, so a buyer could try to drain it. Limits (per isolate; production moves them to a Durable Object):
const LIMITS = { per_payer_per_10min: 6, max_in_flight: 4 };
const seen = new Map(); let inFlight = 0;
function limitCheck(payer) {
  const t = now(), xs = (seen.get(payer) || []).filter(x => t - x < 600000);
  if (xs.length >= LIMITS.per_payer_per_10min) return `rate limit: ${LIMITS.per_payer_per_10min} paid reviews per payer per 10 minutes`;
  if (inFlight >= LIMITS.max_in_flight) return 'busy: too many settlements in flight, retry shortly';
  xs.push(t); seen.set(payer, xs); return null;
}
const FACILITATOR_RULES = ['Transaction version: V1 sponsored format, deserialisable', 'Sender identity: header.sender equals payload.sender, valid base58', "Sponsor identity: header.sponsor.account is this facilitator's own account", 'Transfer destination equals PaymentRequirements.payTo', 'Amount equals PaymentRequirements.amount exactly', 'Asset type: SimpleTransfer for CCD (TokenUpdate with matching tokenId for PLT)', 'Expiry in the future and at most 10 minutes ahead', "Sender signature verified against the sender's on-chain credentials", 'Payload safety: exactly one operation; sponsor is neither sender nor recipient'];

// ---------- the paid resource ----------
async function handleX402(request, origin) {
  const resourceUrl = origin + '/x402/review';
  const pr = await requirements(resourceUrl);
  let body; try { body = await request.json(); } catch { body = {}; }
  const question = String(body.question || '').slice(0, 1500).trim();
  const answer = String(body.answer || '').slice(0, 6000).trim();
  if (question.length < 10 || answer.length < 30) return json({ error: 'Send JSON {question, answer, marks: 10|15|20, mode: "cloud"|"private"}. The answer needs at least 30 characters.' }, 400);
  const sigHeader = request.headers.get('PAYMENT-SIGNATURE') || request.headers.get('X-PAYMENT');
  if (!sigHeader) return json(pr, 402, { 'PAYMENT-REQUIRED': encodePaymentRequiredHeader(pr) });
  const t0 = now();
  let payload; try { payload = decodePaymentSignatureHeader(sigHeader); } catch (e) { return json({ ...pr, error: 'Malformed PAYMENT-SIGNATURE header' }, 402); }
  const req = pr.accepts[0];
  const payer = String(payload?.payload?.sender || payload?.payload?.signedTransaction?.header?.sender || 'unknown');
  const lim = limitCheck(payer); if (lim) return json({ ...pr, error: lim }, 429, { 'retry-after': '60' });
  inFlight++; try { return await paidReview(payload, pr, req, { question, answer, body, t0 }); } finally { inFlight--; }
}
async function paidReview(payload, pr, req, { question, answer, body, t0 }) {
  const fac = facilitator();
  const v = await fac.verify(payload, req);
  if (!v.isValid) return json({ ...pr, error: 'Payment rejected: ' + (v.invalidReason || 'invalid') }, 402);
  const s = await fac.settle(payload, req);
  if (!s.success) return json({ ...pr, error: 'Settlement failed: ' + (s.errorReason || 'unknown') }, 402);
  const tPaid = now();
  const { review: rv, model, fallbacks } = await review({ question, answer, marks: body.marks, mode: body.mode });
  const tReviewed = now();
  const reviewId = s.transaction.slice(0, 10);
  const inHash = await sha256hex(canon({ question, answer }));
  const outHash = await sha256hex(canon(rv));
  const rec = { t: 'mm/2', in: inHash, out: outHash, rb: (await rubricHash()).slice(0, 12), m: model.split('/').pop().slice(0, 18), pay: s.transaction.slice(0, 16), sc: `${rv.score}/${rv.max}` };
  let auditTx = null, auditErr = null;
  try { auditTx = await anchorAudit(rec); } catch (e) { auditErr = String(e.message || e); }
  const settle = { success: true, transaction: s.transaction, network: s.network, payer: s.payer };
  return json({
    review_id: reviewId, review: rv, review_sha256: outHash, input_sha256: inHash, hashing: 'SHA-256 over canonical JSON (keys sorted recursively, no whitespace)',
    payment: { ...settle, amount_ccd: Number(PRICE_MICRO) / 1e6, sponsor: CFG.accounts.facilitator, explorer: txUrl(s.transaction) },
    audit: auditTx ? { tx: auditTx, memo: rec, explorer: txUrl(auditTx), status: 'submitted; final in a few seconds' } : { error: auditErr, memo: rec },
    rubric: { version: RUBRIC_VERSION, sha256: await rubricHash(), url: '/api/rubric' },
    model, fallbacks, timings_ms: { settle: tPaid - t0, review: tReviewed - tPaid, total: now() - t0 },
    disclosure: DISCLOSURE,
  }, 200, { 'PAYMENT-RESPONSE': encodePaymentResponseHeader(settle), 'X-Audit-Tx': auditTx || '' });
}

// ---------- badge helper ----------
async function checkBadge(id) {
  const r = await fetch(`${REGISTRY_MCP}/v1/check-badge/${id}?network=testnet`);
  const j = await r.json().catch(() => ({}));
  return { http: r.status, body: j };
}
// The buyer (StudyBuddy) is a separate service: https://studybuddy.sites.tab.bot (own worker, own key).

// ---------- MCP server (JSON-RPC over HTTP) ----------
const MCP_TOOLS = [
  { name: 'get_payment_requirements', description: 'x402 payment requirements for one MainsMarker review (Concordium testnet, exact scheme, sponsored).', inputSchema: { type: 'object', properties: {} } },
  { name: 'review_answer', description: 'Review a UPSC Mains answer. Requires an x402 payment: pass `payment` = the base64 PAYMENT-SIGNATURE value. Without it, the tool returns the payment requirements.', inputSchema: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' }, marks: { type: 'number', enum: [10, 15, 20] }, payment: { type: 'string' } }, required: ['question', 'answer'] } },
  { name: 'get_audit_log', description: 'Recent on-chain audit records of reviews MainsMarker performed (read from Concordium testnet).', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'verify_review', description: 'Check a review JSON against its on-chain audit record (SHA-256 of the review must equal the anchored hash).', inputSchema: { type: 'object', properties: { audit_tx: { type: 'string' }, review: { type: 'object' } }, required: ['audit_tx', 'review'] } },
];
async function handleMcp(request, origin) {
  const m = await request.json().catch(() => ({}));
  const reply = result => json({ jsonrpc: '2.0', id: m.id ?? null, result });
  const err = (code, message) => json({ jsonrpc: '2.0', id: m.id ?? null, error: { code, message } });
  const content = o => reply({ content: [{ type: 'text', text: JSON.stringify(o, null, 2) }] });
  if (m.method === 'initialize') return reply({ protocolVersion: '2025-03-26', serverInfo: { name: 'mainsmarker', version: '2.0.0' }, capabilities: { tools: { listChanged: false } } });
  if (m.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (m.method === 'tools/list') return reply({ tools: MCP_TOOLS });
  if (m.method !== 'tools/call') return err(-32601, 'Method not found');
  const { name, arguments: a = {} } = m.params || {};
  if (name === 'get_payment_requirements') return content(await requirements(origin + '/x402/review'));
  if (name === 'get_audit_log') return content(await auditLog(Math.min(50, Number(a.limit) || 10)));
  if (name === 'verify_review') return content(await verifyReview(a.audit_tx, a.review));
  if (name === 'review_answer') {
    const headers = { 'content-type': 'application/json' }; if (a.payment) headers['PAYMENT-SIGNATURE'] = a.payment;
    const r = await handleX402(new Request(origin + '/x402/review', { method: 'POST', headers, body: JSON.stringify(a) }), origin);
    return content({ http_status: r.status, ...(await r.json()) });
  }
  return err(-32602, 'Unknown tool');
}
async function verifyReview(auditTx, reviewObj) {
  const a = await auditByTx(String(auditTx || ''));
  if (!a.found) return { match: false, reason: 'No audit memo found for that transaction', status: a.status };
  const h = await sha256hex(canon(reviewObj));
  return { match: h === a.record.out, review_sha256: h, onchain_sha256: a.record.out, record: a.record, explorer: a.explorer };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url); const origin = url.origin;
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    try {
      if (url.pathname === '/x402/review' && request.method === 'POST') return await handleX402(request, origin);
      if (url.pathname === '/x402/review') return json(await requirements(origin + '/x402/review'), 402, { 'PAYMENT-REQUIRED': encodePaymentRequiredHeader(await requirements(origin + '/x402/review')) });
      if (url.pathname === '/api/demo/buy') return json({ moved: 'The buyer agent now runs as its own service', url: CFG.studybuddy_url + '/api/buy' }, 410);
      if (url.pathname === '/api/stats') return json(await stats());
      if (url.pathname === '/api/rubric') return json({ version: RUBRIC_VERSION, sha256: await rubricHash(), anchored_prefix: (await rubricHash()).slice(0, 12), system_prompt: SYS, note: 'Every audit memo carries rb = first 12 hex of this hash, so a review can be tied to the exact rubric that produced it.' });
      if (url.pathname === '/api/facilitator') return json({ sponsor_account: CFG.accounts.facilitator, explorer: accUrl(CFG.accounts.facilitator), rules_checked_before_sponsoring: FACILITATOR_RULES, abuse_limits: LIMITS, scheme: 'x402 exact, V1 sponsored transactions (@x402/concordium)' });
      if (url.pathname === '/api/audit') return json(await auditLog(Math.min(50, Number(url.searchParams.get('limit')) || 20)));
      if (url.pathname.startsWith('/api/audit/')) return json(await auditByTx(url.pathname.split('/').pop()));
      if (url.pathname === '/api/verify' && request.method === 'POST') { const b = await request.json(); return json(await verifyReview(b.audit_tx, b.review)); }
      if (url.pathname === '/api/info') return json({ network: NET, price_ccd: Number(PRICE_MICRO) / 1e6, accounts: CFG.accounts, tokens: CFG.tokens, contracts: CFG.contracts, studybuddy_url: CFG.studybuddy_url, explorer: { mainsmarker: accUrl(CFG.accounts.mainsmarker), studybuddy: accUrl(CFG.accounts.studybuddy), facilitator: accUrl(CFG.accounts.facilitator) }, setup_txs: CFG.txs, disclosure: DISCLOSURE });
      if (url.pathname === '/api/badge') return json(await checkBadge(url.searchParams.get('id') || CFG.tokens.mainsmarker.badge));
      if (url.pathname === '/mcp' && request.method === 'POST') return await handleMcp(request, origin);
      if (url.pathname === '/mcp') return json({ mcp: 'POST JSON-RPC 2.0 here', tools: MCP_TOOLS.map(t => t.name) });
      if (url.pathname === '/health') return json({ ok: true });
    } catch (e) {
      return json({ error: String(e?.message || e).slice(0, 500) }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
