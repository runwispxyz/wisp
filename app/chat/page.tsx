import type { Metadata } from "next";
import ChatApp from "@/components/chat/ChatApp";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat, image, video and music models on one Wisp balance. History stays in your browser.",
  robots: { index: false },
};

export default function Page() {
  return <ChatApp />;
}
