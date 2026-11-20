import type { Metadata } from "next";
import { ChatInterface } from "@/components/chat";
import "@/styles/chat.css";

export const metadata: Metadata = {
  title: "المحادثة الذكية | بيان",
  description: "واجهة المحادثة التفاعلية الذكية المباشرة عبر وكلاء الذكاء الاصطناعي وبث أحداث SSE المباشر.",
};

export default function ChatPage() {
  return <ChatInterface />;
}
