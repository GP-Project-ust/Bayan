/** Bayan screen 35: demonstration-only model-provider catalog.
 * No credentials, URLs, requests, production tenant data, or backend state.
 */
export const MODELS_NOTICE='بيانات مزودين ونماذج افتراضية للعرض فقط؛ لا اتصال بشبكة أو API ولا تخزين لمفاتيح الوصول.';
export type ProviderKind='local'|'cloud'|'gateway';
export type ProviderStatus='ready'|'degraded'|'offline'|'unconfigured';
export type ModelCapability='chat'|'embeddings'|'analytics'|'reports';
export type CredentialsState='server_managed'|'not_configured'|'not_required';
export type ModelProvider={id:string;name:string;kind:ProviderKind;status:ProviderStatus;description:string;location:string;credentials:CredentialsState;lastCheck:string|null;};
export type ModelDefinition={id:string;providerId:string;name:string;capabilities:readonly ModelCapability[];contextTokens:number;maxOutputTokens:number;rpm:number;enabled:boolean;description:string;};
export type ModelDraft={modelId:string;enabled:boolean;rpm:number};
export type ProviderFilters={query:string;kind:ProviderKind|'all';status:ProviderStatus|'all';capability:ModelCapability|'all'};
export type CheckResult={state:'pass'|'warn'|'blocked';title:string;message:string;networkRequests:0};
export const MODE_LABELS:Record<ProviderKind,string>={local:'محلي',cloud:'سحابي',gateway:'بوابة مؤسسية'};
export const PROVIDER_STATUS_LABELS:Record<ProviderStatus,string>={ready:'جاهز توضيحيًا',degraded:'محدود توضيحيًا',offline:'متوقف توضيحيًا',unconfigured:'غير مهيأ'};
export const CAPABILITY_LABELS:Record<ModelCapability,string>={chat:'المحادثة',embeddings:'التضمين الدلالي',analytics:'التحليلات',reports:'التقارير'};
export const CREDENTIAL_LABELS:Record<CredentialsState,string>={server_managed:'يُدار على الخادم فقط (تصوري)',not_configured:'لم يهيأ في المثال',not_required:'غير مطلوب في المثال المحلي'};
export const DEMO_PROVIDERS:readonly ModelProvider[]=[
 {id:'PRV-DEMO-001',name:'Ollama — تشغيل محلي تجريبي',kind:'local',status:'ready',description:'مثال لخدمة محلية من دون الوصول الفعلي إلى حاوية أو جهاز.',location:'خادم المؤسسة الافتراضي',credentials:'not_required',lastCheck:'2026-11-06'},
 {id:'PRV-DEMO-002',name:'بوابة نماذج مؤسسية افتراضية',kind:'gateway',status:'degraded',description:'نموذج بوابة تنسّق الطلبات بين خدمات اللغة، دون اتصال.',location:'منصة بيان التجريبية',credentials:'server_managed',lastCheck:'2026-11-05'},
 {id:'PRV-DEMO-003',name:'مزود متوافق مع OpenAI API — مثال',kind:'cloud',status:'unconfigured',description:'نموذج إعداد تكامل سحابي غير مفعّل ولا يحتوي مفاتيح.',location:'خدمة سحابية افتراضية',credentials:'not_configured',lastCheck:null},
 {id:'PRV-DEMO-004',name:'Azure OpenAI — مثال إعداد',kind:'cloud',status:'ready',description:'تمثيل توضيحي لواجهة تكامل، وليس قياسًا لحالة خدمة Microsoft.',location:'منطقة تدريبية غير حقيقية',credentials:'server_managed',lastCheck:'2026-11-06'},
 {id:'PRV-DEMO-005',name:'خادم استدلال داخلي — مثال',kind:'local',status:'offline',description:'مصدر تجريبي متوقف لعرض معالجة الأخطاء.',location:'بيئة اختبار افتراضية',credentials:'not_required',lastCheck:'2026-11-04'},
 {id:'PRV-DEMO-006',name:'خدمة التضمين الافتراضية',kind:'gateway',status:'ready',description:'خدمة رمزية لعملية إنشاء المتجهات في RAG.',location:'منصة بيانات تجريبية',credentials:'server_managed',lastCheck:'2026-11-06'},
];
export const DEMO_MODELS:readonly ModelDefinition[]=[
 {id:'MDL-DEMO-001',providerId:'PRV-DEMO-001',name:'bayan-chat-local-demo',capabilities:['chat','reports'],contextTokens:8192,maxOutputTokens:2048,rpm:60,enabled:true,description:'نموذج محادثة محلي توضيحي.'},
 {id:'MDL-DEMO-002',providerId:'PRV-DEMO-001',name:'bayan-local-embed-demo',capabilities:['embeddings'],contextTokens:4096,maxOutputTokens:0,rpm:120,enabled:true,description:'مثال لنموذج تضمين متعدد اللغات.'},
 {id:'MDL-DEMO-003',providerId:'PRV-DEMO-002',name:'bayan-gateway-general-demo',capabilities:['chat','analytics'],contextTokens:16384,maxOutputTokens:4096,rpm:80,enabled:true,description:'توجيه افتراضي لطلبات SQL وRAG.'},
 {id:'MDL-DEMO-004',providerId:'PRV-DEMO-002',name:'bayan-reporter-demo',capabilities:['reports'],contextTokens:8192,maxOutputTokens:2048,rpm:40,enabled:true,description:'توليد تقارير تجريبية.'},
 {id:'MDL-DEMO-005',providerId:'PRV-DEMO-003',name:'cloud-chat-unconfigured',capabilities:['chat'],contextTokens:8192,maxOutputTokens:2048,rpm:30,enabled:false,description:'نموذج سحابي غير مهيأ.'},
 {id:'MDL-DEMO-006',providerId:'PRV-DEMO-004',name:'azure-analysis-example',capabilities:['analytics','chat'],contextTokens:32768,maxOutputTokens:4096,rpm:90,enabled:true,description:'مثال اصطناعي ولا يؤكد توفر أي نشر فعلي.'},
 {id:'MDL-DEMO-007',providerId:'PRV-DEMO-004',name:'azure-report-example',capabilities:['reports'],contextTokens:16384,maxOutputTokens:3072,rpm:30,enabled:false,description:'تجربة نموذج تقارير غير مفعّل.'},
 {id:'MDL-DEMO-008',providerId:'PRV-DEMO-005',name:'private-inference-example',capabilities:['chat','analytics'],contextTokens:4096,maxOutputTokens:1024,rpm:20,enabled:true,description:'مثال لنموذج خلف خدمة متوقفة.'},
 {id:'MDL-DEMO-009',providerId:'PRV-DEMO-006',name:'bayan-semantic-embed-example',capabilities:['embeddings'],contextTokens:4096,maxOutputTokens:0,rpm:180,enabled:true,description:'لشرح تدفق فهرسة النصوص في Qdrant.'},
 {id:'MDL-DEMO-010',providerId:'PRV-DEMO-006',name:'bayan-retrieval-rerank-example',capabilities:['embeddings'],contextTokens:4096,maxOutputTokens:0,rpm:100,enabled:false,description:'مرحلة اختيارية تصورية لإعادة الترتيب.'},
];
export const DEFAULT_PROVIDER_FILTERS:ProviderFilters={query:'',kind:'all',status:'all',capability:'all'};
export const MODEL_DRAFT_STORAGE='bayan-model-drafts-screen35-v1';
export function normalizeArabic(s:string){return s.toLocaleLowerCase('ar').normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();}
export function isProviderId(s:string|null):s is string{return !!s&&/^PRV-DEMO-00[1-6]$/.test(s);}
export function isModelId(s:string|null):s is string{return !!s&&/^MDL-DEMO-0(?:0[1-9]|10)$/.test(s);}
export function getProvider(id:string|null){return isProviderId(id)?DEMO_PROVIDERS.find(p=>p.id===id)??null:null;}
export function getModel(id:string|null){return isModelId(id)?DEMO_MODELS.find(m=>m.id===id)??null:null;}
export function modelsForProvider(id:string){return DEMO_MODELS.filter(m=>m.providerId===id);}
export function filterProviders(filters:ProviderFilters){const q=normalizeArabic(filters.query);return DEMO_PROVIDERS.filter(p=>(filters.kind==='all'||p.kind===filters.kind)&&(filters.status==='all'||p.status===filters.status)&&(!q||normalizeArabic(`${p.name} ${p.id} ${p.description} ${p.location}`).includes(q))&&(filters.capability==='all'||modelsForProvider(p.id).some(m=>m.capabilities.includes(filters.capability as ModelCapability))));}
export function filterModels(filters:ProviderFilters){const ids=new Set(filterProviders({...filters,capability:'all'}).map(p=>p.id));const q=normalizeArabic(filters.query);return DEMO_MODELS.filter(m=>ids.has(m.providerId)&&(filters.capability==='all'||m.capabilities.includes(filters.capability))&&(!q||normalizeArabic(`${m.name} ${m.id} ${getProvider(m.providerId)?.name}`).includes(q)));}
export function providerStats(){return {total:DEMO_PROVIDERS.length,ready:DEMO_PROVIDERS.filter(p=>p.status==='ready').length,attention:DEMO_PROVIDERS.filter(p=>p.status==='degraded'||p.status==='offline').length,models:DEMO_MODELS.length};}
export function validDraft(value:unknown):value is ModelDraft{return !!value&&typeof value==='object'&&getModel((value as ModelDraft).modelId)!==null&&typeof (value as ModelDraft).enabled==='boolean'&&Number.isInteger((value as ModelDraft).rpm)&&(value as ModelDraft).rpm>=1&&(value as ModelDraft).rpm<=500&&Object.keys(value).sort().join(',')==='enabled,modelId,rpm';}
export function parseDrafts(raw:string|null):Record<string,ModelDraft>{if(!raw||raw.length>10000)return {};try{const list:unknown=JSON.parse(raw);if(!Array.isArray(list)||list.length>DEMO_MODELS.length)return {};const out:Record<string,ModelDraft>={};for(const item of list){if(!validDraft(item))return {};out[item.modelId]={modelId:item.modelId,enabled:item.enabled,rpm:item.rpm};}return out;}catch{return {};}}
export function serializeDrafts(value:Record<string,ModelDraft>):string{const list=Object.values(value);if(list.some(x=>!validDraft(x)))throw new Error('Invalid local model draft');return JSON.stringify(list);}
export function modelWithDraft(model:ModelDefinition,drafts:Record<string,ModelDraft>){const d=drafts[model.id];return {...model,enabled:d?.enabled??model.enabled,rpm:d?.rpm??model.rpm};}
/** Deterministic preview only. Never reaches a provider, even if marked ready. */
export function previewReadiness(provider:ModelProvider,model?:ModelDefinition):CheckResult{
 if(provider.status==='unconfigured'||provider.status==='offline')return {state:'blocked',title:'غير جاهز في المثال',message:'حالة المزود لا تسمح بإجراء فحص فعلي. هذه نتيجة مستمدة من بيانات العرض فقط.',networkRequests:0};
 if(model&&!model.enabled)return {state:'blocked',title:'النموذج معطّل محليًا',message:'لم يُرسل طلب إلى الخدمة؛ أعد تفعيل النموذج في مسودة الإعدادات إن رغبت.',networkRequests:0};
 if(provider.status==='degraded')return {state:'warn',title:'حالة محدودة في المثال',message:'بيانات العرض تشير إلى حالة مراقبة. لم يُختبر الاتصال بأي خدمة.',networkRequests:0};
 return {state:'pass',title:'فحص تكوين تجريبي ناجح',message:'التصنيف التجريبي جاهز؛ لم تُجر عملية استدلال أو قياس زمن استجابة.',networkRequests:0};
}
function safeCsv(v:string|number){const s=String(v);const safe=/^[=+@\-\t\r\n]/.test(s)?`'${s}`:s;return `"${safe.replace(/"/g,'""')}"`;}
export function modelsCsv(models:readonly ModelDefinition[],drafts:Record<string,ModelDraft>){const cols=['المعرّف','اسم النموذج','المزود','المهام','مفعّل في العرض','طلبات لكل دقيقة (مسودة)','نافذة السياق'];const rows=models.map(m=>{const d=modelWithDraft(m,drafts);return [m.id,m.name,getProvider(m.providerId)?.name??'',m.capabilities.map(x=>CAPABILITY_LABELS[x]).join('، '),d.enabled?'نعم':'لا',d.rpm,m.contextTokens]});return '\ufeff'+[cols,...rows].map(row=>row.map(safeCsv).join(',')).join('\r\n')+'\r\n';}
