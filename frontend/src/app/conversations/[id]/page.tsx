import type {Metadata} from "next";
import {ConversationDetailsScreen} from "@/components/conversation-detail/ConversationDetailsScreen";
import "@/components/conversations/conversations.css";
import "@/components/bayan/bayan.css";
import "@/components/conversation-detail/detail.css";

export const metadata:Metadata={
  title:"تفاصيل المحادثة | بيان",
  description:"صفحة تفصيلية تجريبية لعرض رسائل المحادثة والمصادر والاستعلامات وخطوات الوكلاء وفق صلاحيات المعاينة.",
  robots:{index:false,follow:false},
};

export default async function ConversationDetailPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  return <ConversationDetailsScreen conversationId={id}/>;
}
