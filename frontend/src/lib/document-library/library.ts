/**
 * Screen 10 — fictional document library for Bayan frontend demo.
 * Metadata is an illustrative UI dataset, not a server response, file store,
 * authoritative university regulation, or actual vector-indexing state.
 */
import {demoSnippets,normalizeArabic,type DocumentCategory,type Snippet} from "@/lib/semantic-search/search";

export type IndexStatus = "indexed" | "processing" | "pending" | "failed";
export type DocumentSort = "newest" | "title" | "pages";
export type LibraryLayout = "cards" | "table";
export type LibraryCategory = DocumentCategory | "all";
export type StatusFilter = IndexStatus | "all";
export type LibraryDocument = {
  id:string;
  title:string;
  category:DocumentCategory;
  status:IndexStatus;
  updatedAt:string;
  totalPages:number;
  owner:string;
  fileType:"PDF" | "DOCX";
  fileSizeKB:number;
  description:string;
  snippets:readonly Snippet[];
};
export type LibraryFilters = {query:string;category:LibraryCategory;status:StatusFilter;sort:DocumentSort};
export const defaultLibraryFilters:LibraryFilters = {query:"",category:"all",status:"all",sort:"newest"};
export const documentCategoryLabels:Record<DocumentCategory,string> = {regulations:"اللوائح", guides:"الأدلة",policies:"السياسات",forms:"النماذج"};
export const indexStatusLabels:Record<IndexStatus,string> = {indexed:"مفهرس (تجريبي)",processing:"قيد المعالجة (تجريبي)",pending:"بانتظار الفهرسة (تجريبي)",failed:"تعذرت الفهرسة (تجريبي)"};
const known:Record<string,{pages:number;owner:string;size:number;description:string}> = {
 "doc-academic":{pages:38,owner:"الشؤون الأكاديمية",size:840,description:"نموذج تعليمي للمواظبة والتسجيل والسجلات الأكاديمية."},
 "doc-students":{pages:42,owner:"عمادة شؤون الطلاب",size:1100,description:"دليل تدريبي للخدمات الأكاديمية والإجراءات الطلابية."},
 "doc-exams":{pages:30,owner:"وحدة الاختبارات",size:580,description:"سياسات افتراضية للاختبارات والتقييم والتظلمات."},
 "doc-petitions":{pages:18,owner:"وحدة المتابعة",size:360,description:"إجراءات تدريبية لتقديم الاعتراضات ومتابعتها."},
 "doc-grades":{pages:27,owner:"إدارة السجلات",size:510,description:"سياسات افتراضية للتعامل مع كشوف الدرجات وتصديرها."},
 "doc-export":{pages:4,owner:"خدمة الطلاب",size:90,description:"نموذج تعليمي لطلب استخراج كشف الدرجات."},
};
/** Derive documents from screen 09 snippet records so citations keep the same IDs/titles/pages. */
export function makeDemoLibrary():LibraryDocument[]{
 const grouped=new Map<string,Snippet[]>();
 for(const snippet of demoSnippets){const items=grouped.get(snippet.documentId)??[];items.push(snippet);grouped.set(snippet.documentId,items);}
 const fromSearch=[...grouped].map(([id,snippets])=>{
  const first=snippets[0],info=known[id];
  return {id,title:first.documentTitle,category:first.category,status:"indexed" as const,updatedAt:first.updated,
    totalPages:info?.pages??Math.max(...snippets.map(s=>s.page)),owner:info?.owner??"المؤسسة التجريبية",
    fileType:"PDF" as const,fileSizeKB:info?.size??380,description:info?.description??"ملف تدريبي للاختبار.",snippets};
 });
 const other:LibraryDocument[]=[
  {id:"doc-procedures",title:"دليل إجراءات القبول — مثال تدريبي",category:"guides",status:"processing",updatedAt:"2026-10-20",totalPages:21,owner:"إدارة القبول",fileType:"PDF",fileSizeKB:420,description:"ملف تجريبي لشرح حالات انتظار الفهرسة دون مقاطع مسترجعة.",snippets:[]},
  {id:"doc-policy-draft",title:"مسودة سياسة الخصوصية — مثال تدريبي",category:"policies",status:"pending",updatedAt:"2026-10-17",totalPages:15,owner:"وحدة الحوكمة",fileType:"DOCX",fileSizeKB:260,description:"مسودة تدريبية لم تدخل فهرس الاسترجاع؛ ليست سياسة فعلية.",snippets:[]},
  {id:"doc-archive",title:"نموذج طلب الأرشفة — مثال تدريبي",category:"forms",status:"failed",updatedAt:"2026-10-11",totalPages:3,owner:"أرشيف المؤسسة",fileType:"PDF",fileSizeKB:75,description:"حالة فهرسة فاشلة مصطنعة لاختبار رسائل الخطأ وإعادة المحاولة.",snippets:[]},
 ];
 return [...fromSearch,...other];
}
export const initialLibraryDocuments:readonly LibraryDocument[]=makeDemoLibrary();
export function filterLibraryDocuments(documents:readonly LibraryDocument[],filters:LibraryFilters):LibraryDocument[]{
 const q=normalizeArabic(filters.query);
 const filtered=documents.filter(doc=>{
  if(filters.category!=="all"&&doc.category!==filters.category)return false;
  if(filters.status!=="all"&&doc.status!==filters.status)return false;
  if(!q)return true;
  const content=normalizeArabic([doc.title,doc.owner,doc.description,documentCategoryLabels[doc.category],...doc.snippets.map(s=>s.section)].join(" "));
  return q.split(" ").every(term=>content.includes(term));
 });
 return filtered.sort((a,b)=>filters.sort==="title"?a.title.localeCompare(b.title,"ar"):
  filters.sort==="pages"?b.totalPages-a.totalPages||a.title.localeCompare(b.title,"ar"):
  b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
export function libraryStats(docs:readonly LibraryDocument[]){return {total:docs.length,indexed:docs.filter(d=>d.status==="indexed").length,processing:docs.filter(d=>d.status==="processing").length,attention:docs.filter(d=>d.status==="failed"||d.status==="pending").length};}
export function changeDocumentStatus(docs:readonly LibraryDocument[],id:string,status:IndexStatus):LibraryDocument[]{return docs.map(d=>d.id===id?{...d,status}:d);}
export function makeDemoDocumentCitation(doc:LibraryDocument,page:number):string {
 const snippet=doc.snippets.find(s=>s.page===page);
 return `${doc.title}${snippet?`، ${snippet.section}`:""}، ص ${page} — مثال تدريبي غير موثّق.`;
}
export function validDocumentPage(doc:LibraryDocument,page:number):boolean {return Number.isInteger(page)&&page>=1&&page<=doc.totalPages;}
