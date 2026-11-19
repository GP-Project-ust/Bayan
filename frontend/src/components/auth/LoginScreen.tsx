"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowUpLeft, BookOpenText, Check, CheckCircle2, ChevronLeft,
  Eye, EyeOff, GraduationCap, LockKeyhole, Mail, MessageCircle, ShieldCheck,
  Sparkles, UserRound, WifiOff,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import {
  DEMO_LOGIN, DEMO_SESSION_KEY, REMEMBERED_EMAIL_KEY,
  isDemoLoginEnabled, matchesDemoLogin, validateLogin,
  type LoginValidationErrors,
} from "@/lib/auth/login";

const PRODUCT_FEATURES = [
  { icon: MessageCircle, title: "اسأل بلغة طبيعية", description: "استعلم عن بيانات المؤسسة بسهولة" },
  { icon: BookOpenText, title: "مصادر موثّقة", description: "اطّلع على المستندات واللوائح المرجعية" },
  { icon: ShieldCheck, title: "وصول حسب الصلاحيات", description: "صلاحيات واضحة ومراجعة للأنشطة" },
];

export function LoginScreen() {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const demoEnabled = isDemoLoginEnabled();

  useEffect(() => {
    // Persist an email address only. Never store or restore passwords.
    try {
      const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (remembered) {
        setEmail(remembered);
        setRememberEmail(true);
      }
    } catch { /* Storage can be disabled by browser policy. */ }
  }, []);

  const setEmailSafely = (value: string) => {
    setEmail(value);
    setErrors((current) => ({ ...current, email: undefined }));
    setFormError("");
  };
  const setPasswordSafely = (value: string) => {
    setPassword(value);
    setErrors((current) => ({ ...current, password: undefined }));
    setFormError("");
  };

  const fillDemo = () => {
    setEmail(DEMO_LOGIN.email);
    setPassword(DEMO_LOGIN.password);
    setErrors({});
    setFormError("");
    emailInputRef.current?.focus();
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validateLogin(email, password);
    setErrors(validation);
    setFormError("");
    if (validation.email || validation.password) {
      if (validation.email) emailInputRef.current?.focus();
      else passwordInputRef.current?.focus();
      return;
    }
    setPending(true);
    // Demo adapter only: deliberately no server call or real authentication.
    try {
      if (!demoEnabled) {
        setFormError("المصادقة الحقيقية غير مربوطة بعد. يلزم إعداد خدمة تسجيل الدخول على الخادم قبل الاستخدام الفعلي.");
        return;
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
      if (!matchesDemoLogin(email, password)) {
        setFormError("بيانات الدخول التجريبية غير صحيحة. استخدم زر «تعبئة بيانات التجربة».");
        return;
      }
      try {
        if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        // This is UI preview state only, and must never be used as an access token.
        sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
          displayName: DEMO_LOGIN.displayName,
          role: "it_admin",
          mode: "preview-only",
          createdAt: new Date().toISOString(),
        }));
      } catch { /* Browser storage is optional for the design demo. */ }
      router.push(ORGANIZATION_ROUTES.dashboard);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bayan-login-page" dir="rtl">
      <div className="bayan-login-layout">
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

        <section className="bayan-login-form-panel" aria-label="الدخول إلى نظام بيان" id="main-content">
          <nav className="bayan-login-topnav" aria-label="روابط عامة">
            <Link href={ORGANIZATION_ROUTES.home} className="bayan-login-back"><ArrowUpLeft size={16} aria-hidden="true"/> العودة للواجهة الرئيسية</Link>
            <span className="bayan-login-topnav-divider" aria-hidden="true"/>
            <span className="bayan-login-language">العربية <span aria-hidden="true">AR</span></span>
          </nav>
          <div className="bayan-login-main-center">
            <div className="bayan-login-mobile-brand"><GraduationCap size={22}/><strong>بيان</strong></div>
            <div className="bayan-login-form-head">
              <span className="bayan-login-section-label"><LockKeyhole size={15}/> بوابة الدخول</span>
              <h1>مرحبًا بعودتك <span aria-hidden="true">👋</span></h1>
              <p>سجّل الدخول للوصول إلى خدمات نظام بيان وبيانات مؤسستك.</p>
            </div>

            <div className="bayan-login-form-card">
              <div className="bayan-login-form-card-head"><span><ShieldCheck size={18} aria-hidden="true"/> تسجيل الدخول إلى بيان</span><span className="bayan-login-card-lock"><LockKeyhole size={16}/></span></div>
              <form onSubmit={onSubmit} noValidate aria-busy={pending}>
                <Input
                  ref={emailInputRef}
                  label="البريد الإلكتروني"
                  id="bayan-login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="name@organization.edu"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmailSafely(e.target.value)}
                  error={errors.email}
                  startIcon={<Mail size={19}/>}
                  className="bayan-login-field"
                />
                <div className="bayan-login-password-field">
                  <Input
                    ref={passwordInputRef}
                    label="كلمة المرور"
                    id="bayan-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="أدخل كلمة المرور"
                    required
                    value={password}
                    onChange={(e) => setPasswordSafely(e.target.value)}
                    error={errors.password}
                    startIcon={<LockKeyhole size={19}/>}
                    className="bayan-login-field"
                  />
                  <button className="bayan-login-show-password" type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword} onClick={()=>setShowPassword((value)=>!value)}>
                    {showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}
                  </button>
                </div>
                <div className="bayan-login-form-options">
                  <label className="bayan-login-remember"><input type="checkbox" checked={rememberEmail} onChange={(e)=>setRememberEmail(e.target.checked)}/><span>تذكّر البريد الإلكتروني</span></label>
                  <Link href={ORGANIZATION_ROUTES.forgotPassword}>نسيت كلمة المرور؟</Link>
                </div>
                {formError && <div className="bayan-login-form-error" role="alert"><WifiOff size={18} aria-hidden="true"/><span>{formError}</span></div>}
                <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending} fullWidth className="bayan-login-submit" trailingIcon={!pending ? <ArrowLeft size={20}/> : undefined}>
                  {pending ? "جارٍ التحقق..." : "تسجيل الدخول"}
                </Button>
              </form>
              <div className="bayan-login-security-note"><ShieldCheck size={17} aria-hidden="true"/><span>لن تُحفظ كلمة المرور في المتصفح. الوصول الحقيقي يتطلب مصادقة الخادم وصلاحياته.</span></div>
            </div>

            <section className="bayan-login-demo" aria-label="بيانات الدخول التجريبي">
              <div className="bayan-login-demo-header"><span className="bayan-login-demo-icon"><UserRound size={18}/></span><strong>وضع العرض التجريبي</strong><span className="bayan-login-demo-pill">للتجربة فقط</span></div>
              <p>{demoEnabled ? "يمكنك اختبار واجهة تسجيل الدخول بحساب نموذجي دون الاتصال بالخادم." : "الدخول التجريبي معطّل في نسخة الإنتاج. لا توجد مصادقة متصلة حاليًا."}</p>
              {demoEnabled && <div className="bayan-login-demo-details"><div><small>البريد التجريبي</small><code>{DEMO_LOGIN.email}</code></div><div><small>كلمة المرور التجريبية</small><code>{DEMO_LOGIN.password}</code></div><button type="button" onClick={fillDemo} className="bayan-login-demo-fill">تعبئة بيانات التجربة <ChevronLeft size={17}/></button></div>}
            </section>
            <div className="bayan-login-help">هل تحتاج إلى مساعدة؟ <Link href={AUXILIARY_ROUTES.screens}>استعراض شاشات النظام <ArrowLeft size={14}/></Link></div>
          </div>
          <footer className="bayan-login-bottom"><span>واجهة تسجيل الدخول — بيان</span><span><CheckCircle2 size={15}/> يدعم اللغة العربية وRTL</span></footer>
        </section>
      </div>
    </div>
  );
}
