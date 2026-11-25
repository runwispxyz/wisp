// Written content for the site: blog posts, changelog, roadmap, FAQ.
export type Post = { slug: string; title: string; date: string; summary: string; body: string[] };

export const POSTS: Post[] = [
  {
    slug: "wisp-is-live",
    title: "Wisp is live",
    date: "2026-11-25",
    summary: "One wallet, one balance and one key for chat and image models, with your identity left behind.",
    body: [
      "Today Wisp opens to everyone. You sign in with a wallet, top up a balance, and call any model in the catalog from Wisp Chat or from your own code.",
      "We built it because using several AI makers today means several accounts, several invoices, and a request that carries who you are to every host. Wisp puts one gateway in front of all of them.",
      "Every request passes the Wisp gateway. There, its worst-case cost is held, your wallet, IP address and client details come off, and the call goes out under a shared key. The model sees the question. It does not see you.",
      "Every price is per use and shown before the call. A list-price comparison only appears once it has been checked on the maker's own page.",
      "Free models work right away with a small trial, no wallet needed. Try one on the home page.",
    ],
  },
  {
    slug: "one-key-for-every-model",
    title: "One key for every model",
    date: "2026-11-25",
    summary: "Why a single key and a single prepaid balance beat a drawer full of accounts.",
    body: [
      "A key from Wisp Console works for every chat model in the catalog, and the same key starts image jobs.",
      "There is one balance behind it. You top it up with USDG on Robinhood Chain, and each call takes only what it used. No subscription, no card, no monthly minimum.",
      "Keys have their own spend limits and can be revoked at any time from the console. If a key leaks, the damage stops at the limit you set.",
      "Adding a new model to the catalog does not mean a new account for you. It just shows up on the key you already have.",
    ],
  },
  {
    slug: "change-one-line",
    title: "Change one line",
    date: "2026-11-25",
    summary: "Point base_url at the Wisp gateway and keep the OpenAI SDK code you already have.",
    body: [
      "The Wisp gateway speaks the OpenAI chat completions format. If your code uses the OpenAI SDK, you change the base URL and the key, and that is it.",
      "In Python: client = OpenAI(base_url=\"https://runwisp.xyz/v1\", api_key=\"wsp_...\"). In JavaScript it is the same two options.",
      "Streaming works. Each stream ends with a receipt comment that standard SDKs ignore and our own clients read, so you can see what the call cost.",
      "Images run as jobs on the same key: start one, poll it, fetch the result once. The result is deleted after you fetch it.",
    ],
  },
  {
    slug: "what-leaves-our-servers",
    title: "What leaves our servers",
    date: "2026-11-25",
    summary: "A plain list of what the model host gets, and what it never gets.",
    body: [
      "The model host gets the messages you sent and the settings you chose, like temperature and max tokens. That is all.",
      "It does not get your wallet address, your IP address, your user agent or any header that points back at you. Calls leave under one shared key, so many users look the same from the outside.",
      "We do not keep prompts or replies. For billing we keep the model, the token counts and the cost. Your chat history lives in your browser, where you can export it or wipe it.",
      "Hosts still read the content to answer it, under their own policy. That is why we call this tier Anonymized, not Sealed.",
    ],
  },
  {
    slug: "anonymized-now-sealed-next",
    title: "Anonymized now, sealed next",
    date: "2026-11-25",
    summary: "Two privacy tiers, and what changes when a model runs on attested hardware.",
    body: [
      "Every model on Wisp carries a tier label. Today all of them are Anonymized: your identity is removed, but the host can read the content to answer it.",
      "Next come Sealed models. A few open-weight models will run on attested hardware, where the machine proves what code it runs and neither the host nor Wisp can read the content.",
      "Sealed calls will need our SDK, because the client checks the attestation before it sends anything. Anonymized calls keep working with any OpenAI-style SDK.",
      "We will label each model clearly, so you always know which promise applies to the call you are making.",
    ],
  },
];

export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  // Real dates only: the domain, the repo and the first deploy are all from 2026-11-25.
  { date: "2026-11-26", title: "Plainer wording, open source", items: ["The site says Anonymized, not Private, and states that Wisp keeps one billing row per call tied to your account.", "Swap-tax and holder-reward claims removed; Holder Credit is shown as planned until it is switched on.", "The source is public on GitHub, with tests and a CI check on every push.", "Wisp Chat now tells you when the browser cannot save or load your chats.", "Per-call billing rows are deleted after 30 days."] },
  { date: "2026-11-25", title: "Public launch", items: ["Wisp Chat, Wisp Console and the OpenAI-compatible API open at runwisp.xyz.", "Sign in by signing one message, no email and no password. Top up in USDG on Robinhood Chain to your own deposit address.", "Every call holds its worst case, then settles to what it used, and streams end with a receipt. A call that fails before any output releases its hold in full.", "Image jobs run on the same key, priced before they run; results are deleted from our servers once fetched.", "Status page refreshed every 30 seconds, and a free trial on the home page without a wallet."] },
];

export const ROADMAP: { label: string; state: "live" | "next" | "later" }[] = [
  { label: "One key for every model in the catalog", state: "live" },
  { label: "Wallet sign-in and USDG top-ups", state: "live" },
  { label: "Image jobs", state: "live" },
  { label: "Video and music jobs", state: "next" },
  { label: "Wisp Chat and Wisp Console", state: "live" },
  { label: "Sealed models on attested hardware", state: "next" },
  { label: "Paying in $WISP and hourly Holder Credit", state: "next" },
  { label: "Code mode in Wisp Chat", state: "later" },
  { label: "More private tools on the same key", state: "later" },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "What does anonymized mean on Wisp?", a: "Your wallet, IP address and client details are stripped before a request leaves us, and the call goes out under a shared key. We keep no copy of prompts or replies, but we do keep one billing row per call (model, tokens, cost) tied to your account, so Wisp itself knows which account made each call. Those rows are deleted after 30 days. The host still reads the content to answer it, so today's tier is called Anonymized. Sealed models, coming next, run on attested hardware that no one can read." },
  { q: "How are prices set?", a: "Each model has a Wisp price per use, shown before every call and on every receipt. We only compare with a maker's list price once we have checked it on the maker's own page." },
  { q: "Do I need an account?", a: "No. You need a wallet. Sign one message to sign in. There is no email, no password and no form. Free models work with a small trial even before that." },
  { q: "How do I pay?", a: "Send USDG on Robinhood Chain to your own deposit address. Each call holds its worst case, then charges what it really used. A call that fails before any output costs nothing." },
  { q: "Where is my chat history?", a: "In your browser only. You can export it or wipe it at any time. None of it sits on our servers." },
  { q: "Will my code work?", a: "If it uses the OpenAI SDK, yes. Set base_url to the Wisp gateway and use your Wisp key. Media runs as jobs on the same key." },
  { q: "What is $WISP for?", a: "Two things are planned for after launch: Holder Credit, an hourly pool of platform credit shared across wallets holding about $20 or more, and paying for models in $WISP. Neither is live yet." },
];
