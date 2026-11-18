"use client";

import { BookOpenText, FileText, ExternalLink, ShieldAlert } from "lucide-react";
import type { DocumentCitation } from "./types";

export interface CitationCardProps { citation: DocumentCitation; canOpen?: boolean; onOpen?: (citation:DocumentCitation)=>void }

/** Citation metadata is provided by RAG. Never invent pages in a real response. */
export function CitationCard({citation,canOpen=true,onOpen}:CitationCardProps){
  return <article className="bayan-domain bayan-domain-card bayan-citation" dir="rtl">
    <div className="bayan-citation-icon"><BookOpenText size={21}/></div>
    <div className="bayan-citation-info"><h3>{citation.documentTitle}</h3><div className="bayan-citation-sub"><FileText size={15}/><span>الصفحة {citation.page}</span>{citation.kind&&<span>· {citation.kind}</span>}</div>{citation.excerpt&&<p>{citation.excerpt}</p>}</div>
    {canOpen&&onOpen?<button type="button" className="bayan-citation-open" onClick={()=>onOpen(citation)} aria-label={`عرض مصدر ${citation.documentTitle}، صفحة ${citation.page}`}><ExternalLink size={17}/><span>التفاصيل</span></button>:!canOpen?<span className="bayan-citation-blocked"><ShieldAlert size={16}/>غير مصرح</span>:null}
  </article>;
}
