/**
 * Screen 12 — Document upload/indexing FRONTEND DEMO model.
 * This module never reads file bytes, sends requests, or creates index vectors.
 * Real file/content validation and tenant authorization MUST live on FastAPI.
 */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_BATCH_FILES = 6;
export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
export type UploadCategory = "regulations" | "guides" | "policies" | "forms";
export type AccessLevel = "institution" | "restricted" | "confidential";
export type UploadStage = "queued" | "invalid" | "validating" | "receiving" | "extracting" | "chunking" | "embedding" | "indexed" | "canceled";
export type UploadMetadata = {category: UploadCategory; access: AccessLevel; owner: string; description: string};
export type FileDescriptor = {name: string; size: number; type?: string; lastModified?: number};
export type UploadItem = FileDescriptor & {id:string; stage:UploadStage; progress:number; error:string|null; meta:UploadMetadata};

export const categoryLabels:Record<UploadCategory,string> = {
  regulations:"اللوائح",guides:"الأدلة",policies:"السياسات",forms:"النماذج"
};
export const accessLabels:Record<AccessLevel,string> = {
  institution:"داخلي — موظفو المؤسسة المصرح لهم",
  restricted:"مقيّد — أدوار محددة",
  confidential:"حساس — موافقة وصلاحيات خاصة"
};
export const stageLabels:Record<UploadStage,string> = {
  queued:"جاهز للمعاينة",invalid:"ملف غير مقبول",validating:"فحص تمهيدي (محاكاة)",
  receiving:"استقبال الملف (محاكاة)",extracting:"استخراج النص (محاكاة)",
  chunking:"تقسيم المقاطع (محاكاة)",embedding:"إنشاء المتجهات (محاكاة)",
  indexed:"انتهت المحاكاة",canceled:"أُلغيت المحاكاة"
};
export const simulatedStages = ["validating","receiving","extracting","chunking","embedding","indexed"] as const;
export const stagePercent:Record<(typeof simulatedStages)[number],number> = {
  validating:7,receiving:23,extracting:44,chunking:66,embedding:86,indexed:100
};
export const initialUploadMetadata:UploadMetadata = {
  category:"regulations",access:"restricted",owner:"الشؤون الأكاديمية — مثال تدريبي",description:""
};
export const ACCEPT_ATTRIBUTE=".pdf,.docx,.txt";
export const exampleFiles:FileDescriptor[] = [
  {name:"لائحة_الدراسة_التجريبية.pdf",size:1_480_000,type:"application/pdf",lastModified:1001},
  {name:"دليل_شؤون_الطلاب_التجريبي.docx",size:620_000,type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",lastModified:1002}
];
export function extensionFromName(filename:string):string {
  const name=filename.trim(); const dot=name.lastIndexOf(".");
  return dot>0?name.slice(dot+1).toLowerCase():"";
}
export function validateUploadFile(file:FileDescriptor):string|null {
  if(!file.name.trim())return "اسم الملف غير صالح.";
  if(file.name.length>180)return "اسم الملف طويل جدًا (الحد 180 حرفًا).";
  if(/[\\/\u0000-\u001f]/.test(file.name))return "اسم الملف يحتوي على أحرف أو مسارات غير مقبولة.";
  if(!ALLOWED_EXTENSIONS.includes(extensionFromName(file.name) as AllowedExtension))return "النوع غير مدعوم. استخدم PDF أو DOCX أو TXT فقط.";
  if(!Number.isSafeInteger(file.size)||file.size<=0)return "لا يمكن اختيار ملف فارغ أو ذي حجم غير صالح.";
  if(file.size>MAX_FILE_BYTES)return "حجم الملف يتجاوز الحد التجريبي (20 ميجابايت).";
  // MIME is browser-provided and untrusted. Validate extension for UX; backend must inspect content.
  return null;
}
export function validateMetadata(meta:UploadMetadata):string|null {
  if(!Object.keys(categoryLabels).includes(meta.category))return "اختر تصنيفًا صالحًا.";
  if(!Object.keys(accessLabels).includes(meta.access))return "اختر مستوى وصول صالحًا.";
  const owner=meta.owner.trim();
  if(owner.length<3||owner.length>90)return "اسم الجهة المالكة يجب أن يكون بين 3 و90 حرفًا.";
  if(meta.description.length>350)return "الوصف يجب ألا يتجاوز 350 حرفًا.";
  return null;
}
export function duplicateKey(file:FileDescriptor):string {
  return `${file.name.trim().toLocaleLowerCase("ar")}|${file.size}|${file.lastModified??0}`;
}
export function makeDemoUploadItems(input:readonly FileDescriptor[], current:readonly UploadItem[], meta:UploadMetadata, serial=0):{accepted:UploadItem[]; skipped:number} {
  const known=new Set(current.map(duplicateKey));const accepted:UploadItem[]=[];let skipped=0;
  for(const file of input){
    if(current.length+accepted.length>=MAX_BATCH_FILES){skipped++;continue;}
    if(known.has(duplicateKey(file))){skipped++;continue;}
    known.add(duplicateKey(file));const error=validateUploadFile(file);
    accepted.push({id:`demo-${serial}-${accepted.length}`,name:file.name,size:file.size,type:file.type,
      lastModified:file.lastModified,stage:error?"invalid":"queued",progress:0,error,meta:{...meta}});
  }
  return {accepted,skipped};
}
export function nextSimulationStage(stage:UploadStage):UploadStage {
  if(stage==="queued")return "validating";
  const index=simulatedStages.indexOf(stage as (typeof simulatedStages)[number]);
  if(index<0||index===simulatedStages.length-1)return stage;
  return simulatedStages[index+1];
}
export function isSimulating(stage:UploadStage):boolean {
  return ["validating","receiving","extracting","chunking","embedding"].includes(stage);
}
export function readableSize(bytes:number):string {
  if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} كيلوبايت`;
  return `${(bytes/(1024*1024)).toFixed(1)} ميجابايت`;
}
export function queueStats(files:readonly UploadItem[]){return {
 total:files.length,ready:files.filter(x=>x.stage==="queued").length,
 running:files.filter(x=>isSimulating(x.stage)).length,
 complete:files.filter(x=>x.stage==="indexed").length,
 attention:files.filter(x=>x.stage==="invalid"||x.stage==="canceled").length
};}
