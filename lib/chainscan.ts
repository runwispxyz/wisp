// Pure log scanner (only viem): finds ERC-20 transfers into a set of addresses over a block range,
// split into chunks that public RPCs accept. Kept free of app imports so it can be tested against mainnet directly.
import { formatUnits, parseAbiItem, type Address, type PublicClient } from "viem";

export const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
export type FoundTransfer = { ref: string; to: string; amount: number; block: bigint };

const ADDR_BATCH = 100; // OR-ed `to` topics per request

/**
 * Calls onChunkDone(lastBlock) after each fully scanned chunk, so a caller can persist progress
 * and resume exactly where it stopped if a later chunk fails.
 */
export async function scanTransfers(opts: {
  client: Pick<PublicClient, "getLogs">;
  token: Address;
  decimals: number;
  to: string[];
  from: bigint;
  until: bigint;
  chunk: bigint;
  onLog: (t: FoundTransfer) => void;
  onChunkDone?: (lastBlock: bigint) => void;
}) {
  const { client, token, decimals, to, from, until, chunk, onLog, onChunkDone } = opts;
  for (let a = from; a <= until; a += chunk) {
    const b = a + chunk - 1n < until ? a + chunk - 1n : until;
    for (let i = 0; i < to.length; i += ADDR_BATCH) {
      const batch = to.slice(i, i + ADDR_BATCH) as Address[];
      const logs = await client.getLogs({ address: token, event: TRANSFER, args: { to: batch }, fromBlock: a, toBlock: b });
      for (const l of logs) {
        if (l.args.to == null || l.args.value == null) continue;
        onLog({ ref: `${l.transactionHash}:${l.logIndex}`, to: l.args.to.toLowerCase(), amount: Number(formatUnits(l.args.value, decimals)), block: l.blockNumber! });
      }
    }
    onChunkDone?.(b);
  }
}
