
import fs from 'fs'; import crypto from 'crypto'; import path from 'path'; import { wallet } from './lib.mjs';
const VT = process.env.VT; const H = { authorization: 'Bearer ' + VT };
const api = async (m, p, b) => { const r = await fetch('https://api.vercel.com' + p, { method: m, headers: { ...H, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = { raw: t.slice(0, 300) } } return { s: r.status, j }; };
// usage: node mvdeploy.mjs <NAME> <W dir with build/vercel_node.mjs + site/>  ; env SECRETS_JSON for env var MM_SECRETS
const [NAME, WD] = process.argv.slice(2);
let p = await api('GET', `/v9/projects/${NAME}`);
if (p.s === 404) p = await api('POST', '/v11/projects', { name: NAME, framework: null });
console.log('project', p.s, p.j.id || JSON.stringify(p.j.error));
if (process.env.SECRETS_JSON) {
  const EK = process.env.EKEY || 'MM_SECRETS';
  const envs = await api('GET', `/v9/projects/${NAME}/env`);
  for (const e of (envs.j.envs || []).filter(e => e.key === EK)) await api('DELETE', `/v9/projects/${NAME}/env/${e.id}`);
  const e = await api('POST', `/v10/projects/${NAME}/env`, { key: EK, value: process.env.SECRETS_JSON, type: 'encrypted', target: ['production', 'preview'] });
  console.log('env', e.s, e.j.error ? JSON.stringify(e.j.error) : 'ok');
}
const list = [];
const walk = (d, rel) => { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f), r = rel ? rel + '/' + f : f; if (fs.statSync(fp).isDirectory()) walk(fp, r); else if (!['tab-site.json', 'worker.mjs'].includes(f)) list.push([r, fs.readFileSync(fp)]); } };
walk(WD + '/site', '');
list.push(['api/index.mjs', fs.readFileSync(WD + '/build/vercel_node.mjs')]);
list.push(['package.json', Buffer.from(JSON.stringify({ name: NAME, private: true, type: 'module' }))]);
const rw = (process.env.ROUTES || '/api,/x402,/mcp,/health').split(',');
const rewrites = [];
for (const r of rw) { rewrites.push({ source: r, destination: `/api/index?__p=${r}` }); rewrites.push({ source: `${r}/:path*`, destination: `/api/index?__p=${r}/:path*` }); }
list.push(['vercel.json', Buffer.from(JSON.stringify({ functions: { 'api/index.mjs': { maxDuration: 60 } }, rewrites, headers: [{ source: '/(.*)', headers: [{ key: 'access-control-allow-origin', value: '*' }] }] }))]);
const files = [];
for (const [f, buf] of list) {
  const sha = crypto.createHash('sha1').update(buf).digest('hex');
  const r = await fetch('https://api.vercel.com/v2/files', { method: 'POST', headers: { ...H, 'content-type': 'application/octet-stream', 'x-vercel-digest': sha, 'content-length': String(buf.length) }, body: buf });
  if (!r.ok) { console.log('upload fail', f, r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  files.push({ file: f, sha, size: buf.length });
}
console.log('uploaded', files.length);
const d = await api('POST', '/v13/deployments?skipAutoDetectionConfirmation=1', { name: NAME, project: NAME, target: 'production', files, projectSettings: { framework: null } });
console.log('deploy', d.s, d.j.id, d.j.url, d.j.readyState, d.j.error ? JSON.stringify(d.j.error).slice(0, 400) : '');
for (let i = 0; i < 40 && d.j.id; i++) { await new Promise(r => setTimeout(r, 4000)); const g = await api('GET', `/v13/deployments/${d.j.id}`); if (['READY', 'ERROR', 'CANCELED'].includes(g.j.readyState)) { console.log('state', g.j.readyState, JSON.stringify(g.j.alias || []), g.j.errorMessage || ''); break; } }
