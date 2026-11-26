// Model catalog. Pure data, safe to import on client and server.
// Prices are USD. Chat: per 1M tokens (in/out). Image: per image. Video: per second. Music: per song.
// List prices: null until each one is checked on the maker's own page. Then set `list` and `listSource`;
// every "below list" figure on the site is computed from these, so nothing is claimed while they are null.

export type Kind = "chat" | "image" | "video" | "music";
export type Model = {
  id: string;
  name: string;
  maker: string;
  kind: Kind;
  upstream: string; // provider model id, server use only
  price: number[]; // chat: [in, out]; media: [unit]
  list: number[] | null;
  listSource?: string; // where and when the list price was checked, e.g. "mistral.ai/pricing, 2026-11-25"
  unit?: "image" | "second" | "song";
  context?: number;
  vision?: boolean;
  demo?: boolean; // no real provider behind it yet
  free?: boolean; // allowed on the no-wallet trial
};

export const MODELS: Model[] = [
  { id: "nemotron-3.5-lightning", name: "Nemotron 3.5 Lightning", maker: "NVIDIA", kind: "chat", upstream: "nvidia/nemotron-3.5-lightning-30b-a3b", price: [0.05, 0.2], list: null, context: 128000, free: true },
  { id: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash", maker: "MiniMax", kind: "chat", upstream: "minimaxai/minimax-m3.1-flash", price: [0.15, 0.6], list: null, context: 200000, free: true },
  { id: "mistral-large-4", name: "Mistral Large 4", maker: "Mistral", kind: "chat", upstream: "mistralai/mistral-large-4-1t-a52b", price: [1, 3], list: null, context: 128000 },
  { id: "nemotron-3-ultra", name: "Nemotron 3 Ultra", maker: "NVIDIA", kind: "chat", upstream: "nvidia/nemotron-3-ultra-550b-a55b", price: [0.6, 1.8], list: null, context: 128000 },
  { id: "step-5-preview", name: "Step 5 Preview", maker: "StepFun", kind: "chat", upstream: "stepfun-ai/step-5-preview", price: [0.4, 1.6], list: null, context: 64000 },
  { id: "glm-5.3-flash", name: "GLM 5.3 Flash", maker: "Z.ai", kind: "chat", upstream: "z-ai/glm-5.3-flash", price: [0.1, 0.4], list: null, context: 128000 },
  { id: "kimi-k3.1-pro", name: "Kimi K3.1 Pro", maker: "Moonshot", kind: "chat", upstream: "moonshotai/kimi-k3.1-pro", price: [1, 5], list: null, context: 256000 },
  // on Anthropic through the official SDK (lib/anthropic.ts), at low effort; prompts capped under 100K tokens
  { id: "claude-haiku-5.5", name: "Claude Haiku 5.5", maker: "Anthropic", kind: "chat", upstream: "anthropic:claude-haiku-5-5", price: [0.15, 0.75], list: null, context: 95000 },
  { id: "nemotron-3.5-super-vl", name: "Nemotron 3.5 Super VL", maker: "NVIDIA", kind: "chat", upstream: "nvidia/nemotron-3.5-super-vl-120b-a12b", price: [0.3, 1.2], list: null, context: 128000, vision: true },
  // image, video and music below run on kie.ai ("kie:" upstreams, lib/kie.ts); FLUX stays on NVIDIA
  { id: "z-image", name: "Z-Image", maker: "Alibaba", kind: "image", upstream: "kie:z-image", price: [0.006], list: null, unit: "image", free: true },
  { id: "nano-banana-2-lite", name: "Nano Banana 2 Lite", maker: "Google", kind: "image", upstream: "kie:nano-banana-2-lite", price: [0.03], list: null, unit: "image" },
  { id: "flux.1-schnell", name: "FLUX.1 schnell", maker: "Black Forest Labs", kind: "image", upstream: "black-forest-labs/flux.1-schnell", price: [0.003], list: null, unit: "image" },
  { id: "seedance-2-fast", name: "Seedance 2.0 Fast", maker: "ByteDance", kind: "video", upstream: "kie:bytedance/seedance-2-fast", price: [0.16], list: null, unit: "second" },
  { id: "suno-v6-mini", name: "Suno V6 Mini", maker: "Suno", kind: "music", upstream: "kie:ai-music-api/generate", price: [0.09], list: null, unit: "song" },
];

export const getModel = (id: string) => MODELS.find((m) => m.id === id);
/** Kinds that have at least one live model, in display order. Video and music return when a provider is wired in. */
export const LIVE_KINDS: Kind[] = (["chat", "image", "video", "music"] as Kind[]).filter((k) => MODELS.some((m) => m.kind === k));
/** Kinds shown as "coming soon": visible in every menu, but nothing can be generated or charged. */
export const SOON_KINDS: Kind[] = (["video", "music"] as Kind[]).filter((k) => !LIVE_KINDS.includes(k));
/** Every kind the UI shows, live first. */
export const SHOWN_KINDS: Kind[] = (["chat", "image", "video", "music"] as Kind[]).filter((k) => LIVE_KINDS.includes(k) || SOON_KINDS.includes(k));
export const isSoon = (k: Kind) => SOON_KINDS.includes(k);
/** True when at least one model has a checked list price, so "below list" copy can be shown. */
export const HAS_LIST = MODELS.some((m) => m.list);
export const DEFAULT_CHAT = "nemotron-3.5-lightning";

// micro-USD integers everywhere money is stored
export const toMicro = (usd: number) => Math.round(usd * 1e6);
export const fromMicro = (m: number) => m / 1e6;

export function chatCost(m: Model, tokIn: number, tokOut: number, list = false) {
  const p = list ? m.list : m.price;
  if (!p) return null;
  return toMicro((tokIn * p[0] + tokOut * p[1]) / 1e6);
}
export function mediaCost(m: Model, units: number, list = false) {
  const p = list ? m.list : m.price;
  if (!p) return null;
  return toMicro(units * p[0]);
}
export const discount = (m: Model) => (m.list ? Math.round((1 - m.price[0] / m.list[0]) * 100) : null);

export function usd(v: number, digits?: number) {
  const d = digits ?? (v === 0 ? 2 : v < 0.01 ? 4 : v < 1 ? 3 : 2);
  return "$" + v.toFixed(d);
}
export const priceLabel = (m: Model, list = false) => {
  const p = list ? m.list : m.price;
  if (!p) return "—";
  return m.kind === "chat" ? `${usd(p[0])} / ${usd(p[1])}` : usd(p[0]);
};
export const unitLabel = (m: Model) => (m.kind === "chat" ? "per 1M tokens, in / out" : `per ${m.unit}`);
