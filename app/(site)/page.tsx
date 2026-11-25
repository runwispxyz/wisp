import Link from "next/link";
import { HAS_LIST, MODELS, discount, fromMicro, mediaCost, usd, type Kind } from "@/lib/models";
import { TRIAL_MEDIA, TRIAL_PROMPTS } from "@/lib/trial";
import { SITE } from "@/lib/site";
import { AskBox } from "@/components/site/AskBox";
import { Catalog } from "@/components/site/Catalog";
import { DotScene, type Scene } from "@/components/site/DotScene";
import { Showcase } from "@/components/site/Showcase";
import { Icon } from "@/components/site/icons";
import { Edge, Eyebrow, Head, KIND_ICON, MakerMark, kindVar } from "@/components/site/parts";
import { ContractBox, HeroCA, TokenFacts } from "@/components/site/Token";
import { HOLDER_CREDIT_ON as HC } from "@/lib/chain";
import { getContract, isPlaceholder } from "@/lib/settings";
import { Countdown, HowItWorks, WhatBuys } from "@/components/site/widgets";
import { FAQ, ROADMAP } from "@/components/site/content";
import s from "@/components/site/site.module.css";

const MAKERS = [...new Set(MODELS.map((m) => m.maker))].map((name) => {
  const ms = MODELS.filter((m) => m.maker === name);
  return { name, n: ms.length, kind: ms[0].kind };
});
const best = MODELS.filter((m) => m.kind === "chat" && m.list).sort((a, b) => b.list![0] - a.list![0])[0];
const topSave = Math.max(...MODELS.map((m) => discount(m) ?? 0));
const cheapIn = Math.min(...MODELS.filter((m) => m.kind === "chat").map((m) => m.price[0]));

const FEATURES: { t: string; d: string; chips: [string, boolean?, boolean?][]; icon: string; scene: Scene; span: string }[] = [
  { t: "One key, many models", d: "Chat and image models behind one wallet, one balance and one key. Video and music are coming soon.", chips: [["wsp_3k9…a1c", false, true], [`${MODELS.length} models on this key`, true]], icon: "key", scene: "key", span: s.f7 },
  { t: "Identity removed", d: "Your wallet, IP address and user agent come off before a request leaves us. Calls go out under one shared key.", chips: [["IP removed"], ["user agent removed"], ["shared key", true]], icon: "shield", scene: "scan", span: s.f5 },
  { t: "Sealed models", d: "Not built yet. The plan: a few open-weight models on attested hardware that neither the host nor Wisp can read. Until then every model is Anonymized.", chips: [["not built yet", true], ["planned"]], icon: "lock", scene: "rings", span: s.f4 },
  { t: "History in your browser", d: "Chats and media live on your device. Export them or wipe them whenever you like.", chips: [["local only"], ["export"], ["wipe"]], icon: "screen", scene: "grid", span: s.f4 },
  { t: "Works with the OpenAI SDK", d: `Change base_url to ${SITE.gateway} and keep the code you already have.`, chips: [["base_url=…/v1", true, true], ["same SDK"]], icon: "code", scene: "wave", span: s.f4 },
  { t: "Held, then settled", d: "Each call holds its worst case and charges only what it used. A call that fails before output costs nothing.", chips: [["held $0.020", false, true], ["charged $0.0014", true, true], ["released $0.0186", false, true]], icon: "hold", scene: "bars", span: s.f6 },
  { t: "Pay with USDG", d: `Top up on ${SITE.chain} from your own deposit address. No card, no subscription.`, chips: [["USDG"], [`${SITE.ticker} planned`, true]], icon: "coin", scene: "portal", span: s.f6 },
];

const MEDIA: { k: Kind; cls: string; p: string; n: number; what: string; scene: Scene }[] = [
  { k: "image", cls: s.gImage, p: "A paper lantern drifting over a still lake at night, soft glow, long exposure", n: 1, what: "one image", scene: "orb" },
  { k: "video", cls: s.gVideo, p: "A slow pan across a city rooftop at dawn, steam rising from the vents", n: 8, what: "an 8-second clip", scene: "grid" },
  { k: "music", cls: s.gMusic, p: "Warm lo-fi piano with brushed drums, slow and quiet", n: 1, what: "one song", scene: "bars" },
];

export const dynamic = "force-dynamic"; // the contract address is set at runtime from /admin

export default function Home() {
  const contract = getContract();
  return (
    <>
      <section className={s.homeHero}>
        <div className={s.homeBg} aria-hidden><DotScene scene="hero" /></div>
        <div className={s.heroHead}>
          <h1 className={s.heroTitle}>
            <span><em className={s.inkA}>Wisp</em> sends the <em className={s.inkB}>question</em>,</span>
            <span>never <em className={s.inkC}>who asked</em></span>
          </h1>
          <p className={s.heroLine}>Chat and image models, paid per use, with no copy of your prompts or replies kept.{HC && ` Holding ${SITE.ticker} earns model credit every hour.`}</p>
          <HeroCA contract={contract} />
        </div>
        <div className={s.heroFoot}><AskBox /></div>
      </section>

      <section className={s.proof}>
        <Edge l={0} m={1} r={0} />
        <div className={s.proofIn}>
          <div className={s.top}>
            <div className={s.count}>
              <p className={s.fig}>{MODELS.length}</p>
              <p className={s.k}>Models on one key<span>from {MAKERS.length} makers</span>
                <span className={s.swatch}>{MODELS.map((m) => <i key={m.id} style={kindVar(m.kind)} />)}</span>
              </p>
            </div>
            <Link href="/#catalog" className={s.makers} aria-label={`${MAKERS.length} makers, see the catalog`}>
              <span className={s.ticker}>
                {[0, 1].map((n) => (
                  <span key={n} className={s.set} aria-hidden={n === 1 || undefined}>
                    {MAKERS.map((m) => (
                      <span key={m.name} className={s.mTile} style={kindVar(m.kind)}>
                        <MakerMark name={m.name} />
                        <span className={s.who}><b>{m.name}</b><em>{m.n} model{m.n === 1 ? "" : "s"}</em></span>
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </Link>
          </div>
          <ul className={s.facts}>
            {HAS_LIST ? <li className={s.fact}>
              <p className={s.sig}><i />Below list price</p>
              <p className={s.big}><small>up to</small>{topSave}<span>%</span></p>
              <span className={s.meters} aria-hidden>
                <span className={s.meter}><em>list</em>{Array.from({ length: 20 }, (_, i) => <i key={i} className={s.on} />)}</span>
                <span className={s.meter}><em>wisp</em>{Array.from({ length: 20 }, (_, i) => <i key={i} className={i < 20 - topSave / 5 ? s.mLit : ""} />)}</span>
              </span>
              {best && <p className={s.factNote}>{best.name}, {usd(best.price[0], 2)} against {usd(best.list![0], 2)} per 1M input tokens</p>}
            </li> : <li className={s.fact}>
              <p className={s.sig}><i />Free prompts</p>
              <p className={s.big}><small>before a wallet</small>{TRIAL_PROMPTS}</p>
              <span className={s.chips}><span>no wallet</span><span>{TRIAL_MEDIA} can be images</span><span>then pay per call</span></span>
              <p className={s.factNote}>Try the free models in Wisp Chat first. After that, chat starts at {usd(cheapIn)} per 1M input tokens, with no subscription.</p>
            </li>}
            <li className={s.fact}>
              <p className={s.sig}><i />Prompts kept</p>
              <p className={s.big}>0</p>
              <ul className={s.ledger}>
                <li><span>Your prompt</span><b>not kept</b></li>
                <li><span>The reply or the media</span><b>not kept</b></li>
                <li><span>Wallet, IP, device</span><b>kept from the host</b></li>
                <li className={s.keeps}><span>Billing rows</span><b>model, tokens, cost · 30 days</b></li>
              </ul>
            </li>
            <li className={s.fact}>
              <p className={s.sig}><i />Signature to sign in</p>
              <p className={s.big}>1</p>
              <span className={s.chips}><span>no email</span><span>no password</span><span>no form</span></span>
              <p className={s.factNote}>Sign one message with your wallet. There is nothing else to fill in.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className={`${s.band} ${s.clipX}`}>
        <Edge l={1} m={1} r={0} />
        <Head layout="center" icon="chat" label="Wisp Chat" note="the app" lit="Every model in one window," title="with a receipt on every reply"
          lede="Chat and images sit behind one wallet. Each answer shows what it cost and exactly what reached the model." />
        <Showcase />
        <div className={s.fanFoot} style={{ marginTop: 18 }}>
          <Link href="/chat" className="btn btn-primary">Open Wisp Chat</Link>
          <p className={s.sample}>Sample screens, sample data</p>
        </div>
      </section>

      <section className={`${s.band} ${s.clipX}`} id="catalog">
        <Edge l={1} m={0} r={1} />
        <Head icon="grid" label="Catalog" note={`${MODELS.length} models`} lit="Every model we run," title={HAS_LIST ? "priced next to its list price" : "with its price up front"} glow={1}
          lede={<>Chat and image models answer on one key, each with its price per use shown before you call it. Press <kbd className={s.sKey}>/</kbd> to search.</>} />
        <div className={s.inner}><Catalog /></div>
      </section>

      <section className={s.band} id="holder-credit">
        <Edge l={0} m={1} r={1} />
        <Head icon="coin" label="Holder Credit" note={HC ? "every hour" : "planned"} lit={`Hold ${SITE.ticker},`} title="and share an hourly pool of model credit" glow={2}
          lede={`Wisp sets aside a pool of platform credit each hour and shares it across wallets holding about $${SITE.holderMinUsd} of ${SITE.ticker} or more, in step with what each one holds.${HC ? "" : " It is switched on after launch."}`} />
        <div className={s.hcSplit}>
          <div className={`${s.surface} ${s.dotfill} ${s.hcArt}`}><div className={s.fill}><DotScene scene="rings" /></div></div>
          <div className={s.hcSide}>
            <ol className={s.hcSteps}>
              <li className={s.hcStep}><span className={s.num}>1</span><span className={s.stepText}><b>Hold {SITE.ticker}</b><span>Your wallet is the account. Hold about ${SITE.holderMinUsd} or more, with nothing to sign up for.</span></span></li>
              <li className={`${s.hcStep} ${s.now}`}><span className={s.num}>2</span><span className={s.stepText}><b>Your share, each hour</b><span>At the top of each hour the pool is split by each wallet&apos;s balance at that moment.</span></span></li>
              <li className={s.hcStep}><span className={s.num}>3</span><span className={s.stepText}><b>Spend it on any model</b><span>It lands as platform credit, for Wisp Chat or the API.</span></span></li>
            </ol>
            <WhatBuys />
          </div>
        </div>
        <div className={s.hcNoteWrap}><p className={s.hcNote} style={{ marginLeft: 0 }}>Holder Credit is paid as platform credit for models. It is not cash, it cannot be withdrawn, and it carries no promise of value.</p></div>
      </section>

      <section className={s.band}>
        <Edge l={0} m={0} r={1} />
        <Head icon="spark" label="Features" note="what you get" lit="One key and one balance," title="and the model has no idea who you are" />
        <ul className={s.fGrid}>
          {FEATURES.map((f) => (
            <li key={f.t} className={`${s.surface} ${s.dotfill} ${s.fCard} ${f.span}`}>
              <div className={s.fArt}><DotScene scene={f.scene} /></div>
              <div className={s.fText}>
                <ul className={s.over}>{f.chips.map(([c, lit, mono]) => <li key={c} className={`${s.chip} ${lit ? s.chipFill : ""} ${mono ? s.mono : ""}`} style={mono ? { fontSize: 12 } : undefined}>{c}</li>)}</ul>
                <h3 className={s.fTitle}><span className={s.fBadge}><Icon name={f.icon} size={18} /></span>{f.t}</h3>
                <p className={s.fBody}>{f.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.band}>
        <Edge l={1} m={0} r={0} />
        <Head layout="center" icon="door" label="How it works" note="one request" lit="Your identity stops" title="at the gateway"
          lede="Your wallet signs you in and your balance pays. The request reaches the model under a shared key, so the host sees the question but not your wallet, IP or device." />
        <div className={s.hwRow}>
          <HowItWorks />
          <div className={s.notes}>
            <div className={s.hNote}><p className={s.noteTitle}>Identity removed</p><p className={s.noteBody}>Wallet, IP address and client details are dropped before a request leaves our servers, and every call goes out under one shared key.</p></div>
            <div className={s.hNote}><p className={s.noteTitle}>No content kept</p><p className={s.noteBody}>No copy of prompts or outputs. Wisp does keep one billing row per call, tied to your account: the model, the token counts and the cost. Rows older than 30 days are deleted.</p></div>
          </div>
        </div>
        <div className={s.moreRow}><Link href="/thesis#privacy" className={s.link}>How privacy works</Link></div>
      </section>

      <section className={s.band}>
        <Edge l={0} m={1} r={1} />
        <Head icon="image" label="Image, video and music" note="video and music soon" lit="Know the price" title="before you press generate" glow={3}
          lede="The cost is shown up front, held while the job runs, and charged only for what actually arrives." />
        <ul className={s.gGrid}>
          {MEDIA.map((x) => {
            const m = MODELS.find((y) => y.kind === x.k);
            if (!m) return (
              <li key={x.k} className={`${s.surface} ${s.dotfill} ${s.gCard} ${x.cls} ${s.soonCard}`} style={kindVar(x.k)}>
                <div className={s.preview}>
                  <DotScene scene={x.scene} tint={`--kind-${x.k}`} solid />
                  <span className={s.gKind}><Icon name={KIND_ICON[x.k]} size={12} />{x.k}</span>
                </div>
                <div className={s.gText}>
                  <p className={s.prompt}>{x.p}</p>
                  <p className={s.meta}><span className={s.soonBadge}>Coming soon</span><span className={s.cost}>no charge until it is live</span></p>
                </div>
              </li>
            );
            const c = mediaCost(m, x.n);
            return (
              <li key={x.k} className={`${s.surface} ${s.dotfill} ${s.gCard} ${x.cls}`} style={kindVar(x.k)}>
                <div className={s.preview}>
                  <DotScene scene={x.scene} tint={`--kind-${x.k}`} solid />
                  <span className={s.gKind}><Icon name={KIND_ICON[x.k]} size={12} />{x.k}</span>
                  {x.k === "video" && (
                    <div className={s.job}>
                      <p className={s.settings}><span>{x.n} seconds</span><span>16 by 9</span><span>{m.name}</span></p>
                      <span className={s.progress} aria-hidden><i /></span>
                      <dl className={s.jSteps}>
                        <div><dt>Held</dt><dd>{c != null ? usd(fromMicro(c)) : "—"}</dd></div>
                        <div><dt>Generating</dt><dd>62%</dd></div>
                        <div><dt>Then</dt><dd>saved to this browser</dd></div>
                      </dl>
                    </div>
                  )}
                </div>
                <div className={s.gText}>
                  <p className={s.prompt}>{x.p}</p>
                  <p className={s.meta}><span>{m.name}</span><span className={s.cost}>{c != null ? usd(fromMicro(c)) : "—"} for {x.what}</span></p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={s.band}>
        <Edge l={0} m={0} r={1} />
        <div className={s.tkPad}>
          <Head icon="coin" label="Token" note={SITE.ticker} lit={SITE.ticker} title="for the people who use Wisp"
            lede={`A fixed-supply token on ${SITE.chain}. Holder Credit ${HC ? "pays holders model credit every hour" : "and paying for models in it are planned"}.`} />
          {isPlaceholder(contract)
            ? <p className={s.planned}><span className={s.state}><i className={s.pulse} />Before launch</span>The contract address, chart and buy links appear here at launch.</p>
            : <p className={s.planned}><span className={s.state}><i className={s.pulse} />Live</span>{SITE.ticker} is live on {SITE.chain}. Always check the address below before you buy.</p>}
          <ContractBox contract={contract} />
        </div>
        <TokenFacts />
        <div className={s.tkCards}>
          <div className={`${s.surface} ${s.dotfill} ${s.tkCard}`}>
            <div className={s.tkArt}><DotScene scene="bars" /></div>
            <div className={s.tkText}>
              <div className={s.tkHead}><h3><span className={s.fBadge}><Icon name="clock" size={18} /></span>Holder Credit</h3>{HC ? <span className={s.tkChip}><i />next sweep <b><Countdown bare /></b></span> : <span className={s.tkNote}>planned, after launch</span>}</div>
              <p>Each hour a pool of platform credit is shared across wallets holding about ${SITE.holderMinUsd} or more, by their balance at the top of the hour.</p>
              <Link href="/token#holder-credit" className={`${s.link} ${s.more}`}>How Holder Credit works</Link>
            </div>
          </div>
          <div className={`${s.surface} ${s.dotfill} ${s.tkCard}`}>
            <div className={s.tkArt}><DotScene scene="portal" /></div>
            <div className={s.tkText}>
              <div className={s.tkHead}><h3><span className={s.fBadge}><Icon name="coin" size={18} /></span>Pay with {SITE.ticker}</h3><span className={s.tkNote}>planned, at face value</span></div>
              <p>Once open, a top-up in {SITE.ticker} is credited at its market value, with no bonus. Large top-ups are checked by hand. Tokens received this way are sold, not burned.</p>
              <Link href="/token" className={`${s.link} ${s.more}`}>Token details</Link>
            </div>
          </div>
        </div>
      </section>

      <section className={s.band} style={{ paddingBottom: "clamp(56px, 7vw, 96px)" }}>
        <Edge l={1} m={0} r={1} />
        <Head icon="clock" label="Roadmap" note="what comes next" title="What is live, and what is next" lede="The API, Wisp Chat and Wisp Console are live and paid in USDG. Sealed models and paying in the token come next." />
        <div className={s.rmSplit}>
          <div className={s.term}>
            <div className={s.rmBody}>
              <ol className={s.rmList}>
                {ROADMAP.map((r, i) => (
                  <li key={r.label} className={`${s.rmItem} ${s[r.state]}`}>
                    {i > 0 && ROADMAP[i - 1].state === "live" && r.state !== "live" && <span className={s.beta}><span>Next up</span><span className={s.dash} /></span>}
                    <span className={s.n}>{i + 1}</span><span>{r.label}</span><span className={s.status}>{r.state[0].toUpperCase() + r.state.slice(1)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className={s.rocket}><DotScene scene="beam" /></div>
        </div>
      </section>

      <section className={s.band}>
        <Edge l={0} m={1} r={0} />
        <div className={s.faqLayout}>
          <div className={s.faqSide}>
            <div className={s.titleBox}>
              <span className={s.glow} aria-hidden />
              <Eyebrow icon="doc" label="Questions" note="plain answers" />
              <h2 className={s.title}>Asked first</h2>
            </div>
            <div className={s.faqScene}><DotScene scene="orb" /></div>
          </div>
          <div className={s.faqList}>
            {FAQ.map((f, i) => (
              <details key={f.q} className={s.faqItem} open={i === 0}>
                <summary className={s.q}>{f.q}<i aria-hidden /></summary>
                <p className={s.a}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`${s.band} ${s.join}`}>
        <Edge l={0} m={0} r={0} />
        <div className={s.joinScene} aria-hidden><DotScene scene="arcs" /></div>
        <div className={s.wash} aria-hidden />
        <div className={s.joinIn}>
          <Eyebrow icon="arrow" label="Get started" note="three steps" center />
          <h2 className={s.joinTitle}><span>Anonymized AI,</span><span>paid per use</span></h2>
          <p className={s.joinBody}>Open Wisp Chat, connect a wallet and ask your first question, or take a key from Wisp Console and point your SDK at the gateway.</p>
          <div className={s.joinActions}>
            <Link href="/chat" className="btn btn-primary">Open Wisp Chat</Link>
            <Link href="/console/playground" className="btn"><Icon name="doc" />Read the docs<span className={s.btnIc}><Icon name="out" size={12} /></span></Link>
          </div>
          <ol className={s.jSteps3}>
            {[
              ["key", "Connect a wallet", "Sign one message. No email, no form."],
              ["coin", "Top up", "Send USDG to your own deposit address."],
              ["chat", "Use any model", "In Wisp Chat, or from your code with a key from Wisp Console."],
            ].map(([ic, t, d], i) => (
              <li key={t} className={s.jStep}>
                <span className={s.jNode} style={{ "--i": i } as React.CSSProperties}><Icon name={ic} size={18} /></span>
                <span className={s.jNum}>{i + 1}</span>
                <b className={s.jTitle}>{t}</b>
                <span className={s.jLine}>{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
