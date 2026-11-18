import type { Metadata } from 'next';
import ChatView from "@/components/ChatView";

export const metadata: Metadata = {
  title: 'نموذج المحادثة الأولي | بيان',
  description: 'معاينة النموذج الأولي لواجهة المحادثة الرئيسية وبياناتها التجريبية.',
};

export default function PrototypeChatPage() {
  return <ChatView />;
}
