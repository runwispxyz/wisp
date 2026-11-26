// kie.ai: the host for image, video and music jobs. Server only: it reads KIE_API_KEY.
// Each job is one task: create it, poll until it succeeds or fails, then download the file once.
// kie.ai gets the prompt and the settings below, sent with Wisp's own key: no wallet, IP or device.
const BASE = "https://api.kie.ai/api/v1";
const POLL_MS = 3000;
const DEADLINE_MS = 12 * 60_000; // kie.ai says some video tasks run past 10 minutes

type Kind = "image" | "video" | "music";

/** The task body for each model Wisp offers through kie.ai (upstream ids start with "kie:"). */
export function kieTask(upstream: string, prompt: string, seconds: number) {
  const model = upstream.replace(/^kie:/, "");
  switch (model) {
    case "z-image":
      return { model, input: { prompt: prompt.slice(0, 1000), aspect_ratio: "1:1", nsfw_checker: true } };
    case "nano-banana-2-lite":
      return { model, input: { prompt, aspect_ratio: "1:1" } };
    case "bytedance/seedance-2-fast":
      return { model, input: { prompt, resolution: "720p", aspect_ratio: "16:9", duration: seconds, generate_audio: true, nsfw_checker: true } };
    case "ai-music-api/generate":
      return { model, input: { custom_mode: false, instrumental: false, model: "V6_MINI", prompt: prompt.slice(0, 3000), style: prompt.slice(0, 200) } };
    default:
      throw new Error(`No kie.ai task is set up for ${model}`);
  }
}

async function call(path: string, init?: RequestInit) {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error("The media host is not configured. Nothing was charged.");
  const r = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => { throw new Error("The media host could not be reached. Nothing was charged; try again later."); });
  const j = (await r.json().catch(() => ({}))) as { code?: number; msg?: string; data?: unknown };
  // kie.ai answers HTTP 200 even on errors: the real status is in `code`
  if (j.code === 402) throw new Error("The media host is out of credit on our side. Nothing was charged; try again later.");
  if (j.code !== 200) throw new Error(`The media host refused the job (${j.code ?? r.status}). Nothing was charged.`);
  return j.data;
}

/** First result URL: images and video use resultUrls, Suno puts tracks in data[] (the first of the two is used). */
export function resultUrl(resultJson: string | undefined) {
  const r = JSON.parse(resultJson || "{}") as { resultUrls?: string[]; data?: { audio_url?: string }[] };
  return r.resultUrls?.[0] ?? r.data?.find((t) => t.audio_url)?.audio_url ?? null;
}

const FALLBACK_MIME: Record<Kind, string> = { image: "image/png", video: "video/mp4", music: "audio/mpeg" };

export async function kieGenerate(upstream: string, kind: Kind, prompt: string, seconds: number): Promise<{ file: Buffer; mime: string }> {
  const created = (await call("/jobs/createTask", { method: "POST", body: JSON.stringify(kieTask(upstream, prompt, seconds)) })) as { taskId?: string };
  if (!created?.taskId) throw new Error("The media host did not start the job. Nothing was charged.");
  const end = Date.now() + DEADLINE_MS;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const d = (await call(`/jobs/recordInfo?taskId=${encodeURIComponent(created.taskId)}`)) as { state?: string; resultJson?: string; failMsg?: string };
    if (d?.state === "fail") throw new Error(`The media host could not make this${d.failMsg ? `: ${d.failMsg}` : ""}. Nothing was charged.`);
    if (d?.state !== "success") continue;
    const url = resultUrl(d.resultJson);
    if (!url) throw new Error("The media host finished without a file. Nothing was charged.");
    const f = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!f.ok) throw new Error(`The finished file could not be downloaded (${f.status}). Nothing was charged.`);
    const mime = f.headers.get("content-type")?.split(";")[0] || FALLBACK_MIME[kind];
    return { file: Buffer.from(await f.arrayBuffer()), mime: mime === "application/octet-stream" ? FALLBACK_MIME[kind] : mime };
  }
  throw new Error("The media host took more than 12 minutes. Nothing was charged.");
}
