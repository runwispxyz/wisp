import Link from "next/link";
import { Doc } from "@/components/site/Doc";
import { MODELS } from "@/lib/models";
import { SITE } from "@/lib/site";

export const metadata = { title: "About", description: "What Wisp is, what we build and how we work." };

export default function About() {
  return (
    <Doc
      eyebrow="About"
      title={<>A gateway that <em>forgets you</em> on purpose</>}
      lead="Wisp is private AI inference, paid per use. We build the gateway, the chat app and the console, and we try to know as little about you as we can."
      sections={[
        { id: "what", title: "What Wisp is", body: [
          `One wallet, one balance and one key for ${MODELS.length} chat and image models. Every request passes ${SITE.gateway}, where your identity comes off and the cost is held before the model is called.`,
          "You can use it from Wisp Chat in the browser, or from your own code with the OpenAI SDK you already use.",
        ] },
        { id: "build", title: "What we build", body: [
          <ul key="l"><li><Link href="/chat" className="accent">Wisp Chat</Link>: every model in one window, history kept in your browser.</li><li><Link href="/console" className="accent">Wisp Console</Link>: keys, usage, top-ups and a playground.</li><li>The gateway: the one address every key calls.</li></ul>,
        ] },
        { id: "how", title: "How we work", body: [
          "We keep the smallest record that lets billing work: the model, the token counts and the cost. No prompts, no replies, no email.",
          "Prices are per use and shown before every call. We only compare with a maker's list price once we have checked it on the maker's own page.",
          "We ship in public. The changelog lists every change you would notice, and the status page shows whether each part answers right now.",
          <p key="links"><Link href="/changelog" className="accent">Changelog</Link> · <Link href="/status" className="accent">Status</Link> · <Link href="/thesis" className="accent">Thesis</Link></p>,
        ] },
      ]}
    />
  );
}
