"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert,
  Eye, EyeOff, GraduationCap, Info, KeyRound, LockKeyhole, ShieldCheck,
  ShieldX, Sparkles,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import {
  passwordRules, passwordStrength, validateResetForm,
  type ResetFormErrors, type ResetPreviewMode,
} from "@/lib/auth/reset-password";

type UIState = ResetPreviewMode | "completed";

export function ResetPasswordScreen({ initialMode }: { initialMode: ResetPreviewMode }) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UIState>(initialMode);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<ResetFormErrors>({});
  const [pending, setPending] = useState(false);

  // App Router can preserve client state while switching query parameters.
  // Reset the demo form when a new preview-link scenario is selected.
  useEffect(() => {
    setState(initialMode);
    setPassword("");
    setConfirmation("");
    setErrors({});
    setShowPassword(false);
    setShowConfirmation(false);
    setPending(false);
  }, [initialMode]);

  const rules = passwordRules(password);
  const strength = passwordStrength(password);
  const matches = confirmation.length > 0 && confirmation === password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || state !== "form") return;
    const result = validateResetForm(password, confirmation);
    setErrors(result);
    if (result.password || result.confirmPassword) {
      if (result.password) passwordRef.current?.focus();
      else confirmationRef.current?.focus();
      return;
    }
    // No backend call, no token verification and no actual password change.
    setPending(true);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
      setPassword("");
      setConfirmation("");
      setShowPassword(false);
      setShowConfirmation(false);
      setErrors({});
      setState("completed");
    } finally {
      setPending(false);
    }
  }

  const isForm = state === "form";
  const isCompleted = state === "completed";
  const isLinkError = state === "expired" || state === "invalid";

  const title = isForm ? "تعيين كلمة مرور جديدة"
    : isCompleted ? "اكتملت محاكاة التعيين"
    : state === "expired" ? "انتهت صلاحية رابط الاستعادة"
    : state === "invalid" ? "رابط الاستعادة غير صالح"
    : state === "unavailable" ? "التحقق الآمن غير متاح حاليًا"
    : "يلزم رابط لإعادة التعيين";

  const subtitle = isForm
    ? "أنشئ كلمة مرور قوية لحسابك. هذه معاينة محلية لا تغيّر بيانات الدخول الفعلية."
    : isCompleted
    ? "أُكملت تجربة الواجهة بنجاح، دون إرسال كلمة المرور إلى أي خادم أو تحديث حساب."
    : state === "expired"
    ? "هذا نموذج لحالة رابط منتهي الصلاحية؛ اطلب رابطًا جديدًا عبر صفحة الاستعادة."
    : state === "invalid"
    ? "هذا نموذج لحالة رابط غير صحيح أو سبق استخدامه؛ لا يمكن إكمال العملية."
    : state === "unavailable"
    ? "التحقق الحقيقي من رابط الاستعادة وتحديث كلمة المرور يحتاجان إلى Backend آمن."
    : "لا تتوفر معلومات رابط استعادة في هذه الصفحة. يمكنك معاينة التصميم أو طلب الاستعادة.";

  return (
    <div className="bayan-login-page bayan-reset-page" dir="rtl">
      <div className="bayan-login-layout">
        <AuthBrandPanel />
        <section className="bayan-login-form-panel" id="main-content" aria-label="إعادة تعيين كلمة المرور في بيان">
          <nav className="bayan-login-topnav" aria-label="روابط عامة">
            <Link href="/login" className="bayan-login-back"><ArrowRight size={16} aria-hidden="true"/> العودة لتسجيل الدخول</Link>
            <span className="bayan-login-topnav-divider" aria-hidden="true"/>
            <span className="bayan-login-language">العربية <span aria-hidden="true">AR</span></span>
          </nav>

          <div className="bayan-login-main-center bayan-reset-center">
            <div className="bayan-login-mobile-brand"><GraduationCap size={22}/><strong>بيان</strong></div>
            <div className="bayan-recovery-symbol bayan-reset-symbol" aria-hidden="true">
              {isLinkError || state === "unavailable" ? <ShieldX size={29}/> : isCompleted ? <CheckCircle2 size={30}/> : <KeyRound size={29}/>}
            </div>
            <header className="bayan-login-form-head">
              <span className="bayan-login-section-label"><ShieldCheck size={15}/> حماية حسابك في بيان</span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </header>

            {isForm ? (
              <div className="bayan-login-form-card bayan-reset-card">
                <div className="bayan-login-form-card-head">
                  <span><LockKeyhole size={18} aria-hidden="true"/> إنشاء كلمة المرور</span>
                  <span className="bayan-login-card-lock"><ShieldCheck size={16}/></span>
                </div>
                <form onSubmit={submit} noValidate aria-busy={pending}>
                  <div className="bayan-login-password-field bayan-reset-password-field">
                    <Input
                      ref={passwordRef}
                      id="bayan-reset-password"
                      label="كلمة المرور الجديدة"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="أدخل كلمة مرور جديدة"
                      value={password}
                      required
                      disabled={pending}
                      error={errors.password}
                      startIcon={<LockKeyhole size={19}/>}
                      className="bayan-login-field"
                      onChange={(event) => { setPassword(event.target.value); setErrors((prev)=>({...prev,password:undefined})); }}
                    />
                    <button
                      type="button" className="bayan-login-show-password"
                      aria-label={showPassword ? "إخفاء كلمة المرور الجديدة" : "إظهار كلمة المرور الجديدة"}
                      aria-pressed={showPassword}
                      disabled={pending}
                      onClick={()=>setShowPassword((prev)=>!prev)}
                    >{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
                  </div>

                  <div className="bayan-reset-strength" aria-live="polite" aria-atomic="true">
                    <div className="bayan-reset-strength-title"><span>قوة كلمة المرور</span><strong>{strength.label}</strong></div>
                    <div className="bayan-reset-strength-bars" role="meter" aria-label="قوة كلمة المرور" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} aria-valuetext={strength.label}>
                      {[1,2,3,4].map((segment)=><span key={segment} data-active={strength.score>=segment} data-score={strength.score} />)}
                    </div>
                    <ul className="bayan-reset-rules" aria-label="متطلبات كلمة المرور">
                      {rules.map((rule)=><li key={rule.id} data-passed={rule.passed}>
                        {rule.passed ? <Check size={15} aria-hidden="true"/> : <span className="bayan-reset-rule-dot" aria-hidden="true"/>}
                        <span>{rule.label}</span>
                      </li>)}
                    </ul>
                  </div>

                  <div className="bayan-login-password-field bayan-reset-password-field">
                    <Input
                      ref={confirmationRef}
                      id="bayan-reset-confirm"
                      label="تأكيد كلمة المرور الجديدة"
                      type={showConfirmation ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="أعد إدخال كلمة المرور"
                      value={confirmation}
                      required
                      disabled={pending}
                      error={errors.confirmPassword}
                      startIcon={<LockKeyhole size={19}/>}
                      className="bayan-login-field"
                      onChange={(event)=>{setConfirmation(event.target.value);setErrors((prev)=>({...prev,confirmPassword:undefined}));}}
                    />
                    <button type="button" className="bayan-login-show-password"
                      aria-label={showConfirmation ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"}
                      aria-pressed={showConfirmation}
                      disabled={pending}
                      onClick={()=>setShowConfirmation((prev)=>!prev)}>
                      {showConfirmation ? <EyeOff size={19}/> : <Eye size={19}/>}
                    </button>
                  </div>
                  <div className="bayan-reset-match" data-matches={matches} aria-live="polite">
                    {matches ? <CheckCircle2 size={17} aria-hidden="true"/> : <Info size={17} aria-hidden="true"/>}
                    {matches ? "كلمتا المرور متطابقتان" : "يجب أن تتطابق كلمة المرور مع التأكيد"}
                  </div>
                  <div className="bayan-recovery-preview-warning bayan-reset-demo-note">
                    <Info size={16} aria-hidden="true"/><span><strong>وضع المعاينة:</strong> لا تتغير كلمة المرور الحقيقية ولا تُرسَل إلى الخادم.</span>
                  </div>
                  <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending} fullWidth className="bayan-login-submit" trailingIcon={!pending ? <ArrowLeft size={20}/> : undefined}>
                    {pending ? "جارٍ إكمال المعاينة..." : "حفظ كلمة المرور الجديدة — تجربة"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="bayan-login-form-card bayan-reset-result" role="status" aria-live="polite">
                <span className={`bayan-reset-result-icon ${isCompleted ? "bayan-reset-result-icon--success" : ""}`} aria-hidden="true">
                  {isCompleted ? <CheckCircle2 size={38}/> : isLinkError ? <CircleAlert size={38}/> : <LockKeyhole size={38}/>}
                </span>
                <h2>{isCompleted ? "نجحت تجربة تغيير كلمة المرور" : title}</h2>
                <p>{isCompleted
                  ? "تم التحقق من حقول كلمة المرور ومحاكاة عملية الحفظ محليًا فقط. لم تُرسل البيانات ولم تُغيَّر كلمة مرور حسابك."
                  : state === "missing" ? "تحتاج عملية التعيين الحقيقية إلى رابط صادر من الخادم بعد طلب الاستعادة." : subtitle}</p>
                <div className="bayan-recovery-result-actions bayan-reset-result-actions">
                  {isCompleted ? <Link href="/login" className="bayan-recovery-return-link"><ArrowRight size={17}/> العودة لتسجيل الدخول</Link>
                    : <Link href="/forgot-password" className="bayan-recovery-return-link"><ArrowRight size={17}/> طلب استعادة جديد</Link>}
                  {initialMode !== "unavailable" && !isCompleted && <Link href="/reset-password?preview=valid" className="bayan-recovery-retry"><Sparkles size={16}/> تجربة الواجهة</Link>}
                </div>
              </div>
            )}

            <div className="bayan-reset-flow" aria-label="خطوات استعادة الحساب">
              <span><CheckCircle2 size={16}/> طلب الاستعادة</span>
              <span className="bayan-reset-flow-line" aria-hidden="true"/>
              <span><CheckCircle2 size={16}/> مراجعة الرابط</span>
              <span className="bayan-reset-flow-line" aria-hidden="true"/>
              <span className={isForm || isCompleted ? "bayan-reset-flow-current" : ""}><KeyRound size={16}/> تعيين كلمة جديدة</span>
            </div>
            {initialMode !== "unavailable" && (
              <div className="bayan-reset-preview-switches" aria-label="روابط اختبار حالات الاستعادة">
                <span>استعراض الحالات:</span>
                <Link href="/reset-password?preview=valid">رابط صالح للتجربة</Link>
                <Link href="/reset-password?preview=expired">رابط منتهي</Link>
                <Link href="/reset-password?preview=invalid">رابط غير صالح</Link>
              </div>
            )}
            <div className="bayan-login-help">هل تحتاج إلى المساعدة؟ <Link href="/forgot-password">استعادة كلمة المرور <ArrowLeft size={14}/></Link></div>
          </div>
          <footer className="bayan-login-bottom"><span>تعيين كلمة المرور — بيان</span><span><CheckCircle2 size={15}/> نموذج تفاعلي RTL</span></footer>
        </section>
      </div>
    </div>
  );
}
