import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav {...props} aria-label="مسار التنقل" className={cx("bui", "bui-breadcrumbs", className)}>
      <ol className="bui-breadcrumbs" style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="bui-breadcrumb-item">
              {item.href && !isLast ? (
                <Link href={item.href} className="bui-breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span className="bui-breadcrumb-current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="bui-breadcrumb-separator" aria-hidden="true">
                  <ChevronLeft size={14} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
