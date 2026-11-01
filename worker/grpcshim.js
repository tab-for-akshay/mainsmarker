// Cloudflare Workers have no HTTP/2 gRPC client; Concordium nodes also speak gRPC-web over fetch.
// This shim lets @x402/concordium (which asks for the Node gRPC client) run on the web client.
import { ConcordiumGRPCWebClient } from '@concordium/web-sdk';
export class ConcordiumGRPCNodeClient extends ConcordiumGRPCWebClient {
  constructor(host, port, _creds, opts) { super(host.startsWith('http') ? host : 'https://' + host, port, { timeout: 30000, ...(opts || {}) }); }
}
export const credentials = { createSsl: () => ({}), createInsecure: () => ({}) };
