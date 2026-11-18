import type { ReactNode } from "react";

/** Public pages omit the application's sidebar and top bar. */
export function AuthLayout({children}:{children:ReactNode}) {
  return <main className="bayan-auth" dir="rtl" data-bayan-shell="auth">{children}</main>;
}
