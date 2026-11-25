// Checks lib/chainscan.ts against Robinhood Chain mainnet: finds a real recent USDG transfer and makes sure the
// chunked scanner finds exactly the transfers into that address, and none into an unused one.
//   node --experimental-strip-types scripts/chainscan-check.mjs [rpcUrl]
import assert from "node:assert/strict";
import { createPublicClient, http } from "viem";
import { scanTransfers, TRANSFER } from "../lib/chainscan.ts";

const RPC = process.argv[2] || "https://robinhood.api.pocket.network";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const client = createPublicClient({ transport: http(RPC, { timeout: 20000 }) });

assert.equal(await client.getChainId(), 4663, "not Robinhood Chain mainnet");
const head = (await client.getBlockNumber()) - 20n;
const from = head - 3000n;

// pick a real recipient from the raw logs
const raw = await client.getLogs({ address: USDG, event: TRANSFER, fromBlock: head - 200n, toBlock: head });
assert.ok(raw.length > 0, "no USDG transfers in the last 200 blocks");
const target = raw[0].args.to.toLowerCase();
const expected = await client.getLogs({ address: USDG, event: TRANSFER, args: { to: target }, fromBlock: from, toBlock: head });

const unused = "0x000000000000000000000000000000000000c0de";
const found = [];
const chunks = [];
await scanTransfers({ client, token: USDG, decimals: 6, to: [target, unused], from, until: head, chunk: 700n, onLog: (t) => found.push(t), onChunkDone: (b) => chunks.push(b) });

assert.equal(found.length, expected.length, `scanner found ${found.length}, direct query ${expected.length}`);
assert.ok(found.every((t) => t.to === target), "a transfer to the wrong address came back");
assert.deepEqual(new Set(found.map((t) => t.ref)).size, found.length, "duplicate refs");
assert.equal(chunks.at(-1), head, "last chunk must end at the head");
assert.equal(chunks.length, Math.ceil(3001 / 700));
console.log(`CHAINSCAN OK: ${found.length} transfer(s) into ${target.slice(0, 10)}… over ${chunks.length} chunks, e.g. ${found[0]?.amount} USDG`);
