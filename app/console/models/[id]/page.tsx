import type { Metadata } from "next";
import { getModel } from "@/lib/models";
import View from "./view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = getModel(decodeURIComponent((await params).id));
  return { title: `${m?.name ?? "Model not found"} · Console` };
}
export default View;
