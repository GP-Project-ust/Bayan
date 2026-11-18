import Link from "next/link";
import { ArrowRight, CheckCircle2, Keyboard, Laptop, Menu, Palette, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { ResponsivePlayground } from "./playground";
import "./showcase.css";

export const metadata = {
  title: "التجاوب وإمكانية الوصول — بيان | المرحلة السادسة",
  description: "معاينة الواجهات على الهاتف والجهاز اللوحي وسطح المكتب، واختبارات لوحة المفاتيح وRTL",
};

export default function ResponsiveDesignPage() {
  return <main className="b6-page" dir="rtl">
    <div className="b6-container">
      <nav className="b6-header" aria-label="الانتقال بين مراحل التصميم">
        <Link href="/design-system" className="b6-brand"><Palette size={22}/><strong>بيان</strong><span>Design System · 06 / 07</span></Link>
        <Link href="/design-system/states-permissions"><ArrowRight size={17}/> المرحلة الخامسة</Link>
      </nav>
      <section className="b6-hero">
        <div>
          <div className="b6-overline"><Smartphone size={18}/> Responsive & Accessibility</div>
          <h1>التجاوب مع الشاشات <em>وإمكانية الوصول</em></h1>
          <p>معاينة تفاعلية للشاشات المرجعية لنظام «بيان» على أحجام مختلفة، دون تعديل هويتها البصرية الأصلية على سطح المكتب. هذه معاينة واجهة وليست اتصالًا بالخادم.</p>
          <div className="b6-tags"><span><Laptop size={16}/> سطح المكتب</span><span><Tablet size={16}/> الجهاز اللوحي</span><span><Smartphone size={16}/> الهاتف</span><span><Keyboard size={16}/> لوحة المفاتيح</span></div>
        </div>
        <div className="b6-hero-symbol" aria-hidden="true"><Menu size={51}/><span>RTL</span></div>
      </section>
      <ResponsivePlayground />
      <section className="b6-checks" aria-labelledby="b6-checks-title">
        <h2 id="b6-checks-title"><ShieldCheck size={25}/> قائمة المراجعة للمرحلة السادسة</h2>
        <div className="b6-check-grid">
          {[
            ["RTL", "التنقل والأزرار والرسائل بالعربية من اليمين إلى اليسار"],
            ["قائمة متنقلة", "زر فتح وإغلاق مع دعم Escape وحبس التركيز داخل القائمة"],
            ["الجداول", "تمرير أفقي يمكن الوصول إليه بلوحة المفاتيح"],
            ["النوافذ", "التركيز الأولي، وإغلاق Escape، والعودة إلى العنصر السابق"],
            ["وضوح التركيز", "إطار تركيز مرئي للتنقل عبر Tab وShift+Tab"],
            ["تخفيف الحركة", "تقليل الحركات عند تفعيل Reduced Motion"],
            ["شاشات صغيرة", "إعادة توزيع البطاقات والنماذج من دون تمرير أفقي للصفحة"],
            ["التكبير", "اختبار يدوي مطلوب عند تكبير الخط أو الصفحة إلى 200%"],
          ].map(([title,description])=><div key={title} className="b6-check"><CheckCircle2 size={20}/><div><strong>{title}</strong><p>{description}</p></div></div>)}
        </div>
        <p className="b6-manual-note">ملاحظة: هذه القائمة توثق ما جرى تصميمه برمجيًا، وليست شهادة اجتياز WCAG. يلزم اختبار فعلي بالمتصفح وقارئات الشاشة قبل اعتماد الإنتاج.</p>
      </section>
      <footer className="b6-footer"><Link href="/">واجهة المحادثة</Link><Link href="/admin">لوحة الإدارة</Link><Link href="/design-system/components">مكتبة المكونات</Link><Link href="/screens">خريطة الشاشات</Link></footer>
    </div>
  </main>;
}
