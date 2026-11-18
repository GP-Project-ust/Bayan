import Link from "next/link";
import { ArrowUpLeft, BookOpen, CheckCircle2, LayoutDashboard, LockKeyhole,
  MessageSquareText, Monitor, PanelsTopLeft, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import "./showcase.css";

const layouts = [
  {id:"chat",title:"هيكل المحادثة",desc:"الواجهة العربية للاستعلام والبحث وعرض SQL والمراجع والتقارير.",path:"/",tag:"ChatLayout",preview:"chat",icon:MessageSquareText},
  {id:"admin",title:"هيكل إدارة المؤسسة",desc:"إدارة الحسابات والعروض الذكية وسجل التدقيق ومصادر البيانات.",path:"/admin",tag:"AdminLayout",preview:"admin",icon:LayoutDashboard},
  {id:"platform",title:"هيكل مسؤول المنصة",desc:"إدارة المؤسسات والتهيئة الذكية وحالة الخدمات والنماذج.",path:"/platform/organizations",tag:"PlatformLayout",preview:"platform",icon:ShieldCheck},
  {id:"auth",title:"هيكل تسجيل الدخول",desc:"صفحات مستقلة للمصادقة واستعادة الحساب دون الشريط الجانبي.",path:"/login",tag:"AuthLayout",preview:"auth",icon:LockKeyhole},
];

export default function LayoutsPreviewPage(){
  return <main className="b-layouts" dir="rtl">
    <div className="b-layouts-container">
      <nav className="b-layouts-topbar" aria-label="أقسام نظام التصميم">
        <Link href="/design-system"><Sparkles size={21}/> بيان · نظام التصميم</Link>
        <div><Link href="/design-system/components">المكونات</Link><Link href="/design-system/bayan-components">مكونات بيان المتخصصة</Link><Link href="/screens">خريطة الشاشات</Link><Link href="/">المحادثة الرئيسية</Link></div>
      </nav>
      <header className="b-layouts-hero">
        <div><span className="b-layouts-eyebrow"><PanelsTopLeft size={17}/> المرحلة الثالثة من سبع مراحل</span><h1>هياكل صفحات «بيان»</h1><p>أربع عائلات تخطيط موحدة لجميع الواجهات، مع المحافظة على شريط التنقل والترويسة والألوان وRTL في التصميمين الأصليين. انقر أي بطاقة لمعاينة الشاشة الحقيقية في مشروع Next.js.</p></div>
        <div className="b-layouts-hero-icon"><Monitor size={58}/><span>Layouts v1.0</span></div>
      </header>
      <section className="b-layouts-grid" aria-label="معاينة أنواع التخطيطات">
        {layouts.map(({id,title,desc,path,tag,preview,icon:Icon})=><article className="b-layouts-card" key={id}>
          <div className="b-layouts-preview" aria-hidden="true">
            {preview === "auth" ? <div className="b-layouts-auth-sample"><div className="b-layouts-auth-logo">بيان</div><div/><div/><div/><span/></div> : <>
              <aside><div className="b-layouts-brand">بيان</div><div/><div/><div/><div/></aside>
              <section><div className="b-layouts-mini-header"><span/> <span/></div><div className={`b-layouts-mini-body ${preview}`}><div className="b-layouts-block-header"/><div className="b-layouts-minicards"><i/><i/><i/></div><div className="b-layouts-lines"><i/><i/><i/><i/></div></div></section>
            </>}
          </div>
          <div className="b-layouts-card-heading"><Icon size={22}/><h2>{title}</h2></div>
          <p>{desc}</p><div className="b-layouts-card-footer"><code>{tag}</code><Link href={path}>عرض النموذج <ArrowUpLeft size={16}/></Link></div>
        </article>)}
      </section>
      <section className="b-layouts-notice"><CheckCircle2 size={21}/><div><strong>الحفاظ على التصميم المرجعي</strong><p>ملفات تنسيق الواجهتين الأصلية وصورهما لم تُعدل. جرى توحيد تركيب الشاشة برمجيًا فقط. البيانات المعروضة تجريبية ولا توجد مصادقة حقيقية أو تحكم فعلي بالصلاحيات في هذه النسخة.</p></div></section>
      <section className="b-layouts-footer"><BookOpen size={19}/> المستند التقني: <code>docs/BAYAN_DESIGN_SYSTEM_STAGE_3.md</code> — انتقل منه إلى مخطط الملفات واختبارات القبول.</section>
    </div>
  </main>;
}
