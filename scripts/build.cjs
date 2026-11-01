
const esbuild = require('esbuild'); const fs=require('fs'); const path=require('path');
const W=process.argv[2];
esbuild.build({ entryPoints:[W+'/worker/worker.js'], bundle:true, format:'esm', platform:'browser', target:'es2022',
  conditions:['worker','browser','import'], mainFields:['browser','module','main'],
  outfile:W+'/build/worker.mjs', minify:true, legalComments:'none', logLevel:'warning',
  define:{ __CFG__: fs.readFileSync(W+'/worker/cfg.json','utf8') },
  alias:{ '@concordium/web-sdk/nodejs': W+'/worker/grpcshim.js' },
  nodePaths:[process.argv[3]], external:['node:*'],
}).then(()=>{ const s=fs.statSync(W+'/build/worker.mjs').size; console.log('built', s); }).catch(e=>{console.error(e.message.slice(0,3000)); process.exit(1)});
