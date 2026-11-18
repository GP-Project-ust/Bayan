import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
}
export function Card({ title, description, action, footer, className, children, ...props }: CardProps) {
  return <section {...props} className={cx("bui", "bui-card",className)}>
    {(title || description || action) && <header className="bui-card-head"><div>{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div>{action}</header>}
    <div className="bui-card-content">{children}</div>
    {footer && <footer className="bui-card-footer">{footer}</footer>}
  </section>;
}
