"use client";

import type { FormEvent, ReactNode } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import type { SuggestedQuestion } from "./types";

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  suggestions?: SuggestedQuestion[];
  busy?: boolean;
  disabled?: boolean;
  onAttach?: () => void;
  leading?: ReactNode;
}

/** Controlled composer. Parent owns messages and any real network request. */
export function ChatComposer({value,onChange,onSend,suggestions=[],busy=false,disabled=false,onAttach,leading}:ChatComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>){
    event.preventDefault();
    const trimmed = value.trim();
    if(trimmed && !busy && !disabled) onSend(trimmed);
  }
  return <div className="bayan-domain bayan-chat-composer" dir="rtl">
    {suggestions.length > 0 && <div className="bayan-chat-suggestions" aria-label="أسئلة مقترحة">
      <span className="bayan-suggestions-label"><Sparkles size={17}/> أسئلة مقترحة</span>
      <div className="bayan-suggestions-list">{suggestions.map(question=><button type="button" key={question.id} disabled={disabled||busy} onClick={()=>onSend(question.label)}>{question.label}</button>)}</div>
    </div>}
    <form className="bayan-composer-form" onSubmit={submit}>
      {leading}
      {onAttach && <button className="bayan-icon-action" type="button" onClick={onAttach} disabled={disabled||busy} aria-label="إرفاق ملف"><Paperclip size={20}/></button>}
      <label htmlFor="bayan-message-entry" className="bayan-screen-reader">سؤالك إلى بيان</label>
      <textarea id="bayan-message-entry" rows={2} maxLength={4000} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled||busy} placeholder="اكتب سؤالك هنا..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); if(value.trim()&&!busy&&!disabled) onSend(value.trim());}}}/>
      <Button size="md" type="submit" disabled={!value.trim()||disabled} loading={busy} aria-label="إرسال السؤال" leadingIcon={<ArrowUp size={17}/>}>إرسال</Button>
    </form>
    <small>قد تحتاج الإجابات إلى التحقق من البيانات والمصادر الأصلية.</small>
  </div>;
}
