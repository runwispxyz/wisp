# Wisp

Anonymized AI inference, paid per use: one wallet, one balance, one key. The model host never sees your wallet, IP or device; Wisp keeps one billing row per call, never the prompt. One Next.js app serves three surfaces:

| Path | What | Subdomain (via `rewrites` in `next.config.ts`) |
|---|---|---|
| `/` … | marketing site (home, pricing, token, about, thesis, whitepaper, blog, changelog, status) | `wisp.xyz` |
| `/console/*` | dashboard, playground, models, keys, usage, logs, credit, sealed | `console.wisp.xyz` |
| `/chat` | chat, image, video, music app (history in the browser only) | `chat.wisp.xyz` |
| `/v1/*` | OpenAI-compatible API (`/v1/models`, `/v1/chat/completions`, `/v1/jobs`) | any |

## Run

```
npm install
npm run dev
node scripts/smoke.mjs http://localhost:3000   # end-to-end backend check
```

Config lives in `.env.local` (server only). `NVIDIA_API_KEY` runs every chat model and FLUX images.

## How the logic works

- **Sign-in**: SIWE (EIP-4361). `/api/auth/nonce` → wallet signs → `/api/auth/verify` checks domain, chain id, expiry, signature, one-time nonce → httpOnly session cookie (24 h). No wallet in the browser? A local demo wallet signs instead.
- **Money**: integer micro-USD in SQLite (`data/wisp.db`, Node's built-in `node:sqlite`). Every call **holds** its worst case, then **settles** what it used and releases the rest; a call that fails before any output costs nothing.
- **Keys**: `wsp_…`, stored as SHA-256 only, shown once. Each has an optional spend cap, expiry and model allow-list.
- **Privacy**: requests leave under one pooled provider key with no client IP, user agent or wallet; host fields are stripped from replies; only a billing row is kept, and rows older than 30 days are deleted (`purgeOldCalls` in `lib/db.ts`, run hourly). Media files are deleted from the server on first download.
- **Chain**: with `RPC_URL` empty the chain is mocked (simulate deposits and token holdings from the console). Set `RPC_URL`, `USDG_ADDRESS`, `TOKEN_ADDRESS` to read real `Transfer` logs into each account's HD-derived deposit address and real `balanceOf` for Holder Credit.
- **Holder Credit**: each finished hour, `HOLDER_POOL_USD_PER_HOUR` is split across wallets holding at least `HOLDER_MIN_USD` of the token, pro rata, as platform credit.
- **Free trial**: 30 prompts (10 media) per browser on models marked `free`, no wallet.

## Live on Robinhood Chain mainnet

`node scripts/go-live.mjs` writes the mainnet settings into `.env.local` (chain 4663, public RPCs with fallback, USDG `0x5fc5…d168`, Holder Credit off, USDG-only top-ups) and creates `DEPOSIT_MNEMONIC` if it is empty, without printing it. **Back up that seed**: every deposit address comes from it and funds can only be moved with it.

- A background watcher (`instrumentation.ts` → `lib/chain.ts`) scans new blocks every 10 s in 1,000-block chunks for every account's deposit address, waits 20 confirmations, and keeps its cursor in the DB so nothing is skipped across restarts.
- $WISP deposits use the contract set in `/admin` and wait for manual review while `TOKEN_PRICE_USD` is 0.
- Demo wallet, mock deposits, mock holdings and dev codes are off when `RPC_URL` is set.
- Checks: `node scripts/live-check.mjs http://localhost:3000` (no money moves) and `node --experimental-strip-types scripts/chainscan-check.mjs` (scanner vs mainnet). `scripts/smoke.mjs` needs the mock chain (empty `RPC_URL`).
- The mock-era database is kept at `data/wisp-mock-backup.db`.

## Admin

`/admin` changes the contract address shown in the hero and the token sections (stored in `data/wisp.db`, no rebuild needed). Only a scrypt hash of the password lives in `.env.local` as `ADMIN_PASSWORD_HASH`. To change the password:

```
node --experimental-strip-types -e "import('./lib/password.ts').then(m=>console.log(m.hashPassword(process.argv[1])))" "NEW_PASSWORD"
```

Put the output in `ADMIN_PASSWORD_HASH`. Logins are limited to 5 wrong tries per client and 30 overall per 15 minutes. Check the flow with `$env:ADMIN_PW="..."; node scripts/admin-check.mjs http://localhost:3000`.

## What is live and what is planned

- Live: chat and image models, the OpenAI-compatible API, SIWE sign-in, USDG top-ups on Robinhood Chain, per-call hold and settle, API keys with caps.
- Planned: video and music (shown as "coming soon"), Sealed models on attested hardware, paying in $WISP, and Holder Credit (the code is in `lib/chain.ts`; it stays off and the site says "planned" while `HOLDER_POOL_USD_PER_HOUR` is 0).
- List prices are hidden until each one is checked on the maker's own page.
- Back up `data/`: it holds the generated deposit mnemonic unless `DEPOSIT_MNEMONIC` is set.
