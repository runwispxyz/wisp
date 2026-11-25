import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin";
import { getContract, isPlaceholder } from "@/lib/settings";
import { AdminPanel } from "./panel";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const signedIn = await isAdmin();
  const ca = getContract();
  return <AdminPanel signedIn={signedIn} contract={signedIn && !isPlaceholder(ca) ? ca : ""} />;
}
