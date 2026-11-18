/** Screen 15 — self-contained report preview and genuine XLSX export for fictional sample data.
 * No API calls, document storage, database queries, or external packages.
 */
import type {DemoReport} from "./reports";

export type ReportPreviewPage = "summary" | "details";
export const DEMO_REPORT_DISCLAIMER = "نموذج تدريبي غير رسمي — بيانات وأرقام افتراضية، وليست بيانات مؤسسة حقيقية.";
export function isReportReady(report:DemoReport):boolean {return report.status==="ready" && report.rows.length>0;}
export function findDemoReport(reports:readonly DemoReport[],id:string|undefined|null):DemoReport|undefined{
  const value=(id??"rep-101").trim();
  return /^rep-\d{3}$/.test(value) ? reports.find(r=>r.id===value) : undefined;
}
/** Sum only additive quantities of one unit; percentages must not be totaled. */
export function canSumRows(report:DemoReport):boolean{return report.rows.length>0&&report.rows[0].unit!=="%"&&report.rows.every(row=>row.unit===report.rows[0].unit);}
export function reportTotal(report:DemoReport):number{return report.rows.reduce((sum,row)=>sum+row.value,0);}
export function chartRows(report:DemoReport):{label:string;value:number;unit:string;percent:number}[]{
  const max=Math.max(1,...report.rows.map(row=>row.value));
  return report.rows.map(r=>({...r,percent:Math.max(0,Math.min(100,(r.value/max)*100))}));
}
export function reportFileBase(id:string):string {
  if(!/^rep-\d{3}$/.test(id))throw new Error("معرّف تقرير غير صالح");
  return `bayan-demo-${id}`;
}
function xmlEscape(str:string):string{return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function excelCell(row:number,col:number,value:string|number,style=0):string {
  const label=String.fromCharCode(65+col)+row;
  const s=style?` s="${style}"`:"";
  // Excel inline strings prevent formula evaluation. Never emit user input as an f element.
  return typeof value==="number"&&Number.isFinite(value)
    ?`<c r="${label}"${s}><v>${value}</v></c>`
    :`<c r="${label}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
}
function crc32(input:Uint8Array):number{
  let c=0xFFFFFFFF;
  for(const b of input){c^=b;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;}
  return (c^0xFFFFFFFF)>>>0;
}
/** Minimal ZIP writer using the STORE method. Valid OOXML needs no third-party library. */
function makeZip(entries:readonly {name:string;content:string}[]):Uint8Array {
  const enc=new TextEncoder();const blocks:Uint8Array[]=[];const central:Uint8Array[]=[];
  let offset=0;
  const u16=(view:DataView,at:number,value:number)=>view.setUint16(at,value,true);
  const u32=(view:DataView,at:number,value:number)=>view.setUint32(at,value>>>0,true);
  for(const {name,content} of entries){
    const fn=enc.encode(name),raw=enc.encode(content);const crc=crc32(raw);
    const local=new Uint8Array(30+fn.length+raw.length),lv=new DataView(local.buffer);
    u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u32(lv,14,crc);
    u32(lv,18,raw.length);u32(lv,22,raw.length);u16(lv,26,fn.length);
    local.set(fn,30);local.set(raw,30+fn.length);blocks.push(local);
    const item=new Uint8Array(46+fn.length),iv=new DataView(item.buffer);
    u32(iv,0,0x02014b50);u16(iv,4,20);u16(iv,6,20);u16(iv,8,0x0800);
    u32(iv,16,crc);u32(iv,20,raw.length);u32(iv,24,raw.length);u16(iv,28,fn.length);u32(iv,42,offset);
    item.set(fn,46);central.push(item);offset+=local.length;
  }
  const cenSize=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
  u32(ev,0,0x06054b50);u16(ev,8,entries.length);u16(ev,10,entries.length);
  u32(ev,12,cenSize);u32(ev,16,offset);
  const all=[...blocks,...central,end],size=all.reduce((n,b)=>n+b.length,0),out=new Uint8Array(size);
  let pos=0;for(const b of all){out.set(b,pos);pos+=b.length;}return out;
}
export function makeDemoReportXlsx(report:DemoReport):Uint8Array{
  if(!isReportReady(report))throw new Error("لا يمكن تصدير تقرير غير جاهز");
  const sheetRows:(string|number)[][]=[
    ["بيان — تقرير تجريبي غير رسمي"],
    ["عنوان التقرير",report.title],
    ["معرّف التقرير",report.id],
    ["النوع",report.kind],
    ["الفترة",report.period],
    ["الجهة",report.owner],
    ["المصدر",report.source],
    ["التصنيف",report.classification],
    ["تنبيه",DEMO_REPORT_DISCLAIMER],
    [],["المؤشر","القيمة","الوحدة"],
    ...report.rows.map(row=>[row.label,row.value,row.unit]),[],
    ["ملاحظة",report.note],
  ];
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="35" customWidth="1"/><col min="2" max="2" width="38" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/></cols><sheetData>${sheetRows.map((cells,i)=>`<row r="${i+1}">${cells.map((cell,j)=>excelCell(i+1,j,cell,i===0||i===10?1:0)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rootRel=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="بيانات تجريبية" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workRel=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A2342"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return makeZip([
    {name:"[Content_Types].xml",content:types},
    {name:"_rels/.rels",content:rootRel},
    {name:"xl/workbook.xml",content:workbook},
    {name:"xl/_rels/workbook.xml.rels",content:workRel},
    {name:"xl/worksheets/sheet1.xml",content:worksheet},
    {name:"xl/styles.xml",content:styles},
  ]);
}
