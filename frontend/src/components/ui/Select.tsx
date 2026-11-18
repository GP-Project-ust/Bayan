"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "./utils";

export type SelectOption = { value: string; label: string; disabled?: boolean };
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  description?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({
  id, label, options, placeholder, description, error, className, required, ...props
}, ref) {
  const generated = useId();
  const selectId = id ?? `bui-select-${generated}`;
  const messageId = `${selectId}-message`;
  return <div className={cx("bui", "bui-field", className)}>
    <label className="bui-field-label" htmlFor={selectId}>{label}{required && <span className="bui-required" aria-hidden="true"> *</span>}</label>
    <div className={cx("bui-select-wrap", error && "bui-control-wrap--error")}>
      <select {...props} id={selectId} ref={ref} required={required} aria-invalid={Boolean(error)} aria-describedby={(error || description) ? messageId : undefined} className="bui-select">
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o=><option value={o.value} disabled={o.disabled} key={o.value}>{o.label}</option>)}
      </select><ChevronDown size={17} aria-hidden="true" className="bui-select-arrow"/>
    </div>
    {(error || description) && <small id={messageId} className={cx("bui-field-message",error && "bui-field-message--error")}>{error || description}</small>}
  </div>;
});
