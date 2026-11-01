
const esbuild = require('esbuild'); const fs=require('fs'); const path=require('path');
const W=process.argv[2];
esbuild.build({ entryPoints:[W+'/src/'+(process.argv[4]||'worker.js')], bundle:true, format:'esm', platform:'browser', target:'es2022',
  conditions:['worker','browser','import'], mainFields:['browser','module','main'],
  outfile:W+'/build/'+(process.argv[5]||'worker.mjs'), minify:!process.env.NOMIN, legalComments:'none', logLevel:'warning',
  define:{ __CFG__: fs.readFileSync(W+'/src/cfg.json','utf8') },
  alias:{ '@concordium/web-sdk/nodejs': W+'/src/grpcshim.js' },
  nodePaths:[process.argv[3]], external:['node:*'],
}).then(()=>{ const s=fs.statSync(W+'/build/'+(process.argv[5]||'worker.mjs')).size; console.log('built', s); }).catch(e=>{console.error(e.message.slice(0,3000)); process.exit(1)});
