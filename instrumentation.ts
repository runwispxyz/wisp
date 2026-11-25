// Runs once when the Next.js server boots: starts the on-chain deposit watcher (no-op on the mock chain).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return; // never start timers while building
  const { startChainWatcher } = await import("./lib/chain");
  startChainWatcher();
  const { purgeOldCalls } = await import("./lib/db");
  purgeOldCalls();
  setInterval(() => { try { purgeOldCalls(); } catch (e) { console.error("[purge]", e); } }, 3600_000).unref();
}
