/**
 * CSV export for query results. Cells follow RFC 4180 quoting and the output is
 * prefixed with a UTF-8 BOM so Arabic headers open correctly in Excel.
 */
import type { TablePayload } from "@/types";

export const CSV_BOM = "\uFEFF";

function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  const raw = String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCsv(columns: unknown[], rows: unknown[][]): string {
  const lines: string[] = [];

  if (Array.isArray(columns) && columns.length > 0) {
    lines.push(columns.map(toCell).join(","));
  }

  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      const cells = Array.isArray(row) ? row : [row];
      lines.push(cells.map(toCell).join(","));
    });
  }

  return lines.join("\r\n");
}

export function tableToCsv(table?: TablePayload | null): string {
  if (!table || typeof table !== "object") return "";
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  return toCsv(columns, rows);
}

export function buildResultsFilename(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
  return `bayan-results-${stamp}.csv`;
}

/** Browser-only download; returns false when there is nothing to write. */
export function downloadCsv(filename: string, csv: string): boolean {
  if (!csv || typeof document === "undefined") return false;

  const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick so the browser can start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
