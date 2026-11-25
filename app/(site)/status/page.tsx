import { StatusBoard } from "@/components/site/StatusBoard";
import s from "@/components/site/site.module.css";

export const metadata = { title: "Status", description: "Whether every part of Wisp answers right now." };

export default function Status() {
  return (
    <section className={s.hero}>
      <div className={s.wrap}>
        <span className="eyebrow">Status</span>
        <h1 className={s.h1}>Is Wisp up?</h1>
        <p className={s.lead}>Every service and every model, checked every 30 seconds.</p>
        <div style={{ marginTop: 40 }}><StatusBoard /></div>
      </div>
    </section>
  );
}
