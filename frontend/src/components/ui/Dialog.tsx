"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useOverlay } from "./useOverlay";
import { cx } from "./utils";

export interface DialogProps {
  open:boolean; onClose:()=>void; title:string; description?:string; children:ReactNode;
  footer?:ReactNode; closeLabel?:string; className?:string;
}
export function Dialog({open,onClose,title,description,children,footer,closeLabel="إغلاق النافذة",className}:DialogProps){
  const titleId=useId(),descriptionId=useId();
  const panelRef=useOverlay(open,onClose);
  if(!open)return null;
  return <div className="bui bui-overlay" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
      aria-describedby={description?descriptionId:undefined} className={cx("bui-dialog",className)}>
      <header className="bui-overlay-head"><div><h2 id={titleId}>{title}</h2>{description&&<p id={descriptionId}>{description}</p>}</div>
        <button className="bui-icon-button" type="button" onClick={onClose} aria-label={closeLabel}><X size={20}/></button></header>
      <div className="bui-overlay-content">{children}</div>
      {footer&&<footer className="bui-overlay-footer">{footer}</footer>}
    </div>
  </div>;
}
