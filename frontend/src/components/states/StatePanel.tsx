"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Clock3, CloudOff, FileSearch2, LoaderCircle, LockKeyhole, LogIn, CircleAlert, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui";

export type BayanViewState = "idle" | "loading" | "streaming" | "success" | "empty" | "invalid_input" | "unauthenticated" | "error" | "forbidden" | "rate_limited" | "offline";

type StateMeta={title:string;description:string;icon:typeof CircleHelp;style:"neutral"|"success"|"warning"|"danger"|"info"};
const stateMeta:Record<BayanViewState,StateMeta> = {
  idle:{title:"جاهز لاستقبال الطلب",description:"اكتب سؤالك بالعربية أو اختر أحد الاقتراحات.",icon:CircleHelp,style:"neutral"},
  loading:{title:"جارٍ معالجة طلبك...",description:"يتم تجهيز الإجابة. يُرجى عدم تكرار الإرسال.",icon:LoaderCircle,style:"info"},
  streaming:{title:"جارٍ عرض الإجابة تدريجيًا...",description:"يتم استقبال أجزاء الرد من الخادم.",icon:LoaderCircle,style:"info"},
  success:{title:"اكتملت معالجة الطلب",description:"النتيجة جاهزة للعرض وفق الصلاحيات المتاحة.",icon:CheckCircle2,style:"success"},
  empty:{title:"لم نعثر على نتائج مطابقة",description:"جرّب صياغة أدق للسؤال أو تغيير نطاق البحث.",icon:FileSearch2,style:"neutral"},
  invalid_input:{title:"راجع المدخلات",description:"بعض الحقول غير مكتملة أو تحتوي على قيمة غير صحيحة.",icon:CircleAlert,style:"warning"},
  unauthenticated:{title:"يرجى تسجيل الدخول",description:"انتهت الجلسة أو لم يتم تسجيل الدخول. سجّل دخولك للمتابعة.",icon:LogIn,style:"warning"},
  error:{title:"تعذر تنفيذ الطلب",description:"حدث خطأ غير متوقع. يُرجى المحاولة مرة أخرى.",icon:AlertTriangle,style:"danger"},
  forbidden:{title:"ليس لديك صلاحية الوصول",description:"هذه الصفحة أو العملية تتطلب دورًا مؤسسيًا مخولًا.",icon:LockKeyhole,style:"danger"},
  rate_limited:{title:"تجاوزت الحد المسموح للطلبات",description:"انتظر قليلًا قبل إعادة المحاولة.",icon:Clock3,style:"warning"},
  offline:{title:"تعذر الاتصال بالخادم",description:"تحقق من اتصالك ثم أعد المحاولة.",icon:CloudOff,style:"warning"},
};
export interface StatePanelProps {
  state:BayanViewState;
  title?:string;
  description?:string;
  detail?:ReactNode;
  onRetry?:()=>void;
  retryLabel?:string;
  compact?:boolean;
}
export function StatePanel({state,title,description,detail,onRetry,retryLabel="إعادة المحاولة",compact=false}:StatePanelProps) {
  const meta=stateMeta[state], Icon=meta.icon;
  const isBusy=state==="loading"||state==="streaming";
  return <section className={`b5-state b5-state--${meta.style} ${compact?"b5-state--compact":""}`} dir="rtl" aria-busy={isBusy} role={state==="error"||state==="forbidden"?"alert":"status"} aria-live={state==="error"||state==="forbidden"?"assertive":"polite"}>
    <span className="b5-state-icon"><Icon size={compact?21:26} className={isBusy?"bui-spin":undefined} aria-hidden="true"/></span>
    <div className="b5-state-content"><h3>{title||meta.title}</h3><p>{description||meta.description}</p>{detail&&<div className="b5-state-detail">{detail}</div>}
      {onRetry && !isBusy && <div className="b5-state-action"><Button variant="outline" size="sm" onClick={onRetry} leadingIcon={<RotateCcw size={15}/>}>{retryLabel}</Button></div>}
    </div>
  </section>;
}
export function LoadingSkeleton({rows=3,label="جارٍ تحميل البيانات"}:{rows?:number;label?:string}) {
  return <div className="b5-skeleton" role="status" aria-label={label} aria-busy="true"><span className="bui-sr-only">{label}</span>{Array.from({length:Math.max(1,Math.min(rows,6))},(_,i)=><div key={i} style={{width:`${94 - (i%3)*14}%`}}/>)}</div>;
}
export function ErrorCodeDetail({code,requestId}:{code:string;requestId?:string}) {
  return <div className="b5-diagnostic"><ShieldAlert size={16} aria-hidden="true"/><span>رمز الخطأ: <code dir="ltr">{code}</code></span>{requestId&&<span>رقم الطلب: <code dir="ltr">{requestId}</code></span>}</div>;
}
