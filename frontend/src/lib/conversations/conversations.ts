/**
 * Screen 07: browser-only demonstration conversation archive.
 * No server history, actual institutional records, or authentication data.
 * All sample conversations and document citations below are invented examples.
 */
export type ConversationKind = "data" | "documents" | "reports";
export type ConversationFilter = "all" | "starred" | "data" | "documents" | "reports";
export type ConversationSort = "newest" | "oldest" | "title";
export type Sender = "user" | "assistant";
export type ConversationMessage = { sender: Sender; body: string; time: string };
export type ConversationSource = { document: string; page: number };
export interface DemoConversation {
  id: string;
  title: string;
  kind: ConversationKind;
  updatedAt: string;
  summary: string;
  messages: ConversationMessage[];
  sources?: ConversationSource[];
  sql?: string;
}
export const conversationStorageKey = "bayan.demo.conversations.v1";
export const kindLabels: Record<ConversationKind, string> = {
  data: "استعلامات البيانات", documents: "المستندات واللوائح", reports: "التقارير والتحليلات",
};
export const demoConversations: readonly DemoConversation[] = [
  {id:"chat-101",title:"عدد طلاب كلية الهندسة",kind:"data",updatedAt:"2026-11-06T10:24:00+03:00",
   summary:"استعلام عن العدد الإجمالي للطلاب المسجلين في كلية الهندسة.",
   messages:[{sender:"user",body:"كم عدد الطلاب المسجلين في كلية الهندسة؟",time:"10:24 ص"},
             {sender:"assistant",body:"تشير البيانات التجريبية إلى أن العدد هو 1250 طالبًا. هذا مثال توضيحي فقط.",time:"10:24 ص"}],
   sql:"SELECT college_name, COUNT(*) AS total_students\nFROM students\nWHERE college_name = 'الهندسة'\nGROUP BY college_name;"},
  {id:"chat-102",title:"لائحة الغياب والحرمان",kind:"documents",updatedAt:"2026-11-06T09:16:00+03:00",
   summary:"الاستفسار عن القواعد التنظيمية للغياب والحرمان الأكاديمي.",
   messages:[{sender:"user",body:"ما هي ضوابط الغياب والحرمان من الاختبارات؟",time:"09:16 ص"},
             {sender:"assistant",body:"يمكن مراجعة سياسة الحضور والغياب في اللوائح المعتمدة. النص المعروض هنا نموذج تجريبي وليس اقتباسًا من وثيقة رسمية.",time:"09:17 ص"}],
   sources:[{document:"دليل شؤون الطلاب — مثال توضيحي",page:8},{document:"اللائحة الأكاديمية — مثال توضيحي",page:12}]},
  {id:"chat-103",title:"تقرير أداء الأقسام",kind:"reports",updatedAt:"2026-11-05T14:08:00+03:00",
   summary:"ملخص تجريبي لمؤشرات الأداء على مستوى الأقسام الأكاديمية.",
   messages:[{sender:"user",body:"أنشئ تقريرًا عن أداء الأقسام الأكاديمية.",time:"02:08 م"},
             {sender:"assistant",body:"أُنشئ نموذج أولي يوضح نسب النشاط وتوزيع مؤشرات الأداء. لا يمثل بيانات مؤسسية فعلية.",time:"02:09 م"}]},
  {id:"chat-104",title:"إحصاءات القبول والتسجيل",kind:"data",updatedAt:"2026-11-05T11:30:00+03:00",
   summary:"توزيع توضيحي لأعداد المقبولين حسب الكلية والفصل.",
   messages:[{sender:"user",body:"اعرض إحصاءات القبول حسب الكلية.",time:"11:30 ص"},
             {sender:"assistant",body:"هذا ملخص تجريبي لإحصاءات القبول. عند الربط بالخادم، ستُستخدم البيانات المصرّح بها فقط.",time:"11:31 ص"}]},
  {id:"chat-105",title:"مواعيد التسجيل الأكاديمي",kind:"documents",updatedAt:"2026-11-04T13:42:00+03:00",
   summary:"البحث في دليل التقويم الجامعي عن فترات التسجيل.",
   messages:[{sender:"user",body:"أين أجد مواعيد التسجيل الأكاديمي؟",time:"01:42 م"},
             {sender:"assistant",body:"يمكن الرجوع إلى التقويم الأكاديمي الرسمي لدى المؤسسة. هذا مثال لعرض الاستشهادات.",time:"01:43 م"}],
   sources:[{document:"التقويم الأكاديمي — مثال توضيحي",page:3}]},
  {id:"chat-106",title:"تحليل توزيع الطلاب",kind:"reports",updatedAt:"2026-11-03T08:24:00+03:00",
   summary:"عرض تحليلي تجريبي لتوزيع الطلاب على البرامج.",
   messages:[{sender:"user",body:"حلل توزيع الطلاب على البرامج الدراسية.",time:"08:24 ص"},
             {sender:"assistant",body:"يُظهر المثال مخططًا توضيحيًا لتوزيع أعداد الطلاب دون الاعتماد على سجلات فعلية.",time:"08:25 ص"}]},
  {id:"chat-107",title:"متطلبات التخرج",kind:"documents",updatedAt:"2026-11-02T12:11:00+03:00",
   summary:"استعلام عن متطلبات التخرج والوثائق اللازمة.",
   messages:[{sender:"user",body:"ما هي متطلبات التخرج؟",time:"12:11 م"},
             {sender:"assistant",body:"تختلف المتطلبات بحسب المؤسسة والبرنامج. يُرجى مراجعة لائحة التخرج المعتمدة؛ هذا رد تجريبي.",time:"12:12 م"}],
   sources:[{document:"دليل التخرج — مثال توضيحي",page:21}]},
  {id:"chat-108",title:"العبء التدريسي للأقسام",kind:"data",updatedAt:"2026-10-29T10:52:00+03:00",
   summary:"استعلام وصفي عن توزيع المقررات والساعات التدريسية.",
   messages:[{sender:"user",body:"اعرض توزيع العبء التدريسي للأقسام.",time:"10:52 ص"},
             {sender:"assistant",body:"يمكن حساب العبء التدريسي من العروض المصرح بها بعد الربط. البيانات غير متاحة في هذه النسخة التجريبية.",time:"10:53 ص"}]},
  {id:"chat-109",title:"تحليل اتجاهات الحضور",kind:"reports",updatedAt:"2026-10-28T15:04:00+03:00",
   summary:"مقارنة تجريبية لاتجاهات الحضور خلال الأسابيع.",
   messages:[{sender:"user",body:"قارن اتجاهات الحضور خلال الشهر.",time:"03:04 م"},
             {sender:"assistant",body:"هذا المثال يشرح آلية العرض التحليلي ولا يقدم نتائج حقيقية.",time:"03:05 م"}]},
  {id:"chat-110",title:"دليل خدمات الطلاب",kind:"documents",updatedAt:"2026-10-22T09:11:00+03:00",
   summary:"البحث الدلالي في الخدمات والمستندات الجامعية.",
   messages:[{sender:"user",body:"ما خدمات شؤون الطلاب المتاحة؟",time:"09:11 ص"},
             {sender:"assistant",body:"يمكن الرجوع إلى دليل خدمات الطلاب الرسمي. الروابط والمراجع في هذه المعاينة افتراضية.",time:"09:12 ص"}],
   sources:[{document:"دليل الخدمات الطلابية — مثال توضيحي",page:5}]},
  {id:"chat-111",title:"أعداد المقررات المطروحة",kind:"data",updatedAt:"2026-10-15T11:20:00+03:00",
   summary:"استعلام توضيحي عن إجمالي المقررات بحسب الكلية.",
   messages:[{sender:"user",body:"كم مقررًا طُرح هذا الفصل؟",time:"11:20 ص"},
             {sender:"assistant",body:"لا تتوفر بيانات حقيقية في نموذج العرض؛ النتيجة تتطلب ربط قاعدة البيانات.",time:"11:20 ص"}]},
  {id:"chat-112",title:"ملخص مؤشرات التسجيل",kind:"reports",updatedAt:"2026-10-07T08:40:00+03:00",
   summary:"ملخص تجريبي لمؤشرات التسجيل خلال فصل دراسي.",
   messages:[{sender:"user",body:"لخّص مؤشرات التسجيل حسب الفصول.",time:"08:40 ص"},
             {sender:"assistant",body:"يمكن إعداد ملخص قائم على المؤشرات المعتمدة عند الاتصال بخادم بيان.",time:"08:41 ص"}]},
];
export interface ConversationChanges {
  renamed: Record<string, string>;
  starredIds: string[];
  deletedIds: string[];
}
export const emptyConversationChanges: ConversationChanges = {renamed:{},starredIds:[],deletedIds:[]};
const knownIds = new Set(demoConversations.map(item=>item.id));
export function validTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001F\u007F-\u009F]/g," ").replace(/\s+/g," ").trim();
  return text.length >= 3 && text.length <= 80 ? text : null;
}
/** Strict validation of browser-controlled data; never trust it for authorization. */
export function sanitizeConversationChanges(value:unknown): ConversationChanges {
  const obj = value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const renamed:Record<string,string>={};
  if(obj.renamed && typeof obj.renamed==="object" && !Array.isArray(obj.renamed)){
    for(const [id,title] of Object.entries(obj.renamed)){
      const clean = validTitle(title);
      if(knownIds.has(id) && clean) renamed[id]=clean;
    }
  }
  const ids=(key:string)=>Array.isArray(obj[key]) ? Array.from(new Set((obj[key] as unknown[]).filter((id):id is string=>typeof id==="string"&&knownIds.has(id)))):[];
  return {renamed,starredIds:ids("starredIds"),deletedIds:ids("deletedIds")};
}
export function readConversationChanges(raw:string|null):ConversationChanges {
  if(!raw)return {renamed:{},starredIds:[],deletedIds:[]};
  try{return sanitizeConversationChanges(JSON.parse(raw));}
  catch{return {renamed:{},starredIds:[],deletedIds:[]};}
}
export function writeConversationChanges(changes:ConversationChanges):string {
  return JSON.stringify(sanitizeConversationChanges(changes));
}
export interface ConversationListItem extends DemoConversation {starred:boolean}
export function applyConversationChanges(conversations:readonly DemoConversation[],changes:ConversationChanges):ConversationListItem[] {
  const clean=sanitizeConversationChanges(changes);
  return conversations.filter(item=>!clean.deletedIds.includes(item.id))
    .map(item=>({...item,title:clean.renamed[item.id]??item.title,starred:clean.starredIds.includes(item.id)}));
}
function normalizeArabic(value:string):string {
  return value.normalize("NFKC").replace(/[\u064b-\u065f\u0670]/g,"").replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ـ/g,"").toLocaleLowerCase("ar");
}
export function filterConversations(items:readonly ConversationListItem[],opts:{query:string;filter:ConversationFilter;sort:ConversationSort}):ConversationListItem[] {
  const needle=normalizeArabic(opts.query.trim());
  return items.filter(item=>{
    if(opts.filter==="starred"&&!item.starred)return false;
    if(["data","documents","reports"].includes(opts.filter)&&item.kind!==opts.filter)return false;
    const haystack=normalizeArabic([item.title,item.summary,...item.messages.map(m=>m.body)].join(" "));
    return !needle||haystack.includes(needle);
  }).sort((a,b)=>opts.sort==="title" ? a.title.localeCompare(b.title,"ar") : opts.sort==="oldest" ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt));
}
export function conversationStats(items:readonly ConversationListItem[]){
  return {total:items.length,starred:items.filter(item=>item.starred).length,
    data:items.filter(item=>item.kind==="data").length,
    documents:items.filter(item=>item.kind==="documents").length,
    reports:items.filter(item=>item.kind==="reports").length};
}
export function renameConversation(changes:ConversationChanges,id:string,title:string):ConversationChanges {
  const next=validTitle(title);
  return !knownIds.has(id)||!next?changes:sanitizeConversationChanges({...changes,renamed:{...changes.renamed,[id]:next}});
}
export function toggleConversationStar(changes:ConversationChanges,id:string):ConversationChanges {
  if(!knownIds.has(id))return changes;
  const current=changes.starredIds;
  return sanitizeConversationChanges({...changes,starredIds:current.includes(id)?current.filter(x=>x!==id):[...current,id]});
}
export function deleteConversation(changes:ConversationChanges,id:string):ConversationChanges {
  if(!knownIds.has(id))return changes;
  return sanitizeConversationChanges({...changes,deletedIds:[...changes.deletedIds,id]});
}
