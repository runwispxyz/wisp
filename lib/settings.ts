import { db, meta } from "./db";
import { SITE } from "./site";

/** Live contract address: set from /admin, falling back to the env placeholder. */
export function getContract(): string {
  return meta("contract") || SITE.contract;
}
export const isPlaceholder = (ca: string) => !ca || ca.startsWith("[");

export function setContract(ca: string | null) {
  if (ca) db.prepare("insert into meta (k, v) values ('contract', ?) on conflict(k) do update set v = excluded.v").run(ca);
  else db.prepare("delete from meta where k = 'contract'").run();
}
