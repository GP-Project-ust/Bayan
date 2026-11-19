"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowRight, FileQuestion, Sparkles, HelpCircle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <main
      dir="rtl"
      className="bayan-not-found-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 20%, #0d2e56 0%, #061527 100%)",
        color: "#f5f9fd",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        className="bayan-not-found-card"
        style={{
          maxWidth: "540px",
          width: "100%",
          background: "rgba(10, 35, 66, 0.75)",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          borderRadius: "1.5rem",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 50px rgba(0, 166, 178, 0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* شارة 404 والأيقونة */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(0, 166, 178, 0.2) 100%)",
            border: "1px solid rgba(251, 191, 36, 0.4)",
            color: "#fbbf24",
            marginBottom: "1.5rem",
          }}
        >
          <FileQuestion size={42} strokeWidth={1.75} />
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.85rem",
            background: "rgba(251, 191, 36, 0.12)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            borderRadius: "9999px",
            color: "#fbbf24",
            fontSize: "0.875rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: "1rem",
          }}
        >
          خطأ 404
        </div>

        {/* العناوين والوصف */}
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "0.75rem",
            lineHeight: 1.3,
          }}
        >
          الصفحة غير موجودة
        </h1>

        <p
          style={{
            color: "#94a3b8",
            fontSize: "1.05rem",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          عذرًا، الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها إلى مسار آخر.
        </p>

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
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#fbbf24",
              color: "#0a2342",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "transform 0.15s ease, background 0.15s ease",
              boxShadow: "0 4px 12px rgba(251, 191, 36, 0.25)",
            }}
          >
            <Home size={18} />
            العودة إلى الرئيسية
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
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
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <ArrowRight size={18} />
            الرجوع إلى الصفحة السابقة
          </button>
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
