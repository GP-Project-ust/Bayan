"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cx } from "./utils";

type ToastTone="success"|"warning"|"danger"|"info";
export interface ToastProps {title:string;message?:string;tone?:ToastTone;onClose:()=>void}
const icons={success:CheckCircle2,warning:AlertTriangle,danger:AlertCircle,info:Info};
export function Toast({title,message,tone="info",onClose}:ToastProps){
  const Icon=icons[tone];
  return <div className={cx("bui","bui-toast",`bui-toast--${tone}`)} role={tone==="danger"?"alert":"status"} aria-live={tone==="danger"?"assertive":"polite"}>
    <Icon size={21} aria-hidden="true"/>
    <div><strong>{title}</strong>{message&&<p>{message}</p>}</div>
    <button type="button" className="bui-icon-button" onClick={onClose} aria-label="إغلاق التنبيه"><X size={18}/></button>
  </div>;
}
