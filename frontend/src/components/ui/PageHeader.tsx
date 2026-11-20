import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div {...props} className={cx("bui", "bui-page-header", className)}>
      <div className="bui-page-header-title-wrap">
        {breadcrumbs}
        <h1 className="bui-page-header-title">
          <span>{title}</span>
          {badge}
        </h1>
        {subtitle && <p className="bui-page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="bui-page-header-actions">{actions}</div>}
    </div>
  );
}
