"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Sparkles } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log safe error telemetry if needed without exposing sensitive internals
    if (process.env.NODE_ENV !== "production") {
      console.error("Bayan App Error Boundary caught:", error?.message);
    }
  }, [error]);

  return (
    <main
      dir="rtl"
      className="bayan-error-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 20%, #1a162b 0%, #061527 100%)",
        color: "#f5f9fd",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        className="bayan-error-card"
        style={{
          maxWidth: "540px",
          width: "100%",
          background: "rgba(10, 35, 66, 0.8)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "1.5rem",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 50px rgba(239, 68, 68, 0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* شارة الخطأ والأيقونة */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#f87171",
            marginBottom: "1.5rem",
          }}
        >
          <AlertTriangle size={42} strokeWidth={1.75} />
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.85rem",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "9999px",
            color: "#f87171",
            fontSize: "0.875rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: "1rem",
          }}
        >
          خطأ في النظام
        </div>

        {/* العناوين والوصف المعتمد */}
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "0.75rem",
            lineHeight: 1.3,
          }}
        >
          حدث خطأ غير متوقع
        </h1>

        <p
          style={{
            color: "#94a3b8",
            fontSize: "1.05rem",
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          نعتذر عن تعذر إكمال العملية حاليًا. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
        </p>

        {/* كود المرجع الآمن (إن وجد) دون أي تفاصيل تقنية مسربة */}
        {error?.digest && (
          <div
            style={{
              padding: "0.4rem 0.75rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "#94a3b8",
              marginBottom: "1.75rem",
              display: "inline-block",
            }}
          >
            رمز التتبع الفني: <code dir="ltr" style={{ color: "#fbbf24" }}>{error.digest}</code>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.875rem",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#fbbf24",
              color: "#0a2342",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
              boxShadow: "0 4px 12px rgba(251, 191, 36, 0.25)",
            }}
          >
            <RotateCcw size={18} />
            إعادة المحاولة
          </button>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "rgba(255, 255, 255, 0.06)",
              color: "#e2e8f0",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.15s ease",
            }}
          >
            <Home size={18} />
            العودة إلى الرئيسية
          </Link>
        </div>

        {/* هامش توثيقي للنظام */}
        <div
          style={{
            marginTop: "2.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            color: "#64748b",
            fontSize: "0.85rem",
          }}
        >
          <Sparkles size={14} color="#00a6b2" />
          <span>منظومة بيان — المساعد المؤسسي الذكي</span>
        </div>
      </div>
    </main>
  );
}
