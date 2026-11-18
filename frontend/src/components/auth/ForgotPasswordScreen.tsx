"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpLeft, CheckCircle2, Clock3, GraduationCap,
  Info, KeyRound, LockKeyhole, Mail, MailCheck, ShieldCheck,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { isRecoveryPreviewEnabled, validateRecoveryEmail } from "@/lib/auth/recovery";

type RecoveryState = "form" | "preview-confirmed";

export function ForgotPasswordScreen() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<RecoveryState>("form");
  const previewEnabled = isRecoveryPreviewEnabled();

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailError("");
    setFormError("");
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validateRecoveryEmail(email);
    setEmailError(validation.email ?? "");
    setFormError("");
    if (validation.email) {
      emailRef.current?.focus();
      return;
    }
    if (!previewEnabled) {
      setFormError("خدمة استعادة كلمة المرور غير مربوطة بالخادم بعد. يُرجى التواصل مع مسؤول النظام.");
      return;
    }
    // This is a local interactive preview. No HTTP request, token or email is sent.
    setPending(true);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
      setState("preview-confirmed");
    } finally {
      setPending(false);
    }
  }

  const resetForm = () => {
    setState("form");
    setEmailError("");
    setFormError("");
    setEmail("");
    window.requestAnimationFrame(() => emailRef.current?.focus());
  };

  return (
    <div className="bayan-login-page bayan-recovery-page" dir="rtl">
      <div className="bayan-login-layout">
        <AuthBrandPanel />
        <section className="bayan-login-form-panel" id="main-content" aria-label="استعادة كلمة المرور في نظام بيان">
          <nav className="bayan-login-topnav" aria-label="روابط عامة">
            <Link href="/login" className="bayan-login-back"><ArrowRight size={16} aria-hidden="true"/> العودة لتسجيل الدخول</Link>
            <span className="bayan-login-topnav-divider" aria-hidden="true"/>
            <span className="bayan-login-language">العربية <span aria-hidden="true">AR</span></span>
          </nav>

          <div className="bayan-login-main-center bayan-recovery-center">
            <div className="bayan-login-mobile-brand"><GraduationCap size={22}/><strong>بيان</strong></div>
            <div className="bayan-recovery-symbol" aria-hidden="true"><KeyRound size={28} strokeWidth={1.8}/></div>
            <header className="bayan-login-form-head">
              <span className="bayan-login-section-label"><ShieldCheck size={15}/> استعادة الوصول الآمن</span>
              <h1>{state === "form" ? "نسيت كلمة المرور؟" : "تم تسجيل الطلب التجريبي"}</h1>
              <p>{state === "form"
                ? "أدخل بريدك الإلكتروني المؤسسي. عند تفعيل الخدمة، ستتلقى تعليمات آمنة لإعادة تعيين كلمة المرور."
                : "هذه نتيجة معاينة محلية فقط، ولا تعني إرسال بريد إلكتروني أو إصدار رابط استعادة."}</p>
            </header>

            {state === "form" ? (
              <div className="bayan-login-form-card bayan-recovery-card">
                <div className="bayan-login-form-card-head">
                  <span><Mail size={18} aria-hidden="true"/> طلب استعادة كلمة المرور</span>
                  <span className="bayan-login-card-lock"><LockKeyhole size={16}/></span>
                </div>
                <form onSubmit={onSubmit} noValidate aria-busy={pending}>
                  <Input
                    ref={emailRef}
                    id="bayan-recovery-email"
                    label="البريد الإلكتروني المؤسسي"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@organization.edu"
                    dir="ltr"
                    required
                    value={email}
                    disabled={pending}
                    onChange={(event) => onEmailChange(event.target.value)}
                    error={emailError}
                    startIcon={<Mail size={19}/>} className="bayan-login-field"
                  />
                  <div className="bayan-recovery-hint"><Info size={17} aria-hidden="true"/><span>لخصوصيتك، لا نؤكد ما إذا كان البريد مرتبطًا بحساب في النظام.</span></div>
                  {formError && <div role="alert" className="bayan-login-form-error"><Info size={18} aria-hidden="true"/><span>{formError}</span></div>}
                  <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending} fullWidth className="bayan-login-submit" trailingIcon={pending ? undefined : <ArrowLeft size={20}/>}>{pending ? "جارٍ معالجة طلب التجربة..." : "متابعة طلب الاستعادة"}</Button>
                </form>
                <div className="bayan-login-security-note"><ShieldCheck size={17} aria-hidden="true"/><span>لا تضع كلمة مرور أو معلومات حساسة في هذه الصفحة. الاستعادة الفعلية تتطلب ربط خدمة البريد بالخادم.</span></div>
              </div>
            ) : (
              <div className="bayan-login-form-card bayan-recovery-result" role="status" aria-live="polite">
                <span className="bayan-recovery-success-icon" aria-hidden="true"><CheckCircle2 size={35}/></span>
                <h2>اكتملت محاكاة الطلب</h2>
                <p>تم التحقق من شكل عنوان البريد في المتصفح فقط. <strong>لم نرسل أي رسالة، ولم ننشئ رابطًا لإعادة تعيين كلمة المرور.</strong></p>
                <div className="bayan-recovery-result-note"><Info size={19} aria-hidden="true"/><span>بعد ربط الخدمة الحقيقية، ستظهر رسالة موحدة لجميع الطلبات الصحيحة شكليًا لحماية خصوصية الحسابات.</span></div>
                <div className="bayan-recovery-result-actions">
                  <Link href="/login" className="bayan-recovery-return-link"><ArrowRight size={18} aria-hidden="true"/> العودة لتسجيل الدخول</Link>
                  <button type="button" onClick={resetForm} className="bayan-recovery-retry">إدخال بريد آخر</button>
                </div>
              </div>
            )}

            <div className="bayan-recovery-steps" aria-label="خطوات الاستعادة المستقبلية">
              <div><span><Mail size={17}/></span><strong>إدخال البريد</strong><small>الخطوة 1</small></div>
              <span className="bayan-recovery-step-line" aria-hidden="true"/>
              <div><span><MailCheck size={17}/></span><strong>فحص الرسالة</strong><small>الخطوة 2</small></div>
              <span className="bayan-recovery-step-line" aria-hidden="true"/>
              <div><span><KeyRound size={17}/></span><strong>تعيين كلمة جديدة</strong><small>الخطوة 3</small></div>
            </div>
            <p className="bayan-recovery-preview-warning"><Clock3 size={15} aria-hidden="true"/> <strong>وضع معاينة:</strong> الخطوتان الثانية والثالثة موضحتان للتصميم فقط ولم تُنفّذا بعد.</p>
            <div className="bayan-login-help">هل تذكرت كلمة المرور؟ <Link href="/login">تسجيل الدخول <ArrowLeft size={14}/></Link></div>
          </div>
          <footer className="bayan-login-bottom"><span>استعادة كلمة المرور — بيان</span><span><CheckCircle2 size={15}/> يدعم اللغة العربية وRTL</span></footer>
        </section>
      </div>
    </div>
  );
}
