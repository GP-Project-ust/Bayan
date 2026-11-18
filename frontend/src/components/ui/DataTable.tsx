import type { Key, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cx } from "./utils";

export interface Column<T> {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}
export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (item:T)=> Key;
  emptyMessage?:string;
  className?:string;
}
export function DataTable<T>({caption,columns,rows,rowKey,emptyMessage="لا توجد بيانات للعرض",className}:DataTableProps<T>) {
  return <div className={cx("bui","bui-table-shell",className)}>
    <div className="bui-table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="bui-table"><caption className="bui-sr-only">{caption}</caption>
        <thead><tr>{columns.map(c=><th scope="col" key={c.key} className={c.headerClassName}>{c.title}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(row=><tr key={rowKey(row)}>{columns.map(c=><td key={c.key} className={c.cellClassName}>{c.render(row)}</td>)}</tr>) : <tr><td className="bui-table-empty" colSpan={Math.max(1,columns.length)}><Inbox size={20} aria-hidden="true"/> {emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}
