import w from './worker.js';
const NF = { ASSETS: { fetch: () => new Response('not found', { status: 404 }) } };
export default async function handler(req, res) {
  const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
  const route = url.searchParams.get('route');
  if (route !== null) { url.pathname = '/api/' + route; url.searchParams.delete('route'); }
  let body;
  if (!['GET', 'HEAD'].includes(req.method)) { const chunks = []; for await (const c of req) chunks.push(c); body = Buffer.concat(chunks); }
  const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const r = await w.fetch(new Request(url, { method: req.method, headers, body }), NF);
  res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}
