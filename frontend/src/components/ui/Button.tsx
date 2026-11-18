"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ControlSize = "sm" | "md" | "lg";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = "primary", size = "md", loading = false, fullWidth = false,
  leadingIcon, trailingIcon, className, children, disabled, type = "button", ...props
}, ref) {
  return <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={cx("bui", "bui-button", `bui-button--${variant}`, `bui-button--${size}`, fullWidth && "bui-button--block", className)} {...props}>
    {loading ? <LoaderCircle className="bui-spin" size={17} aria-hidden="true"/> : leadingIcon ? <span className="bui-button-icon" aria-hidden="true">{leadingIcon}</span> : null}
    <span>{children}</span>
    {!loading && trailingIcon ? <span className="bui-button-icon" aria-hidden="true">{trailingIcon}</span> : null}
  </button>;
});
