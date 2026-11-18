"use client";

import { Bot, UserRound, Copy, CheckCircle2, AlertCircle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { ChatMessageData } from "./types";

export interface MessageBubbleProps { message: ChatMessageData; copyEnabled?: boolean }

export function MessageBubble({message,copyEnabled=true}:MessageBubbleProps) {
  const [copied,setCopied]=useState(false);
  const isAssistant=message.role==="assistant";
  const status=message.status??"complete";
  const StatusIcon=status==="pending"?LoaderCircle:status==="error"?AlertCircle:CheckCircle2;
  async function copy(){
    if(!navigator.clipboard?.writeText)return;
    try {await navigator.clipboard.writeText(message.text);setCopied(true);}catch{setCopied(false);}
  }
  return <article className={`bayan-domain bayan-message ${isAssistant?"bayan-message--assistant":"bayan-message--user"}`} dir="rtl">
    <div className="bayan-message-avatar" aria-hidden="true">{isAssistant?<Bot size={20}/>:<UserRound size={20}/>}</div>
    <div className="bayan-message-content">
      <div className="bayan-message-text">{message.text}</div>
      <div className="bayan-message-meta">
        {message.time && <time>{message.time}</time>}
        {isAssistant&& <span className={`bayan-message-state bayan-message-state--${status}`}><StatusIcon size={14} className={status==="pending"?"bayan-spin":undefined}/>{status==="pending"?"جارٍ المعالجة":status==="error"?"تعذر إكمال الطلب":"مكتمل"}</span>}
        {copyEnabled&&status==="complete"&& <button className="bayan-inline-action" type="button" onClick={copy} aria-label={copied?"تم النسخ":"نسخ الرسالة"}><Copy size={13}/>{copied?"تم النسخ":"نسخ"}</button>}
      </div>
    </div>
  </article>;
}
