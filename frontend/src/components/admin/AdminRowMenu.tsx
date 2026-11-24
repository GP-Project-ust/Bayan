"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Check, MoreHorizontal } from "lucide-react";

export type RowMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  /** When present the item renders as a menuitemradio, e.g. the role chooser. */
  checked?: boolean;
  danger?: boolean;
  onSelect: () => void;
};

export type RowMenuGroup = {
  heading?: string;
  items: RowMenuItem[];
};

type AdminRowMenuProps = {
  /** Accessible name for the trigger, e.g. "إجراءات المستخدم أ. سارة القحطاني". */
  label: string;
  groups: RowMenuGroup[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

/**
 * Per-row overflow menu used by the users and smart-view tables.
 * Closes on outside pointer down and on Escape so it never traps the user.
 */
export default function AdminRowMenu({ label, groups, open, onToggle, onClose }: AdminRowMenuProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="ao-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ao-icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={onToggle}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="ao-menu" role="menu" id={menuId} aria-label={label}>
          {groups.map((group, groupIndex) => (
            <div key={group.heading ?? `group-${groupIndex}`}>
              {group.heading && <span className="ao-menu-label">{group.heading}</span>}
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                  aria-checked={item.checked}
                  className={`ao-menu-item ${item.danger ? "is-danger" : ""}`}
                  onClick={() => {
                    onClose();
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.checked && <Check size={14} aria-hidden="true" />}
                </button>
              ))}
              {groupIndex < groups.length - 1 && <div className="ao-menu-sep" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
