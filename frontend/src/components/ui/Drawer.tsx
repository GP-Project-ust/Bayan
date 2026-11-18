"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useOverlay } from "./useOverlay";
import { cx } from "./utils";

export interface DrawerProps {
  open:boolean;onClose:()=>void;title:string;description?:string;children:ReactNode;
  footer?:ReactNode;position?:"start"|"end";className?:string;
}
export function Drawer({open,onClose,title,description,children,footer,position="end",className}:DrawerProps){
  const titleId=useId(),descriptionId=useId();
  const panelRef=useOverlay(open,onClose);
  if(!open)return null;
  return <div className="bui bui-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined}
      className={cx("bui-drawer",`bui-drawer--${position}`,className)}>
      <header className="bui-overlay-head"><div><h2 id={titleId}>{title}</h2>{description&&<p id={descriptionId}>{description}</p>}</div>
        <button className="bui-icon-button" type="button" onClick={onClose} aria-label="إغلاق الدرج"><X size={20}/></button></header>
      <div className="bui-overlay-content">{children}</div>
      {footer&&<footer className="bui-overlay-footer">{footer}</footer>}
    </aside>
  </div>;
}
