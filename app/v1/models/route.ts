import { MODELS } from "@/lib/models";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    object: "list",
    data: MODELS.map((m) => ({
      id: m.id, object: "model", owned_by: m.maker, kind: m.kind, context_window: m.context ?? null, vision: !!m.vision, demo: !!m.demo,
      pricing: m.kind === "chat" ? { input_per_1m: m.price[0], output_per_1m: m.price[1] } : { per: m.unit, usd: m.price[0] },
      list_pricing: m.list,
    })),
  });
}
