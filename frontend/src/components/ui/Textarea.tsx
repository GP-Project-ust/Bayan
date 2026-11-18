"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cx } from "./utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({
  id, label, description, error, className, required, rows=4, ...props
}, ref) {
  const generated=useId();
  const fieldId=id??`bui-area-${generated}`;
  const messageId=`${fieldId}-message`;
  return <div className={cx("bui","bui-field",className)}>
    <label htmlFor={fieldId} className="bui-field-label">{label}{required && <span className="bui-required" aria-hidden="true"> *</span>}</label>
    <textarea {...props} id={fieldId} ref={ref} rows={rows} required={required} aria-invalid={Boolean(error)} aria-describedby={(error || description) ? messageId : undefined} className={cx("bui-textarea", error && "bui-control-wrap--error")}/>
    {(error || description) && <small id={messageId} className={cx("bui-field-message", error && "bui-field-message--error")}>{error || description}</small>}
  </div>;
});
