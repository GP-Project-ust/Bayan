import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {tone?:BadgeTone; icon?:ReactNode}
export function Badge({tone="neutral",icon,children,className,...props}:BadgeProps) {
  return <span {...props} className={cx("bui","bui-badge",`bui-badge--${tone}`,className)}>{icon && <span className="bui-badge-icon" aria-hidden="true">{icon}</span>}{children}</span>;
}
