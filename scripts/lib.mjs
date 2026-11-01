import { mnemonicToSeedSync } from '@scure/bip39';
import { ConcordiumHdWallet } from '@concordium/web-sdk';
export const WP='https://wallet-proxy.testnet.concordium.com';
export function seedHex(){ return Buffer.from(mnemonicToSeedSync(process.env.CCD_SEED)).toString('hex'); }
export function wallet(){ return ConcordiumHdWallet.fromHex(seedHex(),'Testnet'); }
export async function j(u,o){ const r=await fetch(u,o); const t=await r.text(); try{return JSON.parse(t)}catch{ throw new Error(r.status+' '+t.slice(0,300)) } }
