'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowRight, Check, Clipboard, CloudOff, Home,
  RefreshCw, ShieldCheck, Wifi, WifiOff,
} from 'lucide-react';
import { StatePanel } from '@/components/states';

const INCIDENT_REFERENCE = 'BAYAN-503';

export function UnavailableScreen() {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  function retryConnection() {
    if (retrying) return;
    setRetrying(true);
    router.refresh();
    window.setTimeout(() => setRetrying(false), 1400);
  }

  async function copyDetails() {
    const details = [
      'بيان — الخدمة غير متاحة مؤقتًا',
      'رمز الحالة: HTTP 503',
      `رقم المرجع: ${INCIDENT_REFERENCE}`,
      'الإجراء: أعد المحاولة بعد قليل أو تواصل مع مسؤول النظام.',
    ].join('\\n');
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="b503-page" dir="rtl">
      <header className="b503-header">
        <Link href="/" className="b503-brand" aria-label="بيان — الصفحة الرئيسية">
          <span className="b503-brand-mark"><ShieldCheck size={25}/></span>
          <span><strong>بيان</strong><small>مساعد مؤسسي عربي ذكي</small></span>
        </Link>
        <span className="b503-header-note"><Activity size={15}/> حالة الخدمات</span>
      </header>

      <section className="b503-main" aria-labelledby="b503-title">
        <div className="b503-card">
          <div className="b503-visual" aria-hidden="true">
            <div className="b503-orbit b503-orbit-one"/>
            <div className="b503-orbit b503-orbit-two"/>
            <div className="b503-cloud"><CloudOff size={53} strokeWidth={1.7}/></div>
            <span className="b503-signal b503-signal-one"/>
            <span className="b503-signal b503-signal-two"/>
            <span className="b503-signal b503-signal-three"/>
          </div>

          <div className="b503-eyebrow"><WifiOff size={15}/> انقطاع مؤقت في الخدمة</div>
          <div className="b503-code" dir="ltr">503 <span>SERVICE UNAVAILABLE</span></div>
          <h1 id="b503-title">الخدمة غير متاحة حاليًا</h1>
          <p className="b503-lead">
            نواجه تعذرًا مؤقتًا في الوصول إلى الخدمة المطلوبة. قد يكون السبب صيانة
            أو ضغطًا مؤقتًا على أحد المكونات. لم يتم تأكيد سبب محدد حتى الآن.
          </p>

          <StatePanel
            state="offline"
            title="تعذر الاتصال بالخادم"
            description="تحقق من اتصال الشبكة، ثم أعد المحاولة. إذا استمرت المشكلة، تواصل مع مسؤول النظام."
            onRetry={retryConnection}
            retryLabel={retrying ? 'جارٍ تحديث الصفحة...' : 'إعادة المحاولة'}
          />

          <div className="b503-status">
            <div className="b503-status-icon"><Wifi size={17}/></div>
            <div><strong>حالة الطلب</strong><span>لم يتم تأكيد استعادة الاتصال</span></div>
            <span className="b503-status-pill"><i/> يحتاج إلى إعادة المحاولة</span>
          </div>

          <div className="b503-reference">
            <div><span>رمز الحالة</span><strong dir="ltr">HTTP 503</strong></div>
            <div><span>رقم المرجع</span><strong dir="ltr">{INCIDENT_REFERENCE}</strong></div>
            <button type="button" onClick={copyDetails} className="b503-copy" aria-live="polite">
              {copied ? <Check size={15}/> : <Clipboard size={15}/>}
              {copied ? 'تم النسخ' : 'نسخ التفاصيل'}
            </button>
          </div>

          <div className="b503-actions">
            <button type="button" onClick={retryConnection} className="b503-primary" disabled={retrying}>
              <RefreshCw size={17} className={retrying ? 'b503-spin' : ''}/>
              {retrying ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة الآن'}
            </button>
            <Link href="/" className="b503-secondary"><Home size={17}/> الصفحة الرئيسية</Link>
          </div>

          <div className="b503-help">
            <span className="b503-help-icon"><Activity size={18}/></span>
            <div>
              <strong>هل استمرت المشكلة؟</strong>
              <p>أرسل رقم المرجع إلى مسؤول النظام ليساعد في تتبع البلاغ.</p>
            </div>
            <button type="button" onClick={copyDetails} aria-label="نسخ رقم مرجع المشكلة"><Clipboard size={17}/></button>
          </div>
        </div>
        <p className="b503-footnote">بيان · نعمل على إتاحة الخدمات بصورة مستقرة وآمنة</p>
      </section>
    </main>
  );
}
