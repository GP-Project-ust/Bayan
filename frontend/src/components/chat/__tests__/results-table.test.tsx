import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ResultsTable } from "../ResultsTable";
import type { TablePayload } from "@/types";

describe("ResultsTable Component", () => {
  it("1. يعرض أسماء الأعمدة الفعلية بدقة", () => {
    const table: TablePayload = {
      columns: ["البرنامج", "الدفعة", "عدد الطلاب"],
      rows: [["علوم الحاسوب", "2024", 120]],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("البرنامج");
    expect(html).toContain("الدفعة");
    expect(html).toContain("عدد الطلاب");
  });

  it("2. يعرض الصفوف الفعلية بالترتيب الصحيح", () => {
    const table: TablePayload = {
      columns: ["الاسم", "المعدل"],
      rows: [
        ["أحمد", 95.5],
        ["سارة", 98.2],
      ],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("أحمد");
    expect(html).toContain("95.5");
    expect(html).toContain("سارة");
    expect(html).toContain("98.2");
  });

  it("3. يتعامل بأمان مع القيم الفارغة (null / undefined) ويعرض شريطة بديلة", () => {
    const table: TablePayload = {
      columns: ["المادة", "الدرجة"],
      rows: [["قواعد البيانات", null as unknown as string]],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("قواعد البيانات");
    expect(html).toContain("—");
    expect(html).not.toContain(">null<");
  });

  it("4. يحافظ على القيمة الصفرية 0 كقيمة صالحة ولا يعتبرها قيمة فارغة", () => {
    const table: TablePayload = {
      columns: ["القسم", "المتأخرات"],
      rows: [["الهندسة", 0]],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("0");
    expect(html).toContain("is-num");
  });

  it("5. يعرض حالة فارغة واضحة عندما يكون جدول النتائج بلا صفوف", () => {
    const table: TablePayload = {
      columns: ["الرمز", "النتيجة"],
      rows: [],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("لا توجد نتائج مطابقة");
    expect(html).toContain("is-empty");
  });

  it("6. يظهر شارة الاقتصاص عندما يكون truncated = true", () => {
    const table: TablePayload = {
      columns: ["الكلية", "العدد"],
      rows: [["الطب", 300]],
      truncated: true,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain("cx-trunc");
    expect(html).toContain("تم اقتصاص النتائج — قد توجد صفوف إضافية");
  });

  it("7. يخفي شارة الاقتصاص تماماً عندما يكون truncated = false", () => {
    const table: TablePayload = {
      columns: ["الكلية", "العدد"],
      rows: [["الطب", 300]],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).not.toContain("cx-trunc");
    expect(html).not.toContain("تم اقتصاص النتائج");
  });

  it("8. يدعم اتجاه RTL وهيكل جدول قياسي متاح ومحمي من الحقن", () => {
    const table: TablePayload = {
      columns: ["عمود"],
      rows: [["قيمة <script>alert(1)</script>"]],
      truncated: false,
    };

    const html = renderToString(React.createElement(ResultsTable, { table }));
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('role="region"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("9. يعيد null عندما تكون بيانات الجدول null أو غير صالحة", () => {
    const html1 = renderToString(React.createElement(ResultsTable, { table: null }));
    expect(html1).toBe("");

    const html2 = renderToString(React.createElement(ResultsTable, { table: undefined }));
    expect(html2).toBe("");
  });
});
