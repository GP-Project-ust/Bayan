"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer, Info } from "lucide-react";
import { Button } from "@/components/ui";
import type { ReportColumn, ReportFormat, ReportRow } from "./types";

export interface ReportExporterProps {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  onExport?: (format: ReportFormat) => void;
  allowExport?: boolean;
}

const makeCell=(value:unknown)=>value==null?"":String(value);
const escapeXml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
// Excel interprets cells that start with formula markers; guard against CSV formula injection.
const guardFormula=(value:string)=>/^[\s\t\r\n]*[=+\-@]/.test(value)?"'"+value:value;
const csvValue=(value:string)=>`"${guardFormula(value).replace(/"/g,'""')}"`;
function saveFile(content:string,mime:string,name:string){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
function exportCsv(columns:ReportColumn[],rows:ReportRow[]){return "\ufeff"+[columns.map(c=>csvValue(c.label)).join(","),...rows.map(r=>columns.map(c=>csvValue(makeCell(r[c.key]))).join(","))].join("\r\n");}
function exportExcelXml(columns:ReportColumn[],rows:ReportRow[]){
  const cell=(text:string)=>`<Cell><Data ss:Type="String">${escapeXml(guardFormula(text))}</Data></Cell>`;
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Bayan"><Table><Row>${columns.map(c=>cell(c.label)).join("")}</Row>${rows.map(r=>`<Row>${columns.map(c=>cell(makeCell(r[c.key]))).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}
function printReport(title:string,columns:ReportColumn[],rows:ReportRow[]){
  const printWindow=window.open("", "_blank", "width=960,height=760");
  if(!printWindow){window.alert("تعذر فتح معاينة الطباعة. يُرجى السماح بالنوافذ المنبثقة لهذا الموقع.");return;}
  const head=columns.map(c=>`<th>${escapeXml(c.label)}</th>`).join("");
  const body=rows.map(r=>`<tr>${columns.map(c=>`<td>${escapeXml(makeCell(r[c.key]))}</td>`).join("")}</tr>`).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${escapeXml(title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:32px;color:#0a2342}h1{font-size:24px}p{color:#52677f}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border:1px solid #b7c8da;padding:12px;text-align:right}th{background:#e9f4f9}@page{size:A4 portrait;margin:15mm}</style></head><body><h1>${escapeXml(title)}</h1><p>تقرير تجريبي من واجهة نظام بيان — بيانات غير حقيقية</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
export function ReportExporter({title,columns,rows,onExport,allowExport=true}:ReportExporterProps){
  const [format,setFormat]=useState<ReportFormat>("pdf");
  function exportNow(){
    if(!allowExport)return;
    if(onExport){onExport(format);return;}
    if(format==="pdf"){printReport(title,columns,rows);return;}
    if(format==="csv")saveFile(exportCsv(columns,rows),"text/csv;charset=utf-8","bayan-report.csv");
    else saveFile(exportExcelXml(columns,rows),"application/xml;charset=utf-8","bayan-report-excel.xml");
  }
  return <section className="bayan-domain bayan-domain-card bayan-exporter" dir="rtl">
    <div className="bayan-export-head"><div><h3><Download size={20}/> تصدير التقرير</h3><p>{title} · {rows.length} سجلات تجريبية</p></div><span className="bayan-export-note"><Info size={15}/> نموذج واجهة</span></div>
    <div className="bayan-format-choices" role="radiogroup" aria-label="صيغة التصدير">
      {([{id:"pdf",label:"PDF (طباعة)",icon:Printer},{id:"excel-xml",label:"Excel XML",icon:FileSpreadsheet},{id:"csv",label:"CSV",icon:FileText}] as const).map(({id,label,icon:Icon})=><label className={`bayan-format-option ${format===id?"is-selected":""}`} key={id}><input type="radio" name="bayan-export-format" value={id} checked={format===id} onChange={()=>setFormat(id)} disabled={!allowExport}/><Icon size={18}/>{label}</label>)}
    </div>
    <div className="bayan-export-actions"><Button onClick={exportNow} leadingIcon={<Download size={17}/>} disabled={!allowExport||rows.length===0}>تصدير التقرير</Button><small>PDF يفتح نافذة الطباعة؛ صيغة Excel المتاحة هنا XML متوافقة، وليست XLSX. يتطلب التصدير الإنتاجي خدمة Backend.</small></div>
    <div className="bayan-export-preview" aria-label="معاينة بيانات التقرير"><table><caption>{title}</caption><thead><tr>{columns.map(c=><th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c.key}>{makeCell(r[c.key])}</td>)}</tr>)}</tbody></table></div>
  </section>;
}
