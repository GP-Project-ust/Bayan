'use client';

import {useEffect,useMemo,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {
 Activity,AlertTriangle,ArrowLeft,BookOpen,CheckCircle2,ChevronLeft,ClipboardCheck,
 Clock3,Database,ExternalLink,EyeOff,FileText,Info,Layers3,ListChecks,
 LockKeyhole,Network,PlugZap,RefreshCcw,Search,Server,ShieldAlert,ShieldCheck,
 Table2,Workflow
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Dialog,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {CREATED_SOURCES_KEY,restoreCreatedSources} from '@/lib/data-sources/connect';
import {
 SOURCE_STORAGE_KEY,sourceTypeLabels,sourceClassLabels,sourceStatusLabels,
 DEMO_SOURCES,restoreSourceFlags,withLocalFlags,simulateConnectionCheck,
 type DataSource,type SourceClass
} from '@/lib/data-sources/sources';
import {
 SOURCE_REVIEW_STORAGE_KEY,REVIEW_REASONS,aggregateClassification,findDemoSource,
 getSourceSchema,makeReview,normalizeSourceId,restoreReviews,sourceActivity,sourceDetailSummary,
 type LocalReview,type ReviewReason, type TableMeta
} from '@/lib/data-sources/details';

type DetailTab='overview'|'schema'|'security'|'views'|'activity';
type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const tabs:ReadonlyArray<{id:DetailTab;label:string;icon:typeof Database}>=[
 {id:'overview',label:'نظرة عامة',icon:Database},
 {id:'schema',label:'الجداول والحقول',icon:Table2},
 {id:'security',label:'تصنيف الوصول',icon:ShieldCheck},
 {id:'views',label:'العروض الذكية',icon:Layers3},
 {id:'activity',label:'النشاط التوضيحي',icon:Activity}
];
function LevelPill({level}:{level:SourceClass}){return <span className={`bsd-pill bsd-pill--${level}`}>{level==='blocked'?<LockKeyhole size={14}/>:<ShieldCheck size={14}/>} {sourceClassLabels[level]}</span>;}
function WarnNote({children}:{children:ReactNode}){return <p className="bsd-notice"><Info size={17}/><span>{children}</span></p>;}
function SourceDetailsBody({requestedId}:{requestedId:string|null}){
 const {can}=useDemoAccess();const allowed=can('sources.manage');
 const [loaded,setLoaded]=useState(false);
 const [localFlags,setLocalFlags]=useState<Record<string,boolean>>({});
 const [created,setCreated]=useState<DataSource[]>([]);
 const [reviews,setReviews]=useState<Record<string,LocalReview>>({});
 const [tab,setTab]=useState<DetailTab>('overview');
 const [tableName,setTableName]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [showProbe,setShowProbe]=useState(false);
 const [reviewOpen,setReviewOpen]=useState(false);
 const [reviewReason,setReviewReason]=useState<ReviewReason>('classification');
 const [removeReview,setRemoveReview]=useState(false);
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{
  try{const f=localStorage.getItem(SOURCE_STORAGE_KEY);if(f)setLocalFlags(restoreSourceFlags(JSON.parse(f)));}catch{setNotice({title:'تعذّر قراءة حالات المصادر',message:'سنستخدم الحالة الأصلية للمصادر التدريبية.',tone:'warning'});}
  try{const s=localStorage.getItem(CREATED_SOURCES_KEY);if(s)setCreated(restoreCreatedSources(JSON.parse(s)));}catch{setNotice({title:'تعذّر قراءة المصادر المحلية',message:'لم تُعرض المصادر التي أضيفت محليًا.',tone:'warning'});}
  try{const r=localStorage.getItem(SOURCE_REVIEW_STORAGE_KEY);if(r)setReviews(restoreReviews(JSON.parse(r)));}catch{setNotice({title:'تعذّر قراءة طلبات المراجعة',message:'لا توجد طلبات مراجعة محملة حاليًا.',tone:'warning'});}
  setLoaded(true);
 },[]);
 const sources=useMemo(()=>[...withLocalFlags(localFlags),...created],[localFlags,created]);
 const normalizedId=normalizeSourceId(requestedId);
 const source=useMemo(()=>findDemoSource(sources,normalizedId),[sources,normalizedId]);
 const schema=useMemo(()=>source?getSourceSchema(source):null,[source]);
 const summary=useMemo(()=>source?sourceDetailSummary(source):null,[source]);
 const selectedTable=schema?.tables.find(item=>item.name===tableName)||null;
 const fieldClasses=schema?aggregateClassification(schema.tables):[];
 const review=source?reviews[source.id]||null:null;
 const isBlocked=source?.classification==='blocked';
 const probe=source?simulateConnectionCheck(source):null;
 const filteredTables=useMemo(()=>schema?.tables.filter(t=>(t.label+' '+t.name+' '+t.fields.map(f=>f.name).join(' ')).toLowerCase().includes(search.toLowerCase().trim()))||[],[schema,search]);
 function saveReview(){if(!source||!allowed||source.classification==='blocked')return;
  try{const record=makeReview(source,reviewReason,new Date().toISOString());const next={...reviews,[source.id]:record};localStorage.setItem(SOURCE_REVIEW_STORAGE_KEY,JSON.stringify(next));setReviews(next);setReviewOpen(false);setNotice({title:'حُفظ الطلب محليًا',message:'تم إنشاء مسودة مراجعة تدريبية فقط؛ لم تُرسل إلى فريق أو خادم.',tone:'success'});}
  catch{setNotice({title:'لم يُحفظ طلب المراجعة',message:'تعذّر حفظ المسودة في المتصفح، ولم يحدث أي تغيير فعلي.',tone:'danger'});}
 }
 function deleteReview(){if(!source||!allowed)return;
  const next={...reviews};delete next[source.id];
  try{localStorage.setItem(SOURCE_REVIEW_STORAGE_KEY,JSON.stringify(next));setReviews(next);setRemoveReview(false);setNotice({title:'أُزيلت المسودة المحلية',message:'لم يتغير أي إعداد اتصال أو تصنيف أمني.',tone:'info'});}
  catch{setNotice({title:'تعذّر حذف المسودة',message:'لم تُحفظ التغييرات في التخزين المحلي.',tone:'danger'});}
 }
 return <div className="ban bsd" dir="rtl" data-testid="source-details-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/data-sources">مصادر البيانات</Link><ChevronLeft size={15}/><span aria-current="page">تفاصيل المصدر</span></nav>
  <header className="ban-hero bsd-hero"><div><span className="ban-eyebrow"><Database size={17}/> الإدارة · UC-05</span><h1>تفاصيل مصدر البيانات</h1><p>مراجعة بطاقة المصدر وحالة الاتصال الوصفية، ونماذج الجداول والحقول والتصنيف الأمني والعروض الذكية المرتبطة به.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> صلاحيات المؤسسة</span><span><Table2 size={14}/> ميتاداتا توضيحية</span><span><EyeOff size={14}/> دون أسرار اتصال</span></div></div><div className="ban-hero-art" aria-hidden="true"><Server size={66}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>بيانات تعليمية بالكامل:</strong> نماذج الجداول والحقول والعروض الذكية في هذه الشاشة افتراضية؛ لم تُكتشف عبر الاتصال بالخادم. لا تعرض بيانات الاعتماد ولا تجري فحصًا شبكيًا فعليًا.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> تتطلب هذه الصفحة صلاحية إدارة مصادر المؤسسة.</span><DemoRolePicker id="bsd-role-picker"/></div>
  {!allowed?<section className="ban-locked" data-testid="source-details-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية عرض تفاصيل المصادر" description="هذه محاكاة للصلاحيات؛ لا يستطيع مسؤول المنصة الوصول تلقائيًا إلى بيانات مؤسسة أخرى."/><Link href="/admin/data-sources">العودة إلى قائمة المصادر <ArrowLeft size={15}/></Link></section>:
  !loaded?<section className="ban-panel"><p role="status">جارٍ تحميل البيانات التدريبية المحلية...</p></section>:
  requestedId!==null&&!normalizedId?<section className="ban-locked" data-testid="source-details-invalid"><StatePanel state="error" title="معرّف مصدر غير صالح" description="تعذّر تفسير المعرّف المحدد في الرابط."/><Link href="/admin/data-sources">العودة إلى المصادر <ArrowLeft size={15}/></Link></section>:
  !source?<section className="ban-locked" data-testid="source-details-not-found"><StatePanel state="empty" title={requestedId?'لم يُعثر على المصدر':'لم تُحدّد مصدرًا بعد'} description="اختر مصدرًا من قائمة إدارة المصادر لعرض تفاصيله."/><Link href="/admin/data-sources">فتح إدارة المصادر <ArrowLeft size={15}/></Link></section>:<>
   <section className="bsd-identity ban-panel" aria-label="بطاقة المصدر"><div className="bsd-source-icon"><Database size={28}/></div><div className="bsd-source-head"><div className="bsd-heading-row"><h2>{source.name}</h2><span className="bsd-id" dir="ltr">{source.id}</span></div><p>{source.description}</p><div className="bsd-tags"><span className="bsd-kind"><Network size={14}/>{sourceTypeLabels[source.type]}</span><span className={`bsd-state bsd-state--${source.status}`}><Activity size={14}/>{sourceStatusLabels[source.status]}</span><LevelPill level={source.classification}/></div></div><div className="bsd-head-actions"><Link className="bsd-outline-link" href="/admin/data-sources"><ArrowLeft size={15}/> كل المصادر</Link><Button size="sm" variant="outline" leadingIcon={<PlugZap size={15}/>} disabled={source.status==='disabled'||isBlocked} onClick={()=>setShowProbe(true)}>محاكاة اختبار الاتصال</Button></div></section>
   <section className="bsd-stats" aria-label="مؤشرات بيانات المصدر التدريبية">{[
    {title:'مجموعات المصدر المسجلة',value:source.collections,detail:'رقم تدريبي لا يعني استكشافًا',icon:Layers3},
    {title:'جداول موضّحة',value:summary!.sampleTables,detail:'نماذج للمخطط فقط',icon:Table2},
    {title:'حقول توضيحية',value:summary!.sampleFields,detail:'ليست استعلامًا من قاعدة بيانات',icon:ListChecks},
    {title:'عروض ذكية موضحة',value:summary!.sampleViews,detail:'مقترحة أو تمثيلية',icon:Workflow}
   ].map(x=><article key={x.title} className="bsd-stat"><span className="bsd-stat-icon"><x.icon size={22}/></span><span><small>{x.title}</small><strong>{x.value.toLocaleString('ar-EG')}</strong><em>{x.detail}</em></span></article>)}</section>
   <section className="ban-panel bsd-content"><div className="bsd-tabs" role="tablist" aria-label="تفاصيل المصدر">{tabs.map(x=><button type="button" role="tab" id={`bsd-tab-${x.id}`} aria-selected={tab===x.id} aria-controls="bsd-tab-panel" key={x.id} className={tab===x.id?'active':''} onClick={()=>setTab(x.id)}><x.icon size={16}/>{x.label}</button>)}</div>
    <div id="bsd-tab-panel" role="tabpanel" aria-labelledby={`bsd-tab-${tab}`} className="bsd-tab-content">
     {tab==='overview'&&<div className="bsd-overview"><div><h3><BookOpen size={19}/> معلومات المصدر</h3><dl className="bsd-facts">{[
      ['نوع المصدر',sourceTypeLabels[source.type]],['الجهة المالكة',source.owner],['النطاق / النظام',source.scope],['حالة المصدر',sourceStatusLabels[source.status]],['آخر تحقق',source.lastCheck],['معرّف المصدر',source.id]
     ].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}<div><dt>عنوان تجريبي معروض</dt><dd dir="ltr">{isBlocked?'[محجوب وفق السياسة]':source.endpoint}</dd></div></dl></div><aside className="bsd-summary"><h3><ShieldCheck size={19}/> وضع الحماية</h3><LevelPill level={source.classification}/><p>التصنيف هنا وصف توضيحي. يجب اعتماد حماية الحقول والسجلات داخل الخادم، ثم تطبيق عزل المؤسسات قبل الوصول إلى البيانات.</p><div className="bsd-process"><span><CheckCircle2 size={15}/> تسجيل بيانات المصدر</span><span><Clock3 size={15}/> اعتماد الصلاحيات عبر الخادم — غير منفذ</span><span><Clock3 size={15}/> اكتشاف المخطط — غير منفذ</span><span><Clock3 size={15}/> فحص الاتصال الحقيقي — غير منفذ</span></div></aside></div>}
     {tab==='schema'&&<div className="bsd-schema"><div className="ban-section-header"><div><h3><Table2 size={19}/> جداول المصدر وحقوله</h3><p>{schema?.note}</p></div>{!isBlocked&&<label className="bsd-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث في أسماء الجداول والحقول..." aria-label="البحث في الجداول والحقول"/></label>}</div>{isBlocked?<WarnNote>المصدر مصنّف محظورًا؛ لا تُعرض له حتى أمثلة لحقول أو مخططات.</WarnNote>:filteredTables.length===0?<div className="bsd-empty"><Table2 size={25}/><strong>لا توجد جداول تدريبية متاحة</strong><span>لم تُستكشف قاعدة البيانات، أو لم يطابق البحث أي جدول تجريبي.</span></div>:<div className="bsd-table-list">{filteredTables.map(item=><article className="bsd-table-card" key={item.name}><div><span className="bsd-table-icon"><Table2 size={21}/></span><div><h4>{item.label}</h4><small dir="ltr">{item.name}</small><p>{item.fields.length} حقول توضيحية · {item.rowCountLabel}</p></div></div><button type="button" onClick={()=>setTableName(tableName===item.name?null:item.name)} aria-expanded={selectedTable?.name===item.name} aria-controls="bsd-fields-region">{selectedTable?.name===item.name?'إخفاء الحقول':'عرض الحقول'} <ChevronLeft size={16}/></button>{selectedTable?.name===item.name&&<div id="bsd-fields-region" className="bsd-fields-scroll"><table><thead><tr><th scope="col">الحقل</th><th scope="col">النوع</th><th scope="col">التصنيف</th><th scope="col">الشرح</th></tr></thead><tbody>{item.fields.map(f=><tr key={f.name}><td dir="ltr"><code>{f.name}</code></td><td><code>{f.kind}</code></td><td><LevelPill level={f.classification}/></td><td>{f.classification==='blocked'?'تفاصيل الحقل محجوبة ضمن المثال':f.description}</td></tr>)}</tbody></table></div>}</article>)}</div>}<WarnNote>الأسماء والأنواع المعروضة توضيحية، وليست ناتجة عن Schema introspection أو استعلام إلى PostgreSQL أو Odoo.</WarnNote></div>}
     {tab==='security'&&<div className="bsd-security"><h3><ShieldCheck size={19}/> سياسة تصنيف الوصول</h3><p>أربع درجات لتصنيف بيانات المصادر، مع الفصل بين بيانات التعريف وقراءة المحتوى الفعلي.</p><div className="bsd-class-grid">{(['public','masked','restricted','blocked'] as const).map(x=><article key={x}><LevelPill level={x}/><strong>{fieldClasses.find(f=>f.level===x)?.count??0} حقول تدريبية</strong><span>{x==='public'?'يمكن إتاحتها وفق سياسات المؤسسة':x==='masked'?'يتطلب إخفاء القيم الحساسة':x==='restricted'?'يخضع لصلاحيات مؤسسية محددة':'محظور العرض أو الاستعلام'}</span></article>)}</div><div className="bsd-warning"><ShieldAlert size={20}/><div><strong>أمن البيانات لا يُفرض من واجهة React</strong><p>يجب تنفيذ RBAC وعزل المؤسسات والتحقق من الأعمدة والصفوف في FastAPI وطبقة SQL. التصنيف لا يمنح حق الاطلاع على المحتوى تلقائيًا.</p></div></div></div>}
     {tab==='views'&&<div className="bsd-views"><div className="ban-section-header"><div><h3><Layers3 size={19}/> العروض الذكية المرتبطة</h3><p>أمثلة لعروض مفهرسة منطقيًا، لا تمثل كائنات Smart Views منشأة في قاعدة البيانات.</p></div><Link className="bsd-outline-link" href="/admin/smart-views"><ExternalLink size={15}/> إدارة العروض الذكية</Link></div>{schema?.smartViews.length===0?<div className="bsd-empty"><Layers3 size={25}/><strong>لا توجد عروض موثقة لهذا المصدر</strong><span>المصدر الجديد أو غير المجهز لا يملك عروضًا حقيقية مكتشفة.</span></div>:<div className="bsd-view-grid">{schema?.smartViews.map(v=><article key={v.id}><div className="bsd-view-title"><Layers3 size={19}/><strong>{v.name}</strong></div><small dir="ltr">{v.id}</small><p>{v.scope}</p><div className="bsd-code-pills">{v.columns.map(c=><code key={c}>{c}</code>)}</div><span className="bsd-view-state">{v.state==='planned'?'مقترح للتصميم':'مثال توضيحي'}</span></article>)}</div>}<WarnNote>إنشاء العروض الذكية والتحقق من وصولها الفعلي سيكونان في Backend ضمن صلاحيات المؤسسة.</WarnNote></div>}
     {tab==='activity'&&<div className="bsd-activity"><h3><Activity size={19}/> أحداث توضيحية</h3><WarnNote>هذه ليست سجلات تدقيق فعلية. أحداث التدقيق الرسمية يجب أن تُنشأ من الخادم مع معرّف المستخدم والمؤسسة والطابع الزمني.</WarnNote><ol>{sourceActivity(source).map((item,i)=><li key={`${item.title}-${i}`}><span className={item.kind==='warning'?'warn':''}>{item.kind==='warning'?<AlertTriangle size={17}/>:<Clock3 size={17}/>}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}{review&&<li><span><ClipboardCheck size={17}/></span><div><strong>مسودة مراجعة محلية</strong><p>{REVIEW_REASONS[review.reason]} — {review.updatedAt.slice(0,10)} · لم تُرسل إلى الخادم.</p></div></li>}</ol></div>}
    </div>
   </section>
   <section className="ban-panel bsd-review" aria-label="إجراءات مراجعة المصدر"><div><h3><ClipboardCheck size={19}/> مراجعة إعدادات المصدر</h3><p>يمكن إنشاء مسودة مراجعة تجريبية؛ لا تؤدي إلى تغيير التصنيف أو الاتصال أو صلاحيات الوصول.</p>{review&&<span className="bsd-review-active">مسودة محفوظة: {REVIEW_REASONS[review.reason]}</span>}</div><div className="bsd-review-actions"><Button size="sm" onClick={()=>{setReviewReason(review?.reason??'classification');setReviewOpen(true);}} disabled={isBlocked} leadingIcon={<ClipboardCheck size={15}/>}>{review?'تعديل المسودة':'طلب مراجعة تجريبية'}</Button>{review&&<Button variant="outline" size="sm" onClick={()=>setRemoveReview(true)}>حذف المسودة</Button>}</div></section>
   <footer className="bsd-footer"><LockKeyhole size={18}/><span>جميع الإجراءات هنا محلية. عند بناء التكامل الحقيقي يجب تطبيق الصلاحيات في FastAPI، وعدم تمرير كلمات المرور أو بيانات الاعتماد إلى المتصفح، وتسجيل عمليات الإدارة في Audit Log.</span></footer>
  </>}
  <Dialog open={showProbe&&allowed} onClose={()=>setShowProbe(false)} title="محاكاة اختبار الاتصال" description="لا يتم إجراء أي اتصال بالشبكة" footer={<Button onClick={()=>setShowProbe(false)}>إغلاق</Button>}>
   {probe&&source&&<div className="bsd-dialog-body"><PlugZap size={29}/><strong>{probe.title}</strong><p>{probe.description}</p><p>المصدر: {source.name}</p><WarnNote>لا يوجد اختبار حقيقي ولا إرسال طلب إلى قواعد البيانات.</WarnNote></div>}
  </Dialog>
  <Dialog open={reviewOpen&&allowed&&!isBlocked} onClose={()=>setReviewOpen(false)} title="طلب مراجعة تجريبي" description="يحفظ مسودة في هذا المتصفح فقط" footer={<><Button variant="outline" onClick={()=>setReviewOpen(false)}>إلغاء</Button><Button onClick={saveReview}>حفظ المسودة</Button></>}>
   <div className="bsd-review-dialog"><label htmlFor="bsd-review-reason">سبب المراجعة</label><select id="bsd-review-reason" value={reviewReason} onChange={e=>setReviewReason(e.target.value as ReviewReason)}>{(Object.entries(REVIEW_REASONS) as [ReviewReason,string][]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><WarnNote>لا تكتب أسرارًا أو معلومات حقيقية؛ لا يتم إرسال الطلب إلى الخادم.</WarnNote></div>
  </Dialog>
  <Dialog open={removeReview&&allowed} onClose={()=>setRemoveReview(false)} title="حذف مسودة المراجعة" description="حذف محلي لا يغيّر مصدر البيانات" footer={<><Button variant="outline" onClick={()=>setRemoveReview(false)}>إلغاء</Button><Button variant="danger" onClick={deleteReview}>حذف المسودة</Button></>}><p>هل تريد حذف مسودة المراجعة المحفوظة في هذا المتصفح؟</p></Dialog>
  {notice&&<div className="bsd-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function SourceDetailsScreen({requestedId}:{requestedId:string|null}){
 return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><SourceDetailsBody requestedId={requestedId}/></AdminLayout></DemoAccessProvider>;
}
