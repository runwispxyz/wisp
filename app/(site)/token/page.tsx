import Link from "next/link";
import { SITE } from "@/lib/site";
import { ContractBox, TokenFacts } from "@/components/site/Token";
import { getContract } from "@/lib/settings";
import { HOLDER_CREDIT_ON as HC } from "@/lib/chain";
import { Countdown, WhatBuys } from "@/components/site/widgets";
import s from "@/components/site/site.module.css";

export const metadata = { title: "Token", description: `${SITE.ticker} on ${SITE.chain}: Holder Credit and paying with the token.` };

export const dynamic = "force-dynamic";

export default function Token() {
  return (
    <>
      <section className={s.hero}>
        <div className={`${s.heroBg} dots`} aria-hidden />
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <span className="eyebrow">Token <span className="faint">· {SITE.ticker}</span></span>
            <h1 className={s.h1}>Hold {SITE.ticker}, <em>get model credit</em></h1>
            <p className={s.lead}>Every hour Wisp shares a pool of platform credit across holders, to spend on any model in Wisp.{HC ? "" : " Holder Credit is switched on after launch."}</p>
          </div>
          <div className="card" style={{ padding: 20, display: "grid", gap: 14 }}>
            <span className="faint">{HC ? "Next Holder Credit sweep" : "Holder Credit"}</span>
            {HC ? <Countdown big /> : <strong style={{ fontSize: 28, fontWeight: 500 }}>Planned</strong>}
            <dl className={s.kv}>
              <dt>Pool</dt><dd>set by Wisp each hour</dd>
              <dt>Paid as</dt><dd>platform credit</dd>
              <dt>Minimum</dt><dd>about ${SITE.holderMinUsd} held</dd>
            </dl>
          </div>
        </div>
      </section>
      <section className={s.wrap} style={{ display: "grid", gap: 14, paddingBottom: 72 }}>
        <ContractBox contract={getContract()} />
        <TokenFacts />
      </section>
      <section className={s.sec} id="holder-credit" style={{ scrollMarginTop: 60 }}>
        <div className={`${s.wrap} ${s.grid2}`} style={{ gap: 32 }}>
          <div className={s.prose}>
            <span className="eyebrow">Holder Credit</span>
            <h2 className={s.h2}>Credit every hour, <span>with nothing to claim</span></h2>
            {!HC && <p><strong>Planned.</strong> Holder Credit is switched on after launch. Until then nothing is paid.</p>}
            <p>At the top of each hour, Wisp sets aside a pool of platform credit, valued in USD.</p>
            <p>It is split between every wallet holding about <strong>${SITE.holderMinUsd}</strong> of {SITE.ticker} or more, in step with each wallet&apos;s <strong>balance at the top of the hour</strong>.</p>
            <p>Your share is added to your Wisp balance as platform credit. There is no button to press. Sign in to <Link href="/console" className="accent">Wisp Console</Link> with the same wallet to see it.</p>
            <p>Platform credit is prepaid access to models. It is not cash and cannot be withdrawn.</p>
          </div>
          <WhatBuys />
        </div>
      </section>
      <section className={s.sec}>
        <div className={`${s.wrap} ${s.prose}`}>
          <span className="eyebrow">Pay with {SITE.ticker}</span>
          <h2 className={s.h2}>At face value, <span>no bonus</span></h2>
          <p>Once open, a top-up in {SITE.ticker} is credited at its market value when it arrives: $1 of {SITE.ticker} adds $1 of credit to the same balance USDG uses. Large top-ups are checked by hand before they are credited. Tokens received this way are sold, not burned.</p>
          <p className="faint">Nothing on this page promises a price, a return or a profit.</p>
        </div>
      </section>
    </>
  );
}
