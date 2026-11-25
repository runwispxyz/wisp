// Switch .env.local to Robinhood Chain mainnet. Generates DEPOSIT_MNEMONIC only if it is empty, writes it straight
// to .env.local and never prints it. Prints the first deposit address so you can check the seed after a backup.
//   node scripts/go-live.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";

const FILE = ".env.local";
let env = readFileSync(FILE, "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() ?? "";
const set = (k, v) => {
  env = new RegExp(`^${k}=`, "m").test(env) ? env.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`) : env.trimEnd() + `\n${k}=${v}\n`;
};

const LIVE = {
  CHAIN_ID: "4663",
  // Server-side reads. Fallback order: fastest first. The official endpoint is last because some networks block it.
  RPC_URL: "https://robinhood.api.pocket.network,https://4663.rpc.thirdweb.com,https://rpc-robinhood.blockmachine.io,https://rpc.mainnet.chain.robinhood.com",
  USDG_ADDRESS: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", // Paxos + Robinhood docs, checked on-chain: USDG, 6 decimals
  USDG_DECIMALS: "6",
  TOKEN_PRICE_USD: "0", // no price feed yet: $WISP deposits wait for review
  HOLDER_POOL_USD_PER_HOUR: "0", // Holder Credit off until there is a funded pool; the site then says "planned"
  HOLDER_MIN_TOKENS: "0",
  REDEEM_CODES: "",
  CONFIRMATIONS: "20",
  LOG_CHUNK_BLOCKS: "1000",
  NEXT_PUBLIC_CHAIN_ID: "4663",
  NEXT_PUBLIC_RPC_URL: "https://rpc.mainnet.chain.robinhood.com", // what users' wallets add
};
for (const [k, v] of Object.entries(LIVE)) set(k, v);

let created = false;
if (!get("DEPOSIT_MNEMONIC")) {
  set("DEPOSIT_MNEMONIC", generateMnemonic(english));
  created = true;
}
writeFileSync(FILE, env);

const first = mnemonicToAccount(get("DEPOSIT_MNEMONIC"), { addressIndex: 1 }).address;
console.log(created ? "New DEPOSIT_MNEMONIC written to .env.local (not shown)." : "Kept the existing DEPOSIT_MNEMONIC.");
console.log("Deposit address for account #1:", first);
console.log("Live settings written:", Object.keys(LIVE).join(", "));
