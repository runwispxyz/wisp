import { SITE } from "@/lib/site";
import { HOLDER_CREDIT_ON, tokenSupplyLabel } from "@/lib/chain";
import { CopyButton, Countdown, HourDots } from "./widgets";
import s from "./site.module.css";

/** Hero: the live contract address with a copy button, or a quiet "at launch" before it is set. */
export function HeroCA({ contract }: { contract: string }) {
  const pending = contract.startsWith("[");
  return (
    <div className={s.heroCA}>
      <span className={s.heroCALabel}>{SITE.ticker} CA</span>
      {pending ? <code className={s.pending}>at launch</code> : <code title={contract}>{contract}</code>}
      {!pending && <CopyButton text={contract} />}
    </div>
  );
}

/** Contract line, chain and outbound links (shown as not yet available before launch). */
export function ContractBox({ contract }: { contract: string }) {
  const pending = contract.startsWith("[");
  return (
    <div className={s.tokenBar}>
      <div className={s.contract}>
        <span className={s.barLabel}>{SITE.ticker} contract</span>
        <span className={s.cLineBox}><code className={pending ? s.pending : ""}>{contract}</code></span>
        <CopyButton text={contract} disabled={pending} />
      </div>
      <span className={s.chain}><i />{SITE.chain}<em>{SITE.chainId}</em></span>
      <nav className={s.tLinks} aria-label="Token links">
        {["Chart", "Buy"].map((l) => <span key={l} className={s.tLink}>{l}<em>at launch</em></span>)}
        {pending
          ? <span className={s.tLink}>Explorer<em>at launch</em></span>
          : <a className={s.tLink} href={`https://robinhoodchain.blockscout.com/token/${contract}`} target="_blank" rel="noreferrer">Explorer<em>Blockscout ↗</em></a>}
      </nav>
    </div>
  );
}

/** Server component: supply comes from the token contract set in /admin (the same figure Pons shows). */
async function Specs() {
  const supply = await tokenSupplyLabel();
  return (
    <dl className={s.specs}>
      <div><dt>Supply</dt><dd>{supply ?? SITE.initialSupply}</dd><dd className={s.cap}>{supply ? "read from the token contract on-chain" : "initial supply at launch"}</dd></div>
      {HOLDER_CREDIT_ON
        ? <div><dt>Next sweep</dt><dd><Countdown bare /></dd><dd className={s.capDots}><HourDots /></dd><dd className={s.cap}>Holder Credit is paid at the top of every hour</dd></div>
        : <div><dt>Holder Credit</dt><dd>Planned</dd><dd className={s.cap}>switched on after launch</dd></div>}
      <div><dt>Chain</dt><dd>Robinhood</dd><dd className={s.cap}>chain id {SITE.chainId}</dd></div>
    </dl>
  );
}

export function TokenFacts() {
  return <div className={`${s.tkPanel} ${s.tkFacts}`}><Specs /></div>;
}

