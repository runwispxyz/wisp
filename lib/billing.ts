import { db, now, tx } from "./db";

export type Hold = { callId: number; held: number };

/** Reserve the worst case. Returns null when the balance cannot cover it. */
export function hold(p: { accountId: number | null; keyId?: number; model: string; kind: string; amount: number; source: string }): Hold | null {
  return tx(() => {
    if (p.accountId != null) {
      const r = db.prepare("update accounts set balance = balance - ? where id = ? and balance >= ?").run(p.amount, p.accountId, p.amount);
      if (r.changes !== 1) return null;
    }
    const c = db
      .prepare("insert into calls (account_id, key_id, model, kind, held, status, source, created) values (?, ?, ?, ?, ?, 'held', ?, ?)")
      .run(p.accountId, p.keyId ?? null, p.model, p.kind, p.amount, p.source, now());
    return { callId: Number(c.lastInsertRowid), held: p.amount };
  });
}

/** Charge what was used (capped at the hold) and release the rest. */
export function settle(h: Hold, u: { cost: number; listCost: number | null; tokIn?: number; tokOut?: number; units?: number; failed?: boolean }) {
  const cost = u.failed ? 0 : Math.min(Math.max(0, u.cost), h.held);
  tx(() => {
    const call = db.prepare("select account_id, key_id from calls where id = ? and status = 'held'").get(h.callId) as
      | { account_id: number | null; key_id: number | null }
      | undefined;
    if (!call) return; // already settled
    db.prepare("update calls set cost = ?, list_cost = ?, tok_in = ?, tok_out = ?, units = ?, status = ? where id = ?").run(
      cost, u.listCost, u.tokIn ?? 0, u.tokOut ?? 0, u.units ?? 0, u.failed ? "failed" : "settled", h.callId,
    );
    if (call.account_id != null) db.prepare("update accounts set balance = balance + ? where id = ?").run(h.held - cost, call.account_id);
    if (call.key_id != null) db.prepare("update api_keys set spent = spent + ?, last_used = ? where id = ?").run(cost, now(), call.key_id);
  });
  return cost;
}

export function credit(accountId: number, amount: number) {
  db.prepare("update accounts set balance = balance + ? where id = ?").run(amount, accountId);
}
