"use client";

import { useEffect, useRef } from "react";

/** Basic accessible overlay behavior: Escape, initial focus, and focus restoration.
 * The backdrop is owned by each component and focus remains within the active dialog.
 */
export function useOverlay(open: boolean, onClose: () => void) {
  const panelRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if (!open) return;
    const previousFocus=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const panel=panelRef.current;
    if(!panel){ document.body.style.overflow=previousOverflow; return; }
    const focusable=()=>Array.from(panel.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )).filter(el=>el.getClientRects().length>0);
    // Dialogs can mark the field a reader should start on; fall back to the
    // first focusable element (usually the close button).
    const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? focusable()[0] ?? panel).focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();onClose();}
      if(event.key==="Tab"){
        const elements=focusable(); if(!elements.length){event.preventDefault();panel.focus();return;}
        const first=elements[0], last=elements[elements.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown",onKeyDown);
    return ()=>{document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;previousFocus?.focus();};
  },[open,onClose]);
  return panelRef;
}
