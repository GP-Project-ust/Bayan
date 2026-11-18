"use client";

import { useState } from "react";
import { Braces, ChevronDown, ChevronUp, Copy, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui";

export interface SQLViewerProps { sql: string; canView: boolean; initiallyExpanded?: boolean; title?: string }

/** No SQL generation/execution; the server must omit SQL for unauthorized users. */
export function SQLViewer({sql,canView,initiallyExpanded=false,title="عرض استعلام SQL"}:SQLViewerProps) {
  const [expanded,setExpanded]=useState(initiallyExpanded);
  const [copied,setCopied]=useState(false);
  if(!canView)return <section className="bayan-domain bayan-domain-card bayan-sql-restricted" aria-label="استعلام SQL محمي"><LockKeyhole size={20}/><p>عرض تفاصيل SQL متاح للمستخدمين المصرّح لهم فقط.</p></section>;
  return <section className="bayan-domain bayan-domain-card bayan-sql-viewer" dir="rtl">
    <button type="button" className="bayan-section-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><span><Braces size={20}/>{title}<Badge tone="info">للقراءة فقط</Badge></span>{expanded?<ChevronUp size={19}/>:<ChevronDown size={19}/>}</button>
    {expanded && <div className="bayan-sql-body"><p>الاستعلام المعروض توثيقي فقط، ولا يمكن تعديله أو تنفيذه من هنا.</p><div className="bayan-code-panel"><pre dir="ltr"><code>{sql||"-- لا يوجد استعلام متاح"}</code></pre><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(sql);setCopied(true);}catch{setCopied(false);}}} aria-label="نسخ استعلام SQL"><Copy size={16}/> {copied?"تم النسخ":"نسخ"}</button></div></div>}
  </section>;
}
