import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  description?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  description,
  className,
  ...props
}: StatCardProps) {
  return (
    <div {...props} className={cx("bui", "bui-stat-card", className)}>
      <div className="bui-stat-card-head">
        <span className="bui-stat-card-label">{label}</span>
        {icon && <span className="bui-stat-card-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="bui-stat-card-value">{value}</div>
      {(trend || description) && (
        <div className="bui-stat-card-foot">
          {trend}
          {description && <span>{description}</span>}
        </div>
      )}
    </div>
  );
}
