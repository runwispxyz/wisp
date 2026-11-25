import { createPublicClient, defineChain, fallback, http, formatUnits, erc20Abi, type Address } from "viem";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { db, meta, now, tx } from "./db";
import { credit } from "./billing";
import { scanTransfers } from "./chainscan";
import { getContract, isPlaceholder } from "./settings";

const E = process.env;
const RPCS = (E.RPC_URL || "").split(",").map((s) => s.trim()).filter(Boolean);
export const MOCK_CHAIN = RPCS.length === 0;
export const CHAIN_ID = Number(E.CHAIN_ID || 4663);
const TOKEN_PRICE = Number(E.TOKEN_PRICE_USD || 0); // 0 = unknown: token deposits wait for review
const HOLDER_MIN = Number(E.HOLDER_MIN_USD || 20);
const HOLDER_MIN_TOKENS = Number(E.HOLDER_MIN_TOKENS || 0); // used when there is no price
const POOL = Number(E.HOLDER_POOL_USD_PER_HOUR || 0);
/** Site copy calls Holder Credit "planned" until the pool is switched on. */
export const HOLDER_CREDIT_ON = POOL > 0;
const REVIEW = Number(E.TOKEN_REVIEW_USD || 500);
const CHUNK = BigInt(E.LOG_CHUNK_BLOCKS || 1000); // public RPCs cap getLogs ranges around 1k-10k blocks
const CONFIRM = BigInt(E.CONFIRMATIONS || 20); // ~2 s at 0.1 s blocks
const MAX_CHUNKS_PER_PASS = 60;

const chain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: RPCS.length ? RPCS : ["http://127.0.0.1:8545"] } },
});
const client = MOCK_CHAIN ? null : createPublicClient({ chain, transport: fallback(RPCS.map((u) => http(u, { timeout: 15_000, retryCount: 1 }))) });

/** The token contract: the address set in /admin, else TOKEN_ADDRESS. */
const tokenAddress = (): Address | null => {
  const ca = getContract();
  return (isPlaceholder(ca) ? E.TOKEN_ADDRESS || null : ca) as Address | null;
};

// Deposit addresses: one HD child per account. The server never signs; sweep funds offline with the mnemonic.
function mnemonic() {
  if (E.DEPOSIT_MNEMONIC) return E.DEPOSIT_MNEMONIC;
  if (!MOCK_CHAIN) throw new Error("DEPOSIT_MNEMONIC must be set when a real RPC is configured");
  return meta("deposit_mnemonic", () => generateMnemonic(english))!;
}
const addrCache = new Map<number, string>();
export function depositAddress(accountId: number) {
  let a = addrCache.get(accountId);
  if (!a) addrCache.set(accountId, (a = mnemonicToAccount(mnemonic(), { addressIndex: accountId }).address));
  return a;
}

export type Deposit = { ref: string; token: string; amount: number; credit: number; status: string; created: number };
export const listDeposits = (accountId: number) =>
  db.prepare("select ref, token, amount, credit, status, created from deposits where account_id = ? order by created desc limit 100").all(accountId) as Deposit[];

/** Record a deposit once (ref = tx:logIndex) and credit it. Token top-ups wait for review when unpriced or large. */
export function recordDeposit(accountId: number, ref: string, token: "USDG" | "TOKEN", amount: number) {
  const value = token === "USDG" ? amount : amount * TOKEN_PRICE;
  const micro = Math.round(value * 1e6);
  const status = token === "TOKEN" && (TOKEN_PRICE <= 0 || value > REVIEW) ? "review" : "credited";
  tx(() => {
    const r = db
      .prepare("insert or ignore into deposits (ref, account_id, token, amount, credit, status, created) values (?, ?, ?, ?, ?, ?, ?)")
      .run(ref, accountId, token, amount, micro, status, now());
    if (r.changes === 1 && status === "credited") credit(accountId, micro);
  });
}

/** One pass over new blocks for every account's deposit address. Resumes from a stored cursor. */
async function scanPass() {
  if (!client) return;
  const head = (await client.getBlockNumber()) - CONFIRM;
  const cursor = BigInt(meta("scan_cursor", () => String(head))!); // first live run starts at the current head
  if (cursor > head) return;
  const book = new Map<string, number>();
  for (const { id } of db.prepare("select id from accounts").all() as { id: number }[]) book.set(depositAddress(id).toLowerCase(), id);
  const until = cursor + CHUNK * BigInt(MAX_CHUNKS_PER_PASS) - 1n < head ? cursor + CHUNK * BigInt(MAX_CHUNKS_PER_PASS) - 1n : head;
  const save = (b: bigint) => db.prepare("insert into meta (k, v) values ('scan_cursor', ?) on conflict(k) do update set v = excluded.v").run(String(b + 1n));
  if (!book.size) { save(until); return; }

  const tokens: ["USDG" | "TOKEN", Address | null, number][] = [
    ["USDG", (E.USDG_ADDRESS || null) as Address | null, Number(E.USDG_DECIMALS || 6)],
    ["TOKEN", tokenAddress(), Number(E.TOKEN_DECIMALS || 18)],
  ];
  // Scan chunk by chunk across both tokens so the cursor only moves past blocks done for every token.
  for (let a = cursor; a <= until; a += CHUNK) {
    const b = a + CHUNK - 1n < until ? a + CHUNK - 1n : until;
    for (const [name, addr, dec] of tokens) {
      if (!addr) continue;
      await scanTransfers({
        client, token: addr, decimals: dec, to: [...book.keys()], from: a, until: b, chunk: CHUNK,
        onLog: (t) => { const id = book.get(t.to); if (id != null) recordDeposit(id, t.ref, name, t.amount); },
      });
    }
    save(b);
  }
}

let inflight: Promise<void> | null = null;
let lastPass = 0;
/** Run a scan now unless one ran in the last 5 s; concurrent callers share the same pass. */
export function scanDeposits(): Promise<void> {
  if (MOCK_CHAIN) return Promise.resolve();
  if (inflight) return inflight;
  if (now() - lastPass < 5000) return Promise.resolve();
  const p = scanPass().finally(() => { inflight = null; lastPass = now(); });
  inflight = p;
  return p;
}

/** Started once from instrumentation.ts: scan every 10 s, sweep Holder Credit every minute. */
export function startChainWatcher() {
  const g = globalThis as unknown as { __wispWatcher?: boolean };
  if (g.__wispWatcher || MOCK_CHAIN) return;
  g.__wispWatcher = true;
  mnemonic(); // fail loudly at boot if the seed is missing
  const log = (e: unknown) => console.error("[chain]", (e as Error)?.message || e);
  setInterval(() => scanDeposits().catch(log), 10_000);
  setInterval(() => sweepHolderCredit().catch(log), 60_000);
  scanDeposits().catch(log);
  console.log(`[chain] watching Robinhood Chain ${CHAIN_ID} via ${RPCS.length} RPC(s)`);
}

/** Token holding in whole tokens. Mock chain reads the value set from the console. */
export async function holding(address: string, mock: number) {
  const token = tokenAddress();
  if (!client) return mock;
  if (!token) return 0;
  const raw = await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [address as Address] });
  return Number(formatUnits(raw, Number(E.TOKEN_DECIMALS || 18)));
}
const eligible = (tokens: number) => (TOKEN_PRICE > 0 ? tokens * TOKEN_PRICE >= HOLDER_MIN : HOLDER_MIN_TOKENS > 0 && tokens >= HOLDER_MIN_TOKENS);

let sweeping = false;
/**
 * Pay every finished hour since the last sweep (up to 24 back). Off while HOLDER_POOL_USD_PER_HOUR is 0.
 * shortcut: splits by balance at sweep time, not the hour's average balance; snapshot balances every few minutes to upgrade.
 */
export async function sweepHolderCredit() {
  if (sweeping || POOL <= 0) return;
  sweeping = true;
  try {
    const hourNow = Math.floor(now() / 3600_000);
    const last = Number(meta("last_sweep_hour", () => String(hourNow - 1)));
    const accounts = db.prepare("select id, address, mock_holding from accounts").all() as { id: number; address: string; mock_holding: number }[];
    for (let h = Math.max(last + 1, hourNow - 24); h < hourNow; h++) {
      const held: { id: number; amt: number }[] = [];
      for (const a of accounts) {
        const amt = await holding(a.address, a.mock_holding);
        if (eligible(amt)) held.push({ id: a.id, amt });
      }
      const total = held.reduce((s, x) => s + x.amt, 0);
      tx(() => {
        for (const x of held) {
          const micro = Math.floor((POOL * 1e6 * x.amt) / total);
          const r = db.prepare("insert or ignore into holder_credits (hour, account_id, amount) values (?, ?, ?)").run(h, x.id, micro);
          if (r.changes === 1) credit(x.id, micro);
        }
        db.prepare("insert into meta (k, v) values ('last_sweep_hour', ?) on conflict(k) do update set v = excluded.v").run(String(h));
      });
    }
  } finally {
    sweeping = false;
  }
}

const supplyCache = new Map<string, { at: number; label: string | null }>();
/**
 * Total supply of the token set in /admin, read from the chain (the same number Pons shows), e.g. "1,000,000,000".
 * null before a CA is set or when the chain cannot be read. Cached 10 minutes per contract.
 */
export async function tokenSupplyLabel(): Promise<string | null> {
  const token = tokenAddress();
  if (!token || !client) return null;
  const hit = supplyCache.get(token);
  if (hit && now() - hit.at < 600_000) return hit.label;
  try {
    const [raw, dec] = await Promise.all([
      client.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }),
      client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    ]);
    const label = Number(formatUnits(raw, dec)).toLocaleString("en-US", { maximumFractionDigits: 2 });
    supplyCache.set(token, { at: now(), label });
    return label;
  } catch {
    return hit?.label ?? null; // keep the last good value if the RPC hiccups
  }
}

export const isEligible = eligible;
export const tokenConfig = { price: TOKEN_PRICE, min: HOLDER_MIN, minTokens: HOLDER_MIN_TOKENS, pool: POOL, review: REVIEW };
