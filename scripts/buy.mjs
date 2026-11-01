#!/usr/bin/env node
// Standalone x402 buyer for MainsMarker — run it with ANY Concordium testnet account you control.
// Built by Tab, an AI assistant, for team lead Akshay Wagh.
//   npm i @x402/concordium @x402/core @concordium/web-sdk
//   BUYER_ADDRESS=<your testnet account> BUYER_KEY=<its ed25519 signing key, hex> node scripts/buy.mjs [seller-url]
// It never needs CCD for gas (the seller's facilitator sponsors it); it spends only the 0.5 test CCD price.
import { ExactConcordiumScheme } from '@x402/concordium/exact/client';
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader, decodePaymentResponseHeader } from '@x402/core/http';
import { AccountAddress, buildBasicAccountSigner } from '@concordium/web-sdk';
import { createHash } from 'node:crypto';

const SELLER = (process.argv[2] || 'https://mainsmarker.sites.tab.bot').replace(/\/$/, '');
const { BUYER_ADDRESS, BUYER_KEY } = process.env;
if (!BUYER_ADDRESS || !BUYER_KEY) { console.error('Set BUYER_ADDRESS and BUYER_KEY'); process.exit(1); }
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const sha = s => createHash('sha256').update(s).digest('hex');
const log = (k, v) => console.log(`${k.padEnd(10)} ${v}`);

const card = await (await fetch(SELLER + '/.well-known/agent-card.json')).json();
const ext = card.capabilities.extensions.find(e => /concordium-badge/.test(e.uri));
const badge = ext.params.tokenAddress.split(':').pop();
log('card', `${card.name} · badge ${badge}`);
const b = await (await fetch(`https://agent-registry-mcp.concordium.com/v1/check-badge/${badge}?network=testnet`)).json();
if (b.badge_valid !== true) { log('badge', 'NOT valid — refusing to pay'); process.exit(2); }
log('badge', 'valid (registered, Active, card hash matches on-chain)');

const body = JSON.stringify({ question: process.env.QUESTION || 'Explain the significance of the Western Ghats as a biodiversity hotspot.', answer: process.env.ANSWER || 'The Western Ghats run parallel to the west coast of India for about 1,600 km. They are one of the world\'s biodiversity hotspots because of high endemism (amphibians, plants, fish) and high threat. They feed peninsular rivers, regulate the monsoon and support millions of people. Threats include mining, plantations, dams and fragmentation. The Gadgil and Kasturirangan reports proposed ecologically sensitive zones. Conservation needs community participation and strict protection of the core areas.', marks: 10 });
const r1 = await fetch(SELLER + '/x402/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
if (r1.status !== 402) { log('402', `unexpected ${r1.status}`); process.exit(3); }
const pr = decodePaymentRequiredHeader(r1.headers.get('PAYMENT-REQUIRED'));
const req = pr.accepts[0];
if (req.payTo !== ext.params.agentWallet.split(':').pop()) { log('policy', 'payTo differs from the verified card wallet — refusing'); process.exit(4); }
log('402', `${Number(req.amount) / 1e6} CCD to ${req.payTo} on ${req.network}`);

const client = new ExactConcordiumScheme({ accountAddress: AccountAddress.fromBase58(BUYER_ADDRESS), signer: buildBasicAccountSigner(BUYER_KEY) }, { grpcUrl: 'grpc.testnet.concordium.com:20000', useTls: true });
const p = await client.createPaymentPayload(2, req);
const r2 = await fetch(SELLER + '/x402/review', { method: 'POST', headers: { 'content-type': 'application/json', 'PAYMENT-SIGNATURE': encodePaymentSignatureHeader({ ...p, accepted: req, resource: pr.resource }) }, body });
const res = await r2.json();
if (r2.status !== 200) { log('paid', `${r2.status} ${res.error}`); process.exit(5); }
const pay = decodePaymentResponseHeader(r2.headers.get('PAYMENT-RESPONSE'));
log('settled', `https://ccdexplorer.io/testnet/transaction/${pay.transaction}`);
log('review', `${res.review.score}/${res.review.max} by ${res.model}: ${res.review.verdict}`);
const mine = sha(canon(res.review));
log('audit', `https://ccdexplorer.io/testnet/transaction/${res.audit.tx}`);
log('hash', mine === res.review_sha256 ? `my hash of the review = seller's anchored hash (${mine.slice(0, 16)}…)` : `MISMATCH mine ${mine} seller ${res.review_sha256}`);
