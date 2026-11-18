/**
 * Screen 03 — password reset UI-only prototype.
 * NOTE: These helpers perform client-side UX checks, NOT authentication or token verification.
 */
export type ResetPreviewMode = "form" | "expired" | "invalid" | "missing" | "unavailable";

export interface PasswordRule {
  id: "length" | "letter" | "number" | "symbol";
  label: string;
  passed: boolean;
}

/** Support Arabic and other Unicode letters, not just English passwords. */
export function passwordRules(value: string): PasswordRule[] {
  const count = Array.from(value).length;
  return [
    { id: "length", label: "12 حرفًا على الأقل (128 كحد أقصى)", passed: count >= 12 && count <= 128 },
    { id: "letter", label: "حرف واحد على الأقل", passed: /\p{L}/u.test(value) },
    { id: "number", label: "رقم واحد على الأقل", passed: /\p{N}/u.test(value) },
    { id: "symbol", label: "رمز خاص واحد على الأقل", passed: /[^\p{L}\p{N}\s]/u.test(value) },
  ];
}

/** Simple checklist score for UX. Not an entropy estimate or breached-password check. */
export function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: "لم تُدخل كلمة المرور بعد" };
  const score = passwordRules(value).filter((rule) => rule.passed).length;
  return {
    score,
    label: ["ضعيفة جدًا", "ضعيفة", "متوسطة", "جيدة", "قوية"][score],
  };
}

export interface ResetFormErrors {
  password?: string;
  confirmPassword?: string;
}

export function validateResetForm(password: string, confirmation: string): ResetFormErrors {
  const errors: ResetFormErrors = {};
  if (!password) errors.password = "يرجى إدخال كلمة المرور الجديدة.";
  else if (!passwordRules(password).every((rule) => rule.passed)) {
    errors.password = "كلمة المرور لا تستوفي شروط الأمان الموضحة أدناه.";
  }
  if (!confirmation) errors.confirmPassword = "يرجى تأكيد كلمة المرور الجديدة.";
  else if (password !== confirmation) errors.confirmPassword = "كلمتا المرور غير متطابقتين.";
  return errors;
}

/** Never accept an actual URL token as verified on the frontend. */
export function resolveResetPreviewMode(
  preview: string | undefined,
  hasRealToken: boolean,
  previewEnabled: boolean,
): ResetPreviewMode {
  if (hasRealToken || !previewEnabled) return "unavailable";
  if (preview === "valid") return "form";
  if (preview === "expired") return "expired";
  if (preview === "invalid") return "invalid";
  return "missing";
}

export function isResetPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_BAYAN_RESET_PREVIEW === "1";
}
