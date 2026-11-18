import type { Metadata } from "next";
import { ConversationsScreen } from "@/components/conversations/ConversationsScreen";
import "@/components/conversations/conversations.css";
export const metadata:Metadata={
  title:"سجل المحادثات | بيان",description:"نموذج تجريبي لسجل محادثات بيان مع البحث والتصفية والاطلاع على التفاصيل.",robots:{index:false,follow:false},
};
export default function ConversationsPage(){return <ConversationsScreen/>;}
