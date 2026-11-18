/**
 * واجهة دخول تجريبية فقط.
 * IMPORTANT: UI preview, NOT authentication or authorization.
 * The Backend must issue a verified httpOnly session cookie and enforce RBAC.
 */
export interface LoginValidationErrors {
  email?: string;
  password?: string;
}

export const DEMO_LOGIN = Object.freeze({
  email: "demo@bayan.local",
  password: "BayanDemo123!",
  displayName: "مستخدم تجريبي",
  roleLabel: "مسؤول تقنية المعلومات — تجربة",
});

export const REMEMBERED_EMAIL_KEY = "bayan-login-remembered-email-v1";
export const DEMO_SESSION_KEY = "bayan-preview-session-v1";

export function validateLogin(email: string, password: string): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = "يرجى إدخال البريد الإلكتروني.";
  } else if (trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "يرجى إدخال بريد إلكتروني صحيح.";
  }
  if (!password) {
    errors.password = "يرجى إدخال كلمة المرور.";
  } else if (password.length < 8) {
    errors.password = "يجب ألا تقل كلمة المرور عن 8 أحرف في المعاينة.";
  }
  return errors;
}

/** Demo is enabled in local development. For production, opt in explicitly only for previews. */
export function isDemoLoginEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_BAYAN_DEMO_LOGIN === "1";
}

export function matchesDemoLogin(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password;
}
