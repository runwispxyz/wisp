import { Doc } from "@/components/site/Doc";
import { SITE } from "@/lib/site";

export const metadata = { title: "Thesis", description: "Why AI should cost less and know less about the person using it." };

export default function Thesis() {
  return (
    <Doc
      eyebrow="Thesis"
      title={<>AI should cost less <em>and know less</em> about you</>}
      lead="An essay on why one private balance across every model is worth building."
      sections={[
        { id: "problem", title: "The problem", body: [
          "Using models from several makers means an account with each, a card on file with each, and an invoice from each. Every request carries a trail back to the person who sent it: an email, a billing address, an IP, a device.",
          "Small users also pay the full list price. The discounts go to whoever can sign a volume contract.",
        ] },
        { id: "bet", title: "The bet", body: [
          "A single gateway in front of many makers can fix both problems at once. It pools demand, so one balance can reach every model. It sends traffic under one shared key, so no host can tell one user from another.",
          "The gateway still has to be trusted with the request in transit. So it should keep as little as possible, and say plainly what it keeps.",
        ] },
        { id: "privacy", title: "Privacy, plainly", body: [
          "Here is what happens to a request on Wisp. Your wallet signs you in; the server stores only a keyed hash of the address. When you send a call, the gateway holds its worst-case cost against your balance.",
          "Before the call leaves, the gateway drops your wallet, IP address, user agent and any header that points back to you. The call goes to the host under a shared key.",
          "The host reads the messages to answer them. That is the Anonymized tier: the host knows the question, not the person. We keep no copy of prompts or replies. Billing keeps the model, the token counts and the cost.",
          "The Sealed tier, coming next, closes the remaining gap. Models run on attested hardware, the client checks the attestation before sending, and neither the host nor Wisp can read the content.",
          "Your chat history stays in your browser. You can export it or wipe it. We cannot hand over what we never stored.",
        ] },
        { id: "token", title: "Why a token", body: [
          `${SITE.ticker} connects people who believe in this to the thing itself. Holder Credit, planned for after launch, shares an hourly pool of model credit across holders. It is a way to use the product, not a promise of profit.`,
        ] },
        { id: "next", title: "What comes next", body: [
          "Sealed models first. Then more private tools on the same key and the same balance, so one wallet keeps working across everything we build.",
        ] },
      ]}
    />
  );
}
