'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
 Activity,ArrowLeft,BookOpenCheck,CheckCircle2,ChevronLeft,Database,Eye,ExternalLink,FilterX,
 HardDrive,Info,Layers3,LockKeyhole,MoreHorizontal,Network,PlugZap,Plus,
 RefreshCcw,Search,Server,ShieldAlert,ShieldCheck,SlidersHorizontal,WifiOff
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {CREATED_SOURCES_KEY,restoreCreatedSources} from '@/lib/data-sources/connect';
import {Button,Dialog,Drawer,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {ORGANIZATION_ROUTES, buildDataSourceDetailUrl} from '@/lib/routes';
import {
 DEFAULT_FILTERS,DEMO_SOURCES,SOURCE_STORAGE_KEY,canToggleDemoSource,filterSources,
 restoreSourceFlags,simulateConnectionCheck,sourceClassLabels,sourceStats,
 sourceStatusLabels,sourceTypeLabels,withLocalFlags,
 type DataSource,type SourceFilters,type SourceClass,type SourceStatus,type SourceType,type ProbeResult
} from '@/lib/data-sources/sources';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const classes:SourceClass[]=['public','masked','restricted','blocked'];
const statuses:SourceStatus[]=['connected','attention','pending','disabled'];
const types:SourceType[]=['postgres','odoo','mysql','files','api'];
const shapeIcons:Record<SourceType,typeof Database>={postgres:Database,odoo:Layers3,mysql:Database,files:HardDrive,api:Network};
function SourceStatusTag({status}:{status:SourceStatus}){return <span className={`bds-status bds-status--${status}`}><span aria-hidden="true"/>{sourceStatusLabels[status]}</span>;}
function ClassificationTag({level}:{level:SourceClass}){return <span className={`bds-level bds-level--${level}`}>{level==='public'?<CheckCircle2 size={13}/>:level==='blocked'?<ShieldAlert size={13}/>:<LockKeyhole size={13}/>} {sourceClassLabels[level]}</span>;}
function SourceBody(){
 const {can}=useDemoAccess();const authorized=can('sources.manage');
 const [flags,setFlags]=useState<Record<string,boolean>>({});
 const [addedSources,setAddedSources]=useState<DataSource[]>([]);
 const [filters,setFilters]=useState<SourceFilters>(DEFAULT_FILTERS);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [probeId,setProbeId]=useState<string|null>(null);
 const [confirmId,setConfirmId]=useState<string|null>(null);
 const [probe,setProbe]=useState<ProbeResult|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [page,setPage]=useState(1);
 useEffect(()=>{try{const raw=localStorage.getItem(SOURCE_STORAGE_KEY);if(raw!==null)setFlags(restoreSourceFlags(JSON.parse(raw)));}catch{setNotice({title:'تعذّر قراءة الحالة المحلية',message:'تم استعادة الحالة الافتراضية للمصادر التجريبية.',tone:'warning'});}},[]);
 useEffect(()=>{try{const raw=localStorage.getItem(CREATED_SOURCES_KEY);if(raw)setAddedSources(restoreCreatedSources(JSON.parse(raw)));}catch{setNotice({title:'تعذّر قراءة مصادر العرض المضافة',message:'ستبقى المصادر الافتراضية متاحة. لم تتغير أي بيانات اتصال حقيقية.',tone:'warning'});}},[]);
 const sources=useMemo(()=>[...withLocalFlags(flags),...addedSources],[flags,addedSources]);
 const matches=useMemo(()=>filterSources(sources,filters),[sources,filters]);
 const totalPages=Math.max(1,Math.ceil(matches.length/6));
 const currentPage=Math.min(page,totalPages);
 const visible=matches.slice((currentPage-1)*6,currentPage*6);
 const stats=useMemo(()=>sourceStats(sources),[sources]);
 const selected=sources.find(s=>s.id===selectedId)||null;
 const testing=sources.find(s=>s.id===probeId)||null;
 const confirming=sources.find(s=>s.id===confirmId)||null;
 function updateFilter<K extends keyof SourceFilters>(key:K,value:SourceFilters[K]){setFilters(prev=>({...prev,[key]:value}));setPage(1);}
 function runProbe(source:DataSource){if(!authorized)return;setSelectedId(null);setProbeId(source.id);setProbe(simulateConnectionCheck(source));}
 function persistFlags(next:Record<string,boolean>){
  try{localStorage.setItem(SOURCE_STORAGE_KEY,JSON.stringify(next));setFlags(next);return true;}
  catch{setNotice({title:'تعذّر حفظ التغيير',message:'لم تتغير حالة المصدر. تحقق من إعدادات التخزين في المتصفح.',tone:'danger'});return false;}
 }
 function applyToggle(){const item=confirming;if(!authorized||!item||!canToggleDemoSource(item))return;
  const next={...flags,[item.id]:item.status!=='disabled'};
  if(persistFlags(next)){setConfirmId(null);setNotice({title:'حُفظ تغيير تجريبي',message:`تم ${item.status==='disabled'?'تنشيط':'تعطيل'} المصدر محليًا فقط، دون تغيير إعدادات أي اتصال فعلي.`,tone:'success'});}
 }
 function resetFlags(){if(persistFlags({})){setNotice({title:'استُعيدت الحالة التجريبية',message:'تمت إزالة التغييرات المحلية على حالات المصادر.',tone:'success'});}}
 return <div className="ban bds" dir="rtl" data-testid="data-sources-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.dashboard}>لوحة الإدارة</Link><ChevronLeft size={15}/><span aria-current="page">مصادر البيانات</span></nav>
  <header className="ban-hero bds-hero"><div><span className="ban-eyebrow"><Database size={17}/> الإدارة · UC-05</span><h1>إدارة مصادر البيانات</h1><p>فهرس موحّد للمصادر المؤسسية وحالاتها وتصنيفات الوصول، مع معاينة إعدادات الاتصال وإجراءات تجريبية للمسؤول.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> فصل الصلاحيات</span><span><Server size={14}/> PostgreSQL وERP</span><span><PlugZap size={14}/> اختبار توضيحي</span></div></div><div className="ban-hero-art" aria-hidden="true"><Database size={70}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>بيانات تدريبية بالكامل:</strong> أسماء الخوادم محجوزة للأمثلة، ومؤشرات الاتصال والحالة والأمان ليست نتائج فحص حقيقية. لا تُرسل هذه الصفحة طلبات شبكة ولا تحتفظ بكلمات مرور أو رموز وصول.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> صلاحية إدارة المصادر مرتبطة بمسؤول تقنية المعلومات في هذه المحاكاة.</span><DemoRolePicker id="bds-role-picker"/></div>
  {!authorized?<div className="ban-locked" data-testid="data-sources-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة مصادر البيانات" description="لا يمنح دور مسؤول المنصة تلقائيًا حق إدارة مصادر مؤسسة أخرى. هذا قيد عرض تجريبي؛ الحماية الحقيقية يجب تنفيذها في الخادم."/><Link href={ORGANIZATION_ROUTES.dashboard}>العودة إلى لوحة الإدارة <ArrowLeft size={15}/></Link></div>:<>
   <section className="bds-stats" aria-label="مؤشرات المصادر التجريبية">{[
    {name:'إجمالي المصادر',value:stats.total,icon:<Database/>,help:'مصادر بيانات وهمية'},
    {name:'جاهزة في المحاكاة',value:stats.connected,icon:<CheckCircle2/>,help:'حالة تدريبية لا اتصال حقيقي'},
    {name:'بحاجة مراجعة',value:stats.attention,icon:<Activity/>,help:'لا تمثل أعطالًا حقيقية'},
    {name:'مقيّدة أو محظورة',value:stats.restricted,icon:<ShieldAlert/>,help:'تصنيف أمني توضيحي'}
   ].map(stat=><article className="bds-stat" key={stat.name}><span className="bds-stat-icon">{stat.icon}</span><div><small>{stat.name}</small><strong>{stat.value.toLocaleString('ar-EG')}</strong><p>{stat.help}</p></div></article>)}</section>
   <section className="ban-panel bds-main" aria-labelledby="bds-table-title"><div className="ban-section-header"><div><h2 id="bds-table-title"><Server size={20}/> قائمة مصادر البيانات المؤسسية</h2><p>تعرّف على مصدر البيانات ونوعه وحالة تجهيزه دون عرض بيانات دخول حساسة.</p></div><div className="ban-actions"><Link className="bds-add-link" href={ORGANIZATION_ROUTES.dataSourceNew} data-contract-href="/admin/data-sources/new" title="النموذج التفصيلي للربط ضمن الشاشة التالية"><Plus size={17}/> ربط مصدر جديد</Link><Button size="sm" variant="outline" onClick={resetFlags} leadingIcon={<RefreshCcw size={16}/>}>استعادة الحالات</Button></div></div>
    <div className="bds-filters">
      <label className="bds-search"><span><Search size={15}/> البحث عن مصدر</span><input value={filters.query} onChange={e=>updateFilter('query',e.target.value)} placeholder="اسم المصدر أو الجهة أو رمز المصدر..." aria-label="البحث في مصادر البيانات"/></label>
      <label><span>نوع المصدر</span><select value={filters.type} onChange={e=>updateFilter('type',e.target.value as SourceFilters['type'])}><option value="all">جميع الأنواع</option>{types.map(t=><option key={t} value={t}>{sourceTypeLabels[t]}</option>)}</select></label>
      <label><span>الحالة</span><select value={filters.status} onChange={e=>updateFilter('status',e.target.value as SourceFilters['status'])}><option value="all">جميع الحالات</option>{statuses.map(s=><option key={s} value={s}>{sourceStatusLabels[s]}</option>)}</select></label>
      <label><span>التصنيف</span><select value={filters.classification} onChange={e=>updateFilter('classification',e.target.value as SourceFilters['classification'])}><option value="all">جميع المستويات</option>{classes.map(c=><option key={c} value={c}>{sourceClassLabels[c]}</option>)}</select></label>
    </div>
    <div className="bds-toolbar"><span><SlidersHorizontal size={16}/> {matches.length.toLocaleString('ar-EG')} مصادر مطابقة للبحث</span><div className="bds-toolbar-actions"><label>الترتيب <select value={filters.order} onChange={e=>updateFilter('order',e.target.value as SourceFilters['order'])}><option value="name">الاسم</option><option value="status">الحالة</option></select></label><button type="button" onClick={()=>{setFilters(DEFAULT_FILTERS);setPage(1);}}><FilterX size={16}/> مسح المرشحات</button></div></div>
    {visible.length===0?<div className="bds-empty"><Search size={28}/><strong>لا توجد مصادر مطابقة</strong><span>جرّب كلمات أخرى أو أزل بعض المرشحات.</span><Button variant="outline" size="sm" onClick={()=>{setFilters(DEFAULT_FILTERS);setPage(1);}}>عرض كل المصادر</Button></div>:<div className="bds-table-scroll"><table className="bds-table"><thead><tr><th scope="col">المصدر</th><th scope="col">نوع المصدر</th><th scope="col">الجهة المالكة</th><th scope="col">الحالة التجريبية</th><th scope="col">التصنيف</th><th scope="col">الإجراءات</th></tr></thead><tbody>{visible.map(item=>{const ShapeIcon=shapeIcons[item.type];return <tr key={item.id}><td><div className="bds-source-name"><span className="bds-source-icon"><ShapeIcon size={21}/></span><span><strong>{item.name}</strong><small dir="ltr">{item.id}</small>{item.id.startsWith('SRC-DEMO-')&&<small>محفوظ محليًا فقط</small>}</span></div></td><td>{sourceTypeLabels[item.type]}</td><td>{item.owner}</td><td><SourceStatusTag status={item.status}/></td><td><ClassificationTag level={item.classification}/></td><td><div className="bds-row-actions"><button type="button" onClick={()=>setSelectedId(item.id)} aria-label={`تفاصيل المصدر ${item.name}`} title="تفاصيل سريعة"><Eye size={17}/></button><Link className="bds-details-route" href={buildDataSourceDetailUrl(item.id)} data-contract-href="/admin/data-sources/details?id=" aria-label={`فتح الصفحة الكاملة للمصدر ${item.name}`} title="صفحة المصدر الكاملة"><ExternalLink size={17}/></Link><button type="button" onClick={()=>runProbe(item)} disabled={item.status==='disabled'||item.classification==='blocked'} aria-label={`محاكاة اختبار اتصال ${item.name}`} title="محاكاة اختبار الاتصال"><PlugZap size={17}/></button><button type="button" disabled={!canToggleDemoSource(item)||item.id.startsWith('SRC-DEMO-')} onClick={()=>setConfirmId(item.id)} aria-label={`تغيير الحالة التجريبية ${item.name}`} title="تبديل حالة العرض المحلية"><MoreHorizontal size={17}/></button></div></td></tr>;})}</tbody></table></div>}
    <div className="bds-pagination"><span>الصفحة {currentPage} من {totalPages}</span><div><Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>السابق</Button><Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>التالي</Button></div></div>
   </section>
   <section className="bds-security-grid" aria-label="إرشادات تصنيف مصادر البيانات"><article className="ban-panel"><h2><ShieldCheck size={20}/> تصنيف الوصول</h2><p>العام والمقنّع والمقيّد والمحظور تمثيلات توضيحية لتطبيق مبدأ أقل امتياز. تصنيف مصدر لا يحل محل ضوابط الأعمدة والسجلات في الخادم.</p><div className="bds-level-list">{classes.map(x=><ClassificationTag key={x} level={x}/>)}</div></article><article className="ban-panel"><h2><BookOpenCheck size={20}/> دورة عمل الربط</h2><ol><li>تسجيل بيانات الاتصال عبر API آمن.</li><li>التحقق من الهوية ونطاق المؤسسة.</li><li>اختبار الاتصال من الخادم فقط.</li><li>اعتماد التصنيفات والعروض الذكية ثم تسجيل الأثر في سجل التدقيق.</li></ol><small>المراحل الأربع أعلاه تصور هندسي للربط الفعلي مستقبلًا، وليست عمليات منفذة حاليًا.</small></article></section>
   <footer className="bds-footer"><Info size={18}/><span>المعلومات المموّهة ونتائج المحاكاة لا تؤكد سلامة أي اتصال. عند ربط FastAPI يجب حفظ بيانات الاعتماد في مخزن أسرار آمن، وفرض عزل المؤسسات وRBAC قبل كشف أي بيانات.</span></footer>
  </>}
  <Drawer open={!!selected&&authorized} onClose={()=>setSelectedId(null)} title={selected?.name??'تفاصيل المصدر'} description="معلومات وصفية تدريبية — لا تتضمن بيانات اتصال سرية" footer={selected&&<><Button variant="outline" onClick={()=>setSelectedId(null)}>إغلاق</Button><Button onClick={()=>{if(selected)runProbe(selected);}} disabled={selected.status==='disabled'||selected.classification==='blocked'} leadingIcon={<PlugZap size={15}/>}>محاكاة فحص الاتصال</Button></>}>
   {selected&&<div className="bds-drawer"><p className="bds-detail-note"><Info size={17}/> جميع هذه المعلومات أمثلة تعليمية، وليست نتيجة استعلام من قاعدة بيانات.</p><dl>{[['معرّف المصدر',selected.id],['النوع',sourceTypeLabels[selected.type]],['المؤسسة / المجال',selected.scope],['الجهة المسؤولة',selected.owner],['نقطة الاتصال المعروضة',selected.endpoint],['عدد الجداول أو المجموعات',String(selected.collections)],['آخر تحقق توضيحي',selected.lastCheck]].map(([key,value])=><div key={key}><dt>{key}</dt><dd dir={key==='نقطة الاتصال المعروضة'?'ltr':undefined}>{value}</dd></div>)}</dl><div className="bds-detail-pills"><SourceStatusTag status={selected.status}/><ClassificationTag level={selected.classification}/></div><h3>وصف المصدر</h3><p>{selected.description}</p><div className="bds-sensitive-note"><LockKeyhole size={18}/> لا تُعرض بيانات اعتماد، أو أسماء مستخدمين حقيقية، أو معلومات تعرّف بالمؤسسة.</div></div>}
  </Drawer>
  <Dialog open={!!testing&&authorized} onClose={()=>{setProbeId(null);setProbe(null);}} title="محاكاة اختبار الاتصال" description="لا يتم إجراء أي اتصال شبكة" footer={<Button onClick={()=>{setProbeId(null);setProbe(null);}}>إغلاق</Button>}>
   {testing&&probe&&<div className="bds-probe"><span className="bds-probe-icon"><PlugZap size={24}/></span><strong>{probe.title}</strong><p>{probe.description}</p><p><b>المصدر:</b> {testing.name}</p><div className="bds-probe-warning"><Info size={16}/> الاختبار الحقيقي سيُنفذ عبر Backend بعد المصادقة وتسجيل التدقيق، وليس من المتصفح مباشرة.</div></div>}
  </Dialog>
  <Dialog open={!!confirming&&authorized} onClose={()=>setConfirmId(null)} title="تعديل حالة المصدر التجريبية" description="لا يؤثر على مصدر حقيقي أو اتصال قائم" footer={<><Button variant="outline" onClick={()=>setConfirmId(null)}>إلغاء</Button><Button onClick={applyToggle} variant={confirming?.status==='disabled'?'primary':'danger'}>{confirming?.status==='disabled'?'تنشيط تجريبي':'تعطيل تجريبي'}</Button></>}>
   {confirming&&<p className="bds-confirm">هل تريد {confirming.status==='disabled'?'تنشيط':'تعطيل'} المصدر «{confirming.name}» داخل المتصفح فقط؟ ستبقى المصادر المصنفة «محظور» معطّلة.</p>}
  </Dialog>
  {notice&&<div className="bds-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function DataSourcesScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><SourceBody/></AdminLayout></DemoAccessProvider>;}
