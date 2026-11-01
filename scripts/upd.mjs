// node upd.mjs <accIdx> <contractIndex> <receiveName> <paramHex> <energy>
import { AccountAddress, AccountTransactionType, CcdAmount, ContractAddress, Energy, ReceiveName, Parameter, TransactionExpiry, buildBasicAccountSigner, signTransaction } from '@concordium/web-sdk';
import { ConcordiumGRPCNodeClient, credentials } from '@concordium/web-sdk/nodejs';
import fs from 'fs';
import { wallet } from './lib.mjs';
const [n, ci, rn, ph, en] = process.argv.slice(2);
const client = new ConcordiumGRPCNodeClient('grpc.testnet.concordium.com', 20000, credentials.createSsl(), {timeout:30000});
const sender = AccountAddress.fromBase58(JSON.parse(fs.readFileSync(`account${n}.json`)).address);
const nonce = (await client.getNextAccountNonce(sender)).nonce;
const header = { expiry: TransactionExpiry.futureMinutes(10), nonce, sender };
const payload = { amount: CcdAmount.zero(), address: ContractAddress.create(BigInt(ci), 0n), receiveName: ReceiveName.fromString(rn), message: Parameter.fromHexString(ph), maxContractExecutionEnergy: Energy.create(BigInt(en)) };
const tx = { header, payload, type: AccountTransactionType.Update };
const signer = buildBasicAccountSigner(wallet().getAccountSigningKey(0,0,Number(n)).toString('hex'));
const sig = await signTransaction(tx, signer);
const hash = await client.sendAccountTransaction(tx, sig);
console.log('tx', hash.toString?.() ?? hash);
const res = await client.waitForTransactionFinalization(hash);
const s = res.summary;
console.log(JSON.stringify(s, (k,v)=> typeof v==='bigint'? v.toString(): v).slice(0,3000));
