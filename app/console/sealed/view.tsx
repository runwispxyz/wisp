"use client";
import { MARKS, Pix } from "@/components/console/art";
import { Card, Head, s } from "@/components/console/ui";

const POINTS = [
  ["Attested hardware", "Sealed models will run inside GPU enclaves that prove, with a signed attestation, which code and weights are loaded before a request is sent."],
  ["Encrypted end to end", "The prompt is encrypted to the enclave's key, so neither Wisp nor the host can read it in transit or in memory."],
  ["Checkable receipts", "Each reply will carry the attestation it ran under, so your code can verify it instead of trusting a badge."],
];

export default function Sealed() {
  return (
    <>
      <Head art="sealed" title="Sealed" sub="Not built yet: nothing on this page runs today. Today Wisp strips who you are from each request; Sealed goes further and runs the model where nobody, us included, can see what you sent." />
      <div className={s.bento}>
        <Card star title="Sealed models" note="Not open yet" className={s.s8}>
          <span className={`${s.big}`}><Pix art={MARKS.sealed} cell={18} gap={4} /></span>
          <p className={s.lbl} style={{ maxWidth: "52ch", fontSize: 15, lineHeight: 1.5 }}>Sealed models will appear in Models with a Sealed label when they ship. Until then, every model already runs without your wallet, IP or device attached to the call.</p>
          <form className={`${s.row} ${s.locked}`} style={{ marginTop: 22 }} onSubmit={(e) => e.preventDefault()} aria-describedby="sealed-note">
            <input className={s.input} style={{ flex: 1, minWidth: 200, width: "auto" }} placeholder="Waitlist opens soon" disabled aria-label="Waitlist (not open yet)" />
            <button className={`${s.btn} ${s.lit}`} style={{ height: 38 }} disabled>Join waitlist</button>
          </form>
          <p id="sealed-note" className={`${s.lbl} ${s.note}`}>The waitlist is not open yet.</p>
        </Card>
        <Card title="Today" className={s.s4}>
          <dl className={s.facts}>
            <div><dt>Wallet sent to host</dt><dd>Never</dd></div>
            <div><dt>Prompts stored</dt><dd>Never</dd></div>
            <div><dt>Enclave attestation</dt><dd className={s.dim}>Coming</dd></div>
          </dl>
        </Card>
        {POINTS.map(([t, d]) => (
          <Card key={t} title={t} className={s.s4}>
            <p className={s.lbl}>{d}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
