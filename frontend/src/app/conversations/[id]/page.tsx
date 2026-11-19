import type { Metadata } from "next";
import { ConversationDetailsScreen } from "@/components/conversation-detail/ConversationDetailsScreen";
import "@/components/conversations/conversations.css";
import "@/components/bayan/bayan.css";
import "@/components/conversation-detail/detail.css";

export const metadata: Metadata = {
  title: "تفاصيل المحادثة | بيان",
  description: "صفحة تفصيلية تجريبية لعرض رسائل المحادثة والمصادر والاستعلامات وخطوات الوكلاء وفق صلاحيات المعاينة.",
  robots: { index: false, follow: false },
};

type ConversationPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ id?: string; conversation_id?: string }>;
};

export default async function ConversationDetailPage({ params, searchParams }: ConversationPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  // Support both dynamic route /conversations/[id] and legacy catalog route /conversations/details
  const resolvedId = (id === "details" && (query?.id || query?.conversation_id))
    ? (query?.id || query?.conversation_id)!
    : (id === "details" ? "chat-101" : id);

  return <ConversationDetailsScreen conversationId={resolvedId} />;
}
