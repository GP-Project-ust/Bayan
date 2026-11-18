'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, Check, Clipboard, Home, KeyRound,
  LockKeyhole, ShieldAlert, ShieldCheck,
} from 'lucide-react';
import { StatePanel } from '@/components/states';

const ACCESS_CODE = 'BAYAN-403';

export function ForbiddenScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    const details = [
      'بيان — تعذر الوصول',
      'رمز الحالة: 403 Forbidden',
      `رمز المرجع: ${ACCESS_CODE}`,
      'السبب: لا تتوفر للصلاحية الحالية أذونات كافية لفتح هذا المورد.',
    ].join('\\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.replace('/');
  }

  return (
    <main className="b403-page" dir="rtl">
      <header className="b403-header">
        <Link href="/" className="b403-brand" aria-label="بيان — الصفحة الرئيسية">
          <span className="b403-brand-mark"><ShieldCheck size={25} /></span>
          <span><strong>بيان</strong><small>مساعد مؤسسي عربي ذكي</small></span>
        </Link>
        <span className="b403-header-note"><LockKeyhole size={15}/> بوابة الوصول الآمن</span>
      </header>

      <section className="b403-main" aria-labelledby="b403-title">
        <div className="b403-card">
          <div className="b403-art" aria-hidden="true">
            <div className="b403-art-ring b403-art-ring-one" />
            <div className="b403-art-ring b403-art-ring-two" />
            <div className="b403-lock"><LockKeyhole size={54} strokeWidth={1.65}/></div>
            <span className="b403-art-dot b403-dot-one"/>
            <span className="b403-art-dot b403-dot-two"/>
            <span className="b403-art-dot b403-dot-three"/>
          </div>

          <div className="b403-eyebrow"><ShieldAlert size={15}/> تم إيقاف الوصول إلى هذه الصفحة</div>
          <div className="b403-code" dir="ltr">403 <span>FORBIDDEN</span></div>
          <h1 id="b403-title">عذرًا، ليست لديك صلاحية الوصول</h1>
          <p className="b403-lead">
            حسابك لا يمتلك الأذونات المطلوبة لعرض هذا المحتوى. يمكنك العودة إلى صفحة متاحة،
            أو التواصل مع مسؤول النظام لطلب الصلاحية المناسبة.
          </p>

          <StatePanel
            state="forbidden"
            title="تم رفض طلب الوصول"
            description="لم يتم عرض محتوى الصفحة أو بياناتها. تُراجع صلاحيات الوصول قبل إتاحة أي مورد محمي."
          />

          <div className="b403-reference">
            <div><span>رمز الحالة</span><strong dir="ltr">HTTP 403</strong></div>
            <div><span>رقم المرجع</span><strong dir="ltr">{ACCESS_CODE}</strong></div>
            <button type="button" onClick={copyDetails} className="b403-copy" aria-live="polite">
              {copied ? <Check size={15}/> : <Clipboard size={15}/>}
              {copied ? 'تم النسخ' : 'نسخ التفاصيل'}
            </button>
          </div>

          <div className="b403-actions">
            <button type="button" onClick={goBack} className="b403-primary">
              <ArrowRight size={17}/> العودة للصفحة السابقة
            </button>
            <Link href="/" className="b403-secondary"><Home size={17}/> الصفحة الرئيسية</Link>
          </div>

          <div className="b403-help">
            <span className="b403-help-icon"><KeyRound size={18}/></span>
            <div>
              <strong>تحتاج إلى هذه الصفحة لإتمام عملك؟</strong>
              <p>اطلب من مسؤول المؤسسة مراجعة دورك والأذونات المرتبطة بحسابك.</p>
            </div>
            <Link href="/profile" aria-label="الانتقال إلى الملف الشخصي"><ArrowUpRight size={18}/></Link>
          </div>
        </div>
        <p className="b403-footnote">بيان · الوصول إلى البيانات محكوم بالصلاحيات وسياسات المؤسسة</p>
      </section>
    </main>
  );
}
