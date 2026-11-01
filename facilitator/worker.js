// Independent x402 facilitator for Concordium testnet (exact scheme, V1 sponsored transactions).
// Runs as its own service with its own account, separate from the seller (MainsMarker) and the buyer (StudyBuddy).
// Built by Tab, an AI assistant, for team lead Akshay Wagh.
import { ExactConcordiumScheme as Fac } from '@x402/concordium/exact/facilitator';
import { toConcordiumFacilitatorSigner, CONCORDIUM_TESTNET_CAIP2 } from '@x402/concordium';
const CFG = __CFG__; const NET = CONCORDIUM_TESTNET_CAIP2;
const ME = CFG.accounts.facilitator;
// Only payments to agents registered in the Concordium Agent Registry are sponsored (synced allow-list: payTo -> agent token).
const REGISTERED_PAYEES = { [CFG.accounts.mainsmarker]: { agent: 'MainsMarker', token: CFG.tokens.mainsmarker } };
const LIMITS = { per_payer_per_10min: 6, max_amount_micro_ccd: 5_000_000 };
const RULES = ['Transaction version: V1 sponsored format, deserialisable', 'Sender identity: header.sender equals payload.sender, valid base58', "Sponsor identity: header.sponsor.account is this facilitator's account", 'Transfer destination equals PaymentRequirements.payTo', 'Amount equals PaymentRequirements.amount exactly', 'Asset type: SimpleTransfer for CCD (TokenUpdate with matching tokenId for PLT)', 'Expiry in the future and at most 10 minutes ahead', "Sender signature verified against the sender's on-chain credentials", 'Payload safety: exactly one operation; sponsor is neither sender nor recipient'];
const DISCLOSURE = 'Built by Tab, an AI assistant, for team lead Akshay Wagh.';
let _f; const fac = () => (_f ||= new Fac({ signer: toConcordiumFacilitatorSigner(ME, process.env.FAC_KEY, { host: 'grpc.testnet.concordium.com', port: 20000, useTls: true }), finalizationTimeoutMs: 60000 }));
const json = (o, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
const seen = new Map();
function policy(req, payload) {
  if (req.network !== NET || req.scheme !== 'exact') return 'unsupported scheme/network';
  if (!REGISTERED_PAYEES[req.payTo]) return 'payTo is not a registered agent this facilitator sponsors';
  if (Number(req.amount) > LIMITS.max_amount_micro_ccd) return 'amount over the sponsored maximum';
  const payer = String(payload?.payload?.sender || ''); const t = Date.now(); const xs = (seen.get(payer) || []).filter(x => t - x < 600000);
  if (xs.length >= LIMITS.per_payer_per_10min) return 'rate limit: 6 sponsored payments per payer per 10 minutes';
  return null;
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    try {
      if (url.pathname === '/api/supported') return json({ kinds: [{ x402Version: 2, scheme: 'exact', network: NET, extra: fac().getExtra(NET) }], facilitator: ME, registered_payees: REGISTERED_PAYEES, rules: RULES, limits: LIMITS, explorer: 'https://ccdexplorer.io/testnet/account/' + ME, disclosure: DISCLOSURE });
      if (url.pathname === '/api/verify' && request.method === 'POST') { const b = await request.json(); const p = policy(b.paymentRequirements, b.paymentPayload); if (p) return json({ isValid: false, invalidReason: 'policy', invalidMessage: p }); return json(await fac().verify(b.paymentPayload, b.paymentRequirements)); }
      if (url.pathname === '/api/settle' && request.method === 'POST') { const b = await request.json(); const p = policy(b.paymentRequirements, b.paymentPayload); if (p) return json({ success: false, errorReason: p });
        const v = await fac().verify(b.paymentPayload, b.paymentRequirements); if (!v.isValid) return json({ success: false, errorReason: v.invalidReason || 'invalid' });
        const payer = String(b.paymentPayload?.payload?.sender || ''); seen.set(payer, [...(seen.get(payer) || []), Date.now()]);
        return json(await fac().settle(b.paymentPayload, b.paymentRequirements)); }
      if (url.pathname === '/api/health') return json({ ok: true, runtime: 'vercel-node ' + process.versions.node });
    } catch (e) { return json({ error: String(e?.message || e).slice(0, 400) }, 500); }
    return json({ error: 'not found' }, 404);
  },
};
