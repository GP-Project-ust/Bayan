"use client";

import React, { useState } from "react";
import type { TablePayload } from "@/types";
import { buildResultsFilename, downloadCsv, tableToCsv } from "@/lib/chat/csv";
import { AlertTriangle, Check, Download, Table, Table2 } from "lucide-react";

interface ResultsTableProps {
  table?: TablePayload | null;
  className?: string;
}

export function ResultsTable({ table, className = "" }: ResultsTableProps) {
  const [exported, setExported] = useState(false);

  if (!table || typeof table !== "object") return null;

  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  if (columns.length === 0 && rows.length === 0) return null;

  const rowCount = rows.length;

  const handleExport = () => {
    const csv = tableToCsv(table);
    if (!csv) return;
    if (downloadCsv(buildResultsFilename(), csv)) {
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }
  };

  return (
    <section className={`cx-results ${className}`} role="region" aria-label="نتائج الاستعلام">
      <div className="cx-results-head">
        <span className="cx-results-title">
          {rows.length > 0 ? (
            <Table2 size={16} aria-hidden="true" />
          ) : (
            <Table size={16} aria-hidden="true" />
          )}
          نتائج الاستعلام
        </span>

        <span className="cx-results-count" aria-label={`عدد الصفوف ${rowCount}`}>
          {rowCount} {rowCount === 1 ? "صف" : "صفوف"}
        </span>

        {rowCount > 0 && (
          <button
            type="button"
            className="cx-act cx-results-action"
            onClick={handleExport}
            data-done={exported ? "true" : undefined}
          >
            {exported ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <Download size={13} aria-hidden="true" />
            )}
            <span>{exported ? "تم التصدير" : "تصدير CSV"}</span>
          </button>
        )}
      </div>

      <div
        className="cx-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="جدول نتائج الاستعلام"
      >
        <table className="cx-table" dir="rtl">
          {columns.length > 0 && (
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={`col-${index}`} scope="col">
                    {column !== null && column !== undefined ? String(column) : "—"}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length)} className="is-empty">
                  لا توجد نتائج مطابقة.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const cells = Array.isArray(row) ? row : [row];
                const columnCount = Math.max(columns.length, cells.length);

                return (
                  <tr key={`row-${rowIndex}`}>
                    {Array.from({ length: columnCount }).map((_, cellIndex) => {
                      const value = cells[cellIndex];
                      const isNull = value === null || value === undefined;
                      const isNumber = typeof value === "number";

                      return (
                        <td key={`cell-${rowIndex}-${cellIndex}`} className={isNumber ? "is-num" : undefined}>
                          {isNull
                            ? "—"
                            : isNumber
                              ? String(value)
                              : typeof value === "boolean"
                                ? value
                                  ? "نعم"
                                  : "لا"
                                : String(value)}
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

      {table.truncated === true && (
        <div className="cx-trunc" role="status" aria-live="polite">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>تم اقتصاص النتائج — قد توجد صفوف إضافية</span>
        </div>
      )}
    </section>
  );
}
