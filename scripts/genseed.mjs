import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import fs from 'fs';
const m = generateMnemonic(wordlist, 256);
fs.writeFileSync(process.argv[2], JSON.stringify({label:"concordium_testnet_mnemonic",kind:"other",value:m}), {mode:0o600});
console.log("words:", m.split(' ').length);
