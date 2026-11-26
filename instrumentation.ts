// Runs once when the Next.js server boots: starts the on-chain deposit watcher (no-op on the mock chain).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return; // never start timers while building
  const { releaseOrphanHolds } = await import("./lib/billing");
  const released = releaseOrphanHolds(); // before any new call can start
  if (released) console.log(`[billing] released ${released} hold(s) left open by the last run`);
  const { startChainWatcher } = await import("./lib/chain");
  startChainWatcher();
  const { refreshKieCredits } = await import("./lib/kie");
  if (process.env.KIE_API_KEY) {
    void refreshKieCredits();
    setInterval(() => void refreshKieCredits(), 5 * 60_000).unref(); // the media balance guard reads this
  }
  const { purgeOldCalls } = await import("./lib/db");
  purgeOldCalls();
  setInterval(() => { try { purgeOldCalls(); } catch (e) { console.error("[purge]", e); } }, 3600_000).unref();
}
