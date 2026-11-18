/**
 * استعادة كلمة المرور — تحقق شكلي ومعاينة محلية فقط.
 * لا يوجد إرسال بريد إلكتروني أو توليد رمز استعادة داخل الواجهة.
 */
export interface RecoveryValidationErrors {
  email?: string;
}

export function validateRecoveryEmail(email: string): RecoveryValidationErrors {
  const normalized = email.trim();
  if (!normalized) return { email: "يرجى إدخال البريد الإلكتروني." };
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { email: "يرجى إدخال بريد إلكتروني صحيح." };
  }
  return {};
}

/** Explicitly requires preview mode on production deployments. */
export function isRecoveryPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_BAYAN_DEMO_LOGIN === "1";
}
