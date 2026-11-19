import Link from "next/link";
import { BookOpenText, Check, GraduationCap, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { ORGANIZATION_ROUTES } from "@/lib/routes";

/** Reuses the exact branded structure/classes of the approved login screen. */
const PRODUCT_FEATURES = [
  { icon: MessageCircle, title: "اسأل بلغة طبيعية", description: "استعلم عن بيانات المؤسسة بسهولة" },
  { icon: BookOpenText, title: "مصادر موثّقة", description: "اطّلع على المستندات واللوائح المرجعية" },
  { icon: ShieldCheck, title: "وصول حسب الصلاحيات", description: "صلاحيات واضحة ومراجعة للأنشطة" },
];

export function AuthBrandPanel() {
  return (
    <aside className="bayan-login-brand-panel" aria-label="التعريف بنظام بيان">
      <div className="bayan-login-brand-top">
        <Link href={ORGANIZATION_ROUTES.home} className="bayan-login-logo" aria-label="بيان — الصفحة الرئيسية">
          <span className="bayan-login-logo-mark" aria-hidden="true"><GraduationCap size={32} strokeWidth={1.9}/><BookOpenText size={24}/></span>
          <span className="bayan-login-logo-title">بيان</span>
        </Link>
        <span className="bayan-login-logo-subtitle">المساعد المؤسسي العربي الذكي</span>
      </div>
      <div className="bayan-login-intro">
        <div className="bayan-login-eyebrow"><Sparkles size={16}/> منصة ذكية لإدارة المعرفة والبيانات</div>
        <h2>معرفة مؤسستك،<br/><em>في متناول سؤالك.</em></h2>
        <p>استعلم عن البيانات، وابحث في المستندات، واستخرج التقارير من واجهة عربية واضحة وسهلة الاستخدام.</p>
        <div className="bayan-login-illustration" role="img" aria-label="رسم توضيحي لمبنى جامعة"/>
      </div>
      <div className="bayan-login-benefits">
        {PRODUCT_FEATURES.map((item) => {
          const Icon = item.icon;
          return <div className="bayan-login-benefit" key={item.title}>
            <span className="bayan-login-benefit-icon"><Icon size={19} strokeWidth={1.9}/></span>
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
            <Check size={15} className="bayan-login-benefit-check" aria-hidden="true"/>
          </div>;
        })}
      </div>
      <div className="bayan-login-brand-footer"><span>بيان © 2026</span><span>تصميم أولي ضمن مشروع التخرج</span></div>
    </aside>
  );
}
