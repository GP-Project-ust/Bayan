"use client";

import React from "react";
import type { TablePayload } from "@/types";
import { Table, AlertTriangle } from "lucide-react";

interface ResultsTableProps {
  table?: TablePayload | null;
  className?: string;
}

export function ResultsTable({ table, className = "" }: ResultsTableProps) {
  if (!table || typeof table !== "object") return null;

  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  if (columns.length === 0 && rows.length === 0) return null;

  const rowCount = rows.length;

  return (
    <div
      className={`bayan-results-panel ${className}`}
      role="region"
      aria-label="نتائج استعلام SQL"
    >
      {/* رأس اللوحة: العنوان وعدد الصفوف */}
      <div className="bayan-results-head">
        <div className="bayan-results-title">
          <Table size={16} className="text-teal-400" aria-hidden="true" />
          <span>نتائج الاستعلام</span>
        </div>
        <span className="bayan-results-count" aria-label={`عدد الصفوف المعروضة: ${rowCount}`}>
          {rowCount} {rowCount === 1 ? "صف" : "صفوف"}
        </span>
      </div>

      {/* وعاء التمرير الأفقي الآمن */}
      <div
        className="bayan-results-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="جدول بيانات نتائج الاستعلام"
      >
        <table className="bayan-results-table" dir="rtl">
          {columns.length > 0 && (
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={`col-${idx}`} scope="col">
                    {col !== null && col !== undefined ? String(col) : "—"}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, columns.length)}
                  className="bayan-results-empty-cell"
                >
                  لا توجد نتائج مطابقة في قاعدة البيانات.
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => {
                const cells = Array.isArray(row) ? row : [row];
                const maxLen = Math.max(columns.length, cells.length);

                return (
                  <tr key={`row-${rIdx}`}>
                    {Array.from({ length: maxLen }).map((_, cIdx) => {
                      const val = cells[cIdx];
                      const isNull = val === null || val === undefined;
                      const isNumber = typeof val === "number";

                      return (
                        <td
                          key={`cell-${rIdx}-${cIdx}`}
                          className={isNumber ? "num-cell" : isNull ? "tbl-null" : ""}
                        >
                          {isNull
                            ? "—"
                            : isNumber
                            ? String(val) // الصفر الرقمي (0) محفوظ كقيمة صالحة
                            : typeof val === "boolean"
                            ? val
                              ? "نعم"
                              : "لا"
                            : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* شارة الاقتصاص — تظهر حصراً عند truncated === true */}
      {table.truncated === true && (
        <div className="bayan-results-trunc-badge" role="status" aria-live="polite">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" aria-hidden="true" />
          <span>تم اقتصاص النتائج — قد توجد صفوف إضافية</span>
        </div>
      )}
    </div>
  );
}
