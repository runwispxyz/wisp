import { HOLDER_CREDIT_ON, tokenSupplyLabel } from "@/lib/chain";
import Link from "next/link";
import { Doc } from "@/components/site/Doc";
import { MODELS } from "@/lib/models";
import { SITE } from "@/lib/site";

export const metadata = { title: "Whitepaper", description: "The Wisp design: anonymized inference paid per use, in seven sections." };

export const dynamic = "force-dynamic"; // supply is read from the live contract

export default async function Whitepaper() {
  const supply = await tokenSupplyLabel();
  return (
    <Doc
      toc
      eyebrow="Whitepaper · v1.0 draft"
      title={<>Anonymized inference, <em>paid per use</em></>}
      lead={`Wisp replaces many accounts and many credentials with one wallet, one prepaid balance and one key. Every call passes ${SITE.gateway}, where its worst-case cost is held and every field that identifies the caller is removed.`}
      meta={<><span className="pill">v1.0</span><span className="pill">November 2026</span><span className="pill">draft for discussion</span><Link href="/console/playground" className="btn btn-sm">Read the docs</Link></>}
      sections={[
        { id: "intro", title: "Introduction", body: [
          "Calling AI models from several makers today means one account, one credential and one invoice per maker. Each request carries the caller's identity to the host, and anyone below volume pricing pays list.",
          "This paper sets out the design principles behind Wisp. Exact limits and endpoints live in the console and API reference.",
        ] },
        { id: "design", title: "Design", body: [
          "The client signs one Sign-In with Ethereum message. The server checks the signature and issues an httpOnly session cookie. No email, no password.",
          `All traffic goes through one gateway. It speaks the OpenAI chat completions format, so existing SDKs work by changing base_url. Images run as jobs on the same key; video and music come next. The catalog today holds ${MODELS.length} models.`,
          "Each request is processed in four steps: authenticate, hold the worst-case cost, strip identity and forward under a shared key, then settle to the real usage.",
        ] },
        { id: "tiers", title: "Privacy tiers", body: [
          <p key="a"><strong>Anonymized.</strong> Identity removed, no content kept, host reads content to answer under its own policy. All models today.</p>,
          <p key="s"><strong>Sealed.</strong> Model runs on attested hardware; the client verifies the attestation before sending; neither the host nor Wisp can read the content. Planned for selected open-weight models.</p>,
          "Billing rows keep the account, model, token counts and cost, so Wisp can link an account to its usage; the model host cannot. Chat history is stored only in the user's browser.",
        ] },
        { id: "pricing", title: "Pricing and billing", body: [
          "Prices are set per model and shown before each call. A list-price comparison appears only after it is checked on the maker's own page, with the date.",
          "Money is stored as integer micro-USD. Each call holds its worst case, then settles to what it used and releases the rest. A call that fails before any output releases its hold in full. Top-ups arrive as USDG on Robinhood Chain to a per-user deposit address.",
        ] },
        { id: "token", title: SITE.ticker, body: [
          `${SITE.ticker} is a fixed-supply token on ${SITE.chain} (chain id ${SITE.chainId}). Supply: ${supply ?? SITE.initialSupply}.`,
          `Holder Credit${HOLDER_CREDIT_ON ? "" : " (planned, switched on after launch)"}: at the top of every hour Wisp sets aside a pool of platform credit and splits it across wallets holding about $${SITE.holderMinUsd} or more, in step with each wallet's balance at that moment.`,
        ] },
        { id: "risks", title: "Risks and limits", body: [
          "Anonymized calls still expose content to the host. Users with stricter needs should wait for Sealed models.",
          "The gateway is a point of trust while a request is in transit. Keeping no content limits what a breach could reveal, but does not remove that trust.",
          "Hosts can change prices or drop models. Wisp may then raise a price, move closer to list, or remove a model.",
          `Nothing in this paper promises a price, a return or a profit. ${SITE.ticker} is not affiliated with Robinhood Markets, Inc.`,
        ] },
        { id: "future", title: "Future work", body: [
          "Sealed models on attested hardware. Paying in the token. More private tools on the same key and balance.",
        ] },
      ]}
    />
  );
}
