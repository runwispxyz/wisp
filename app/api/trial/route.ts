import { trialState } from "@/lib/trial";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await trialState());
}
