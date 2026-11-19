import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, BookOpen, Check, CircleAlert, CircleCheck,
  CodeXml, LayoutDashboard, MessageSquareText, Palette, ShieldCheck, ClipboardCheck, Sparkles,
  Type, Layers3, Database, Download, AlertTriangle, CircleHelp } from "lucide-react";
import { bayanTokens } from "@/lib/bayan-tokens";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import "./style.css";

const colors = [
  {name:"الكحلي الأساسي", color:bayanTokens.brand.navy, usage:"Sidebar / عنوان العلامة"},
  {name:"التركوازي", color:bayanTokens.brand.turquoise, usage:"الإجراء الرئيسي"},
  {name:"خلفية التطبيق", color:bayanTokens.surfaces.app, usage:"خلفية مساحة العمل"},
  {name:"السطح الأبيض", color:bayanTokens.surfaces.card, usage:"البطاقات والنوافذ"},
  {name:"النص الرئيسي", color:bayanTokens.text.primary, usage:"العناوين والمحتوى"},
  {name:"الحدود", color:bayanTokens.border.subtle, usage:"فواصل الواجهة"},
];
const typeScale = [
  {name:"عنوان رئيسي",size:"32px",weight:"700",text:"مرحبًا بك في بيان"},
  {name:"عنوان قسم",size:"24px",weight:"700",text:"إدارة المستخدمين والأدوار"},
  {name:"عنوان فرعي",size:"18px",weight:"600",text:"العروض الذكية النشطة"},
  {name:"نص أساسي",size:"16px",weight:"400",text:"مساعد عربي للاستعلام عن بيانات المؤسسات."},
  {name:"نص مساعد",size:"14px",weight:"400",text:"يظهر هذا النص معلومات توضيحية للمستخدم."},
];

export default function DesignSystemFoundationPage() {
  return <main className="ds-page" dir="rtl">
    <div className="ds-container">
      <nav className="ds-top-nav" aria-label="التنقل بين صفحات البيان">
        <div className="ds-lockup"><div className="ds-logo-mark"><Sparkles size={21}/></div><strong>بيان</strong><span>Design System · الإصدار 1.0</span></div>
        <div className="ds-top-links"><Link href={ORGANIZATION_ROUTES.home}><MessageSquareText size={17}/> المحادثة</Link><Link href={ORGANIZATION_ROUTES.dashboard}><LayoutDashboard size={17}/> لوحة الإدارة</Link><Link href={AUXILIARY_ROUTES.screens}><Layers3 size={17}/> خريطة الشاشات</Link></div>
      </nav>

      <header className="ds-hero">
        <div><div className="ds-eyebrow"><Palette size={16}/> المرحلة الأولى من سبع مراحل</div>
          <h1>أسس النظام البصري لـ <span>بيان</span></h1>
          <p>مرجع حي للألوان والخطوط والمسافات والحدود والظلال. اعتمدنا التصميم السابق كما هو، وفصلنا قواعد الهوية حتى تُستخدم عند بناء الواجهات الجديدة دون تغيير الشاشات القديمة.</p>
          <div className="ds-actions"><Link className="ds-btn ds-primary" href={AUXILIARY_ROUTES.designSystemComponents}><Layers3 size={18}/> مكتبة المكونات الجديدة</Link><Link className="ds-btn ds-secondary" href={AUXILIARY_ROUTES.designSystemLayouts}><LayoutDashboard size={18}/> المرحلة الثالثة: هياكل الصفحات</Link><Link className="ds-btn ds-secondary" href={AUXILIARY_ROUTES.designSystemBayanComponents}><Layers3 size={18}/> المرحلة الرابعة: مكونات بيان</Link><Link className="ds-btn ds-secondary" href={AUXILIARY_ROUTES.designSystemStatesPermissions}><ShieldCheck size={18}/> المرحلة الخامسة: الحالات والصلاحيات</Link><Link className="ds-btn ds-secondary" href={AUXILIARY_ROUTES.designSystemResponsive}><LayoutDashboard size={18}/> المرحلة السادسة: التجاوب</Link><Link className="ds-btn ds-secondary" href={AUXILIARY_ROUTES.designSystemQuality}><ClipboardCheck size={18}/> المرحلة السابعة: الجودة والاختبارات</Link><Link className="ds-btn ds-secondary" href={ORGANIZATION_ROUTES.home}><MessageSquareText size={18}/> معاينة الواجهة الأصلية <ArrowUpLeft size={16}/></Link><Link className="ds-btn ds-secondary" href={ORGANIZATION_ROUTES.dashboard}><LayoutDashboard size={18}/> معاينة لوحة الإدارة</Link></div>
        </div>
        <div className="ds-preview-brand"><div className="ds-preview-logo"><Sparkles size={28}/><span>بيان</span></div><strong>المساعد المؤسسي العربي الذكي</strong><p>عربية أولًا · RTL · تصميم مؤسسي</p><div className="ds-mini-surface"><span/><span/><span/></div></div>
      </header>

      <section className="ds-section" aria-labelledby="ds-colors"><div className="ds-section-head"><div><h2 id="ds-colors"><Palette/> 01 — لوحة الألوان</h2><p>القيم المرجعية للهوية الجديدة، مع الحفاظ على CSS الموجود في الشاشتين السابقتين.</p></div><span className="ds-label">Color Tokens</span></div>
        <div className="ds-color-grid">{colors.map(c=><article className="ds-swatch-card" key={c.name}><div className="ds-swatch" style={{backgroundColor:c.color}}/><div><b>{c.name}</b><code dir="ltr">{c.color}</code></div><small>{c.usage}</small></article>)}</div>
        <div className="ds-feedback-grid"><div><CircleCheck size={19} color="var(--bayan-feedback-success)"/> نجاح <code>#188D57</code></div><div><AlertTriangle size={19} color="var(--bayan-feedback-warning)"/> تحذير <code>#9A6700</code></div><div><CircleAlert size={19} color="var(--bayan-feedback-danger)"/> خطأ <code>#C52B35</code></div><div><CircleHelp size={19} color="var(--bayan-feedback-info)"/> معلومات <code>#2368A2</code></div></div>
      </section>

      <section className="ds-section" aria-labelledby="ds-typography"><div className="ds-section-head"><div><h2 id="ds-typography"><Type/> 02 — الخطوط والتدرج</h2><p>خط Cairo مقترح ومعتمد في لوحة Style Guide؛ تظهر الخطوط البديلة عند عدم توفره على الجهاز.</p></div><span className="ds-label">Typography</span></div>
        <div className="ds-type-list">{typeScale.map(t=><div className="ds-type-row" key={t.name}><div><b>{t.name}</b><code dir="ltr">{t.size} / {t.weight}</code></div><p style={{fontSize:t.size,fontWeight:Number(t.weight)}}>{t.text}</p></div>)}</div>
      </section>

      <div className="ds-two-col">
        <section className="ds-section" aria-labelledby="ds-spacing"><div className="ds-section-head"><h2 id="ds-spacing"><Layers3/> 03 — المسافات</h2><span className="ds-label">Spacing</span></div><p className="ds-section-caption">مضاعفات 4px لضمان انتظام البطاقات والجداول والحقول.</p><div className="ds-spacing-chart">{bayanTokens.spacingPx.map(n=><div className="ds-spacing-row" key={n}><code dir="ltr">{n}px</code><span style={{width:`${n*3.1}px`}}/></div>)}</div></section>
        <section className="ds-section" aria-labelledby="ds-radii"><div className="ds-section-head"><h2 id="ds-radii"><Layers3/> 04 — الزوايا والظلال</h2><span className="ds-label">Shape & Elevation</span></div><p className="ds-section-caption">درجات محددة بدل استعمال مقاسات عشوائية عبر الصفحات.</p><div className="ds-radii-grid"><div className="ds-radius-sample ds-radius-sm">SM / 6px</div><div className="ds-radius-sample ds-radius-md">MD / 10px</div><div className="ds-radius-sample ds-radius-lg">LG / 16px</div><div className="ds-radius-sample ds-radius-xl">XL / 22px</div></div><div className="ds-shadow-card">ظل البطاقة — Shadow MD</div></section>
      </div>

      <section className="ds-section" aria-labelledby="ds-preview"><div className="ds-section-head"><div><h2 id="ds-preview"><CodeXml/> 05 — معاينة أسلوب المكونات</h2><p>معاينات بصرية لتوضيح قواعد المرحلة الأولى. أصبحت المكونات المعاد استخدامها متاحة الآن في صفحة المرحلة الثانية.</p></div><span className="ds-label">Preview only</span></div>
        <div className="ds-samples"><div className="ds-sample"><h3>الأزرار</h3><div className="ds-sample-actions"><Link className="ds-btn ds-primary" href={ORGANIZATION_ROUTES.home}><Check size={17}/> إجراء رئيسي</Link><Link className="ds-btn ds-secondary" href={ORGANIZATION_ROUTES.dashboard}>إجراء ثانوي</Link><button type="button" className="ds-btn ds-disabled" disabled>معطّل</button></div></div>
        <div className="ds-sample"><h3>حقول الإدخال</h3><label className="ds-field">السؤال أو البحث<input type="text" readOnly aria-label="حقل تجريبي" placeholder="اكتب سؤالك هنا..."/></label></div>
        <div className="ds-sample"><h3>بطاقات الحالات</h3><div className="ds-state-row"><span className="ds-state ds-state-success"><CircleCheck size={16}/> ناجح</span><span className="ds-state ds-state-warning"><AlertTriangle size={16}/> قيد الانتظار</span><span className="ds-state ds-state-error"><CircleAlert size={16}/> خطأ</span></div></div>
        <div className="ds-sample"><h3>المراجع وSQL</h3><div className="ds-citation"><BookOpen size={17}/> دليل شؤون الطلاب — ص 8 <small>مثال افتراضي</small></div><pre dir="ltr" className="ds-code">SELECT COUNT(*) FROM students;</pre></div></div>
      </section>

      <section className="ds-section ds-existing" aria-labelledby="ds-existing"><div className="ds-section-head"><div><h2 id="ds-existing"><ShieldCheck/> اعتماد التصميم السابق</h2><p>هذه الصور هي مرجع المطابقة البصرية. لم نغيّر أيًّا من ملفات CSS الأصلية الخاصة بالواجهتين.</p></div></div>
        <div className="ds-reference-grid"><Link href={ORGANIZATION_ROUTES.home}><img src="/design-references/chat-reference.png" alt="المرجع السابق لواجهة محادثة بيان"/><strong>واجهة المحادثة الأصلية <ArrowLeft size={16}/></strong></Link><Link href={ORGANIZATION_ROUTES.dashboard}><img src="/design-references/admin-reference.png" alt="المرجع السابق للوحة إدارة بيان"/><strong>لوحة الإدارة الأصلية <ArrowLeft size={16}/></strong></Link></div>
      </section>
      <footer className="ds-footer"><span>بيان · نظام التصميم · المرحلة 1/7</span><span><Database size={15}/> بيانات وأمثلة تجريبية، ولا توجد اتصالات خلفية في هذه الصفحة.</span></footer>
    </div>
  </main>;
}
