"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Sparkles } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 20%, #1a162b 0%, #061527 100%)",
          color: "#f5f9fd",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
          boxSizing: "border-box",
        }}
      >
        <main
          style={{
            maxWidth: "540px",
            width: "100%",
            background: "rgba(10, 35, 66, 0.85)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "1.5rem",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#f87171",
              marginBottom: "1.5rem",
            }}
          >
            <AlertTriangle size={42} strokeWidth={1.75} />
          </div>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "0.75rem",
            }}
          >
            حدث خطأ غير متوقع
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            نعتذر عن تعذر إكمال العملية حاليًا. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.875rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#fbbf24",
                color: "#0a2342",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={18} />
              إعادة المحاولة
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#e2e8f0",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "0.75rem 1.25rem",
                borderRadius: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Home size={18} />
              العودة إلى الرئيسية
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
