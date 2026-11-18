"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  description?: string;
  error?: string;
  startIcon?: ReactNode;
  controlSize?: "sm" | "md" | "lg";
  dir?: "rtl" | "ltr" | "auto";
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  id, label, description, error, startIcon, controlSize="md", className, required,
  dir, ...props
}, ref) {
  const generated = useId();
  const inputId = id ?? `bui-input-${generated}`;
  const messageId = `${inputId}-message`;
  return <div className={cx("bui", "bui-field", className)}>
    <label htmlFor={inputId} className="bui-field-label">{label}{required && <span aria-hidden="true" className="bui-required"> *</span>}</label>
    <div className={cx("bui-control-wrap", Boolean(error) && "bui-control-wrap--error", Boolean(startIcon) && "bui-control-wrap--icon")}>
      {startIcon && <span className="bui-input-icon" aria-hidden="true">{startIcon}</span>}
      <input {...props} dir={dir} id={inputId} ref={ref} required={required} aria-invalid={Boolean(error)} aria-describedby={(error || description) ? messageId : undefined}
        className={cx("bui-input", `bui-input--${controlSize}`)} />
    </div>
    {(error || description) && <small id={messageId} className={cx("bui-field-message", error && "bui-field-message--error")}>{error || description}</small>}
  </div>;
});
