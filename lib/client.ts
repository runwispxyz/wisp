"use client";
// Browser-side helpers: wallet sign-in (injected wallet, or a local demo wallet for the mock chain) and API calls.
import { createSiweMessage } from "viem/siwe";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useCallback, useEffect, useState } from "react";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const eth = () => (typeof window === "undefined" ? undefined : (window as unknown as { ethereum?: Eth }).ethereum);
export const hasInjectedWallet = () => !!eth();

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663);
const RPC = process.env.NEXT_PUBLIC_RPC_URL;
/** Live chain: a real RPC is configured, so the in-browser demo wallet is off. */
export const LIVE = !!RPC;
const DEMO_KEY = "wisp_demo_wallet";

function demoAccount() {
  let k: `0x${string}` | null = null;
  try { k = localStorage.getItem(DEMO_KEY) as `0x${string}` | null; } catch {}
  if (!k) {
    k = generatePrivateKey();
    try { localStorage.setItem(DEMO_KEY, k); } catch {}
  }
  return privateKeyToAccount(k);
}

async function addChain(e: Eth) {
  if (!RPC) return; // mock chain: nothing to add
  const hex = "0x" + CHAIN_ID.toString(16);
  try {
    await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch {
    await e.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: hex, chainName: "Robinhood Chain", rpcUrls: [RPC], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
    }).catch(() => {}); // best effort on purpose: SIWE sign-in works on any network; only deposits need Robinhood Chain
  }
}

export type SignInStep = "connect" | "sign" | "done";

/** Connect → sign one SIWE message → server sets an httpOnly session cookie. */
export async function signIn(opts: { demo?: boolean; onStep?: (s: SignInStep) => void } = {}) {
  const e = eth();
  if (LIVE && (opts.demo || !e)) throw new Error("Connect a browser wallet such as MetaMask or Rabby to sign in.");
  opts.onStep?.("connect");
  let address: `0x${string}`;
  let sign: (m: string) => Promise<string>;
  if (e && !opts.demo) {
    const accs = (await e.request({ method: "eth_requestAccounts" })) as string[];
    address = accs[0] as `0x${string}`;
    await addChain(e);
    sign = (m) => e.request({ method: "personal_sign", params: [m, address] }) as Promise<string>;
  } else {
    const a = demoAccount();
    address = a.address;
    sign = (m) => a.signMessage({ message: m });
  }
  opts.onStep?.("sign");
  const { nonce } = await (await fetch("/api/auth/nonce")).json();
  const message = createSiweMessage({
    domain: location.host, address, uri: location.origin, version: "1", chainId: CHAIN_ID, nonce,
    statement: "Sign in to Wisp. This costs nothing and sends no transaction.",
    expirationTime: new Date(Date.now() + 10 * 60_000),
  });
  const signature = await sign(message);
  const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, signature }) });
  if (!r.ok) throw new Error((await r.json()).error?.message || "Sign-in failed");
  opts.onStep?.("done");
  window.dispatchEvent(new Event("wisp:auth"));
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.dispatchEvent(new Event("wisp:auth"));
}

export type Me = {
  address: string; balance: number; depositAddress: string; mockChain: boolean;
  last30: { calls: number; spent: number; list: number; saved: number };
  holder: { tokens: number; valueUsd: number; eligible: boolean; earned: number; lastHour: number | null; min: number; minTokens: number; pool: number; price: number };
};

/** Signed-in account, refreshed on sign-in/out and on `wisp:refresh`. null = signed out, undefined = loading. */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const load = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    setMe(r.ok ? await r.json() : null);
  }, []);
  useEffect(() => {
    load();
    const f = () => load();
    window.addEventListener("wisp:auth", f);
    window.addEventListener("wisp:refresh", f);
    return () => { window.removeEventListener("wisp:auth", f); window.removeEventListener("wisp:refresh", f); };
  }, [load]);
  return { me, reload: load };
}
export const refreshMe = () => window.dispatchEvent(new Event("wisp:refresh"));

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `Request failed (${r.status})`);
  return j as T;
}

export type Receipt = { model: string; tokens_in: number; tokens_out: number; held: number; charged: number; list: number | null; removed: string[]; kept: string };

/** Stream a chat completion. Calls onDelta for text (and reasoning), resolves with the receipt. */
export async function streamChat(
  body: { model: string; messages: unknown[]; max_tokens?: number; temperature?: number },
  on: { delta?: (t: string) => void; reasoning?: (t: string) => void; signal?: AbortSignal } = {},
): Promise<Receipt | null> {
  const r = await fetch("/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, stream: true }), signal: on.signal,
  });
  if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error?.message || `Request failed (${r.status})`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let receipt: Receipt | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const ev = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (ev.startsWith(": receipt ")) receipt = JSON.parse(ev.slice(10));
      else if (ev.startsWith("data:") && !ev.includes("[DONE]")) {
        try {
          const j = JSON.parse(ev.slice(5));
          const d = j.choices?.[0]?.delta;
          if (d?.content) on.delta?.(d.content);
          if (d?.reasoning_content) on.reasoning?.(d.reasoning_content);
        } catch {}
      }
    }
  }
  return receipt;
}

/** Start a media job and wait for it. Resolves with a blob URL of the result (the server deletes it after this). */
export async function runJob(body: { model: string; prompt: string; seconds?: number }, onStatus?: (s: string) => void) {
  const j = await api<{ id: string; held: number }>("/v1/jobs", { method: "POST", json: body });
  onStatus?.("running");
  for (let t = 0; t < 120; t++) {
    await new Promise((r) => setTimeout(r, 1500));
    const s = await api<{ status: string; error: string | null; mime: string; charged: number | null }>(`/v1/jobs/${j.id}`);
    if (s.status === "failed") throw new Error(s.error || "Job failed");
    if (s.status === "succeeded") {
      const blob = await (await fetch(`/v1/jobs/${j.id}/content`)).blob();
      return { blob, mime: s.mime, charged: s.charged ?? 0, held: j.held };
    }
  }
  throw new Error("Job took too long");
}

export const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
