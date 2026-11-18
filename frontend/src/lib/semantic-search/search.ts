/**
 * Screen 09: offline, explicitly fictional document snippets for UI testing.
 * This is a lexical demo ranker, NEVER a semantic embedding service or official source.
 * Tenant/document-level authorization must happen on FastAPI before emitting any records.
 */
export type DocumentCategory = "regulations" | "guides" | "policies" | "forms";
export type SearchCategory = DocumentCategory | "all";
export type SortMode = "relevance" | "document" | "page";
export type RelevanceBand = "all" | "high" | "medium";
export type Snippet = {
  id: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  section: string;
  page: number;
  excerpt: string;
  keywords: string[];
  illustrativeScore: number;
  updated: string;
};
export type SearchOptions = {
  category: SearchCategory;
  documentId: string;
  sort: SortMode;
  band: RelevanceBand;
};
export type SearchMatch = {record:Snippet; score:number; matchedTerms:number};
export const categoryLabels:Record<DocumentCategory,string> = {
  regulations:"اللوائح", guides:"الأدلة", policies:"السياسات", forms:"النماذج"
};
export const searchSuggestions = ["الغياب والحرمان", "شروط التسجيل الأكاديمي", "إجراءات التظلم", "تصدير كشف الدرجات"] as const;
export const demoSnippets: readonly Snippet[] = [
  {id:"rag-001",documentId:"doc-academic",documentTitle:"اللائحة الأكاديمية — مثال تدريبي",category:"regulations",section:"الفصل الرابع: المواظبة",page:12,excerpt:"تُنظّم اللائحة الافتراضية متابعة الغياب والحرمان من المقرر، وتوضح أن اتخاذ القرار يعتمد على السجلات الأكاديمية ومراجعة مسؤول الشؤون المختص.",keywords:["غياب","حرمان","مواظبة","مقرر","حضور"],illustrativeScore:96,updated:"2026-09-04"},
  {id:"rag-002",documentId:"doc-students",documentTitle:"دليل شؤون الطلاب — مثال تدريبي",category:"guides",section:"متابعة انتظام الطلاب",page:8,excerpt:"يتلقى الطالب إشعارًا توضيحيًا عند تجاوز حد الغياب المفترض، ويستطيع طلب مراجعة سجل الحضور لدى الجهة المختصة داخل المؤسسة.",keywords:["غياب","حرمان","سجل","حضور","إشعار"],illustrativeScore:91,updated:"2026-08-27"},
  {id:"rag-003",documentId:"doc-exams",documentTitle:"سياسة الاختبارات — مثال تدريبي",category:"policies",section:"ضوابط دخول الاختبار",page:19,excerpt:"ينبغي التحقق من أهلية الطالب لدخول الاختبار وفق نتيجة الانتظام والإجراءات الأكاديمية المطبقة، دون اعتماد قرار آلي نهائي.",keywords:["حرمان","اختبار","غياب","أهلية","انتظام"],illustrativeScore:87,updated:"2026-08-19"},
  {id:"rag-004",documentId:"doc-academic",documentTitle:"اللائحة الأكاديمية — مثال تدريبي",category:"regulations",section:"الفصل الثاني: التسجيل",page:5,excerpt:"تُحدَّد شروط التسجيل الأكاديمي والفترات الزمنية للالتحاق بالمقررات، مع مراجعة المتطلبات السابقة والخطة الدراسية المعتمدة.",keywords:["تسجيل","أكاديمي","مقررات","شروط","خطة"],illustrativeScore:94,updated:"2026-09-04"},
  {id:"rag-005",documentId:"doc-students",documentTitle:"دليل شؤون الطلاب — مثال تدريبي",category:"guides",section:"خدمات التسجيل",page:14,excerpt:"يستطيع الطالب تقديم طلب تسجيل المقررات من خلال خدمة الطلاب ومتابعة حالة الطلب بعد اعتماد المرشد أو المسؤول الأكاديمي.",keywords:["تسجيل","خدمات","طلب","مقررات","مرشد"],illustrativeScore:89,updated:"2026-08-27"},
  {id:"rag-006",documentId:"doc-petitions",documentTitle:"دليل الاعتراضات — مثال تدريبي",category:"guides",section:"آلية التظلم",page:7,excerpt:"يُقدّم طلب التظلم الأكاديمي مع سبب الاعتراض والمستندات الداعمة إلى الجهة المحددة، وتُسجّل حالة الطلب للمراجعة.",keywords:["تظلم","اعتراض","مراجعة","طلب","مستندات"],illustrativeScore:95,updated:"2026-10-01"},
  {id:"rag-007",documentId:"doc-petitions",documentTitle:"دليل الاعتراضات — مثال تدريبي",category:"guides",section:"متابعة القرار",page:9,excerpt:"تُنظّم إجراءات متابعة التظلم وإبلاغ الطالب بالقرار التوضيحي وتسجيل سبب الرفض أو القبول في السجل الأكاديمي.",keywords:["تظلم","قرار","قبول","رفض","متابعة"],illustrativeScore:90,updated:"2026-10-01"},
  {id:"rag-008",documentId:"doc-grades",documentTitle:"سياسة كشف الدرجات — مثال تدريبي",category:"policies",section:"إصدار كشوف النتائج",page:22,excerpt:"تسمح سياسة النتائج الافتراضية بتصدير كشف الدرجات للمصرح لهم بعد مراجعة دقة المعلومات والالتزام بقيود الخصوصية.",keywords:["تصدير","كشف","درجات","نتائج","خصوصية"],illustrativeScore:94,updated:"2026-09-18"},
  {id:"rag-009",documentId:"doc-export",documentTitle:"نموذج طلب كشف درجات — مثال تدريبي",category:"forms",section:"بيانات طلب الكشف",page:2,excerpt:"يتضمن نموذج طلب كشف الدرجات الاسم والرقم الأكاديمي ونوع التقرير والجهة المستلمة، ويجب اعتماده قبل إصدار النسخة الرسمية.",keywords:["كشف","درجات","طلب","تقرير","نموذج"],illustrativeScore:84,updated:"2026-07-22"},
  {id:"rag-010",documentId:"doc-exams",documentTitle:"سياسة الاختبارات — مثال تدريبي",category:"policies",section:"التظلمات حول التقييم",page:24,excerpt:"يمكن تقديم طلب مراجعة نتيجة الاختبار خلال الفترة المحددة في السياسة التدريبية، مع توثيق الملاحظات والإجراءات.",keywords:["تظلم","اعتراض","تقييم","اختبار","نتيجة"],illustrativeScore:81,updated:"2026-08-19"},
  {id:"rag-011",documentId:"doc-academic",documentTitle:"اللائحة الأكاديمية — مثال تدريبي",category:"regulations",section:"الفصل الخامس: السجلات",page:17,excerpt:"يُحدَّث سجل الحضور والغياب عبر النظام المعتمد، وتكون مراجعة السجل مسؤولية الموظف المخوّل وليس المساعد الذكي وحده.",keywords:["غياب","حضور","سجلات","مراجعة"],illustrativeScore:82,updated:"2026-09-04"},
  {id:"rag-012",documentId:"doc-students",documentTitle:"دليل شؤون الطلاب — مثال تدريبي",category:"guides",section:"الخدمات الإلكترونية",page:26,excerpt:"تتيح الواجهة الإرشادية الاستعلام عن إجراءات التسجيل والتقارير الأكاديمية ومتابعة الطلبات باستخدام الخدمات المخوّلة.",keywords:["تسجيل","تقارير","إجراءات","استعلام","خدمات"],illustrativeScore:77,updated:"2026-08-27"}
];
export const defaultOptions:SearchOptions = {category:"all", documentId:"all", sort:"relevance", band:"all"};
export const maxQueryLength=180;
export function normalizeArabic(text:string):string {
  return text.normalize("NFKC").toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,"")
    .replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي")
    .replace(/ة/g,"ه").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
}
const stopWords=new Set(["عن","في","من","على","الي","إلى","هل","ما","كم","كيف","هو","هي","ال","و","ب","مع","داخل","شروط","اجراءات"]);
function stem(word:string):string {return word.replace(/^ال/,"").replace(/(ات|ون|ين|ها|هم|ية|يه)$/,"");}
export function tokenize(text:string):string[] {
  return [...new Set(normalizeArabic(text).split(" ").map(stem).filter(w=>w.length>=2&&!stopWords.has(w)))];
}
export function validateSearchQuery(query:string):"empty"|"short"|"long"|null {
  const v=query.trim();if(!v)return "empty";if(v.length<3)return "short";if(v.length>maxQueryLength)return "long";return null;
}
export function documentOptions(records:readonly Snippet[]=demoSnippets):{value:string;label:string}[] {
  const map=new Map(records.map(item=>[item.documentId,item.documentTitle]));
  return [{value:"all",label:"جميع المستندات"},...[...map.entries()].map(([value,label])=>({value,label}))];
}
/** An offline keyword/token overlap example. Scores are illustrative, NOT vector similarity. */
export function searchDemoSnippets(query:string, options:SearchOptions=defaultOptions, records:readonly Snippet[]=demoSnippets):SearchMatch[] {
  if(validateSearchQuery(query))return [];
  const terms=tokenize(query);if(!terms.length)return [];
  const queryNorm=normalizeArabic(query);
  const output:SearchMatch[]=[];
  for(const record of records){
    if(options.category!=="all"&&record.category!==options.category)continue;
    if(options.documentId!=="all"&&record.documentId!==options.documentId)continue;
    const content=normalizeArabic(`${record.excerpt} ${record.section} ${record.documentTitle} ${record.keywords.join(" ")}`);
    const searchable=tokenize(content);
    const matchedTerms=terms.filter(term=>searchable.some(word=>word===term||word.startsWith(term)||term.startsWith(word))).length;
    if(!matchedTerms)continue;
    const completeness=matchedTerms/terms.length;
    const phraseBonus=content.includes(queryNorm)?6:0;
    const score=Math.min(99,Math.round(50+completeness*38+phraseBonus+(record.illustrativeScore-75)*.2));
    if(options.band==="high"&&score<90)continue;
    if(options.band==="medium"&&(score<75||score>=90))continue;
    output.push({record,score,matchedTerms});
  }
  output.sort((a,b)=> options.sort==="document" ? a.record.documentTitle.localeCompare(b.record.documentTitle,"ar")||a.record.page-b.record.page
    : options.sort==="page" ? a.record.page-b.record.page||b.score-a.score
    : b.score-a.score||a.record.id.localeCompare(b.record.id));
  return output;
}
export function makeCitation(record:Snippet):string {
  return `${record.documentTitle}، ${record.section}، ص ${record.page} — مثال تدريبي غير موثّق.`;
}
