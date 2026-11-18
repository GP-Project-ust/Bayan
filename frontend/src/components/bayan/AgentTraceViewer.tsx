"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Timer, Workflow } from "lucide-react";
import { Badge } from "@/components/ui";
import type { AgentTraceStepData, TraceStatus } from "./types";

export interface AgentTraceViewerProps { steps: AgentTraceStepData[]; requestId?:string; canView?:boolean }
const label: Record<TraceStatus,string>={success:"اكتمل",running:"جارٍ التنفيذ",error:"فشل",skipped:"تم التخطي"};
const tones: Record<TraceStatus,"success"|"warning"|"danger"|"neutral">={success:"success",running:"warning",error:"danger",skipped:"neutral"};

/** Displays operational event summaries, never internal private model reasoning. */
export function AgentTraceViewer({steps,requestId,canView=true}:AgentTraceViewerProps) {
  const [open,setOpen]=useState<Record<string,boolean>>({});
  if(!canView)return <section className="bayan-domain bayan-domain-card bayan-trace-restricted">تفاصيل مسار الوكلاء متاحة للمستخدمين المصرّح لهم فقط.</section>;
  return <section className="bayan-domain bayan-domain-card bayan-trace" dir="rtl">
    <header className="bayan-trace-head"><div><h3><Workflow size={22}/> تتبع تنفيذ الوكلاء</h3><p>خطوات تشغيلية موجزة قابلة للتدقيق دون عرض استدلال النموذج الداخلي.</p></div>{requestId&&<code dir="ltr">{requestId}</code>}</header>
    <ol className="bayan-trace-list">{steps.map((step,index)=><li key={step.id} className={`bayan-trace-step bayan-trace-step--${step.status}`}>
      <div className="bayan-trace-index">{index+1}</div>
      <div className="bayan-trace-step-body"><button className="bayan-trace-toggle" type="button" aria-expanded={!!open[step.id]} onClick={()=>setOpen(v=>({...v,[step.id]:!v[step.id]}))}>
        <span className="bayan-trace-agent"><Bot size={17}/><strong>{step.agent} Agent</strong><span>— {step.label}</span></span>
        <span className="bayan-trace-meta"><Badge tone={tones[step.status]}>{label[step.status]}</Badge>{typeof step.durationMs==="number"&&<small><Timer size={13}/>{step.durationMs} مللي ثانية</small>}{open[step.id]?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</span>
      </button>{open[step.id]&&<div className="bayan-trace-summary">{step.summary||"لا تتوفر تفاصيل تشغيلية إضافية لهذه الخطوة."}</div>}</div>
    </li>)}</ol>
    <p className="bayan-trace-disclaimer">محتوى المعاينة تجريبي. لا يتضمن هذا المكون سلسلة التفكير الداخلية أو معلومات اعتماد سرية.</p>
  </section>;
}
