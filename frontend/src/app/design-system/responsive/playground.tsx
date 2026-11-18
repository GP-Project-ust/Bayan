"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RotateCcw, Smartphone, Tablet, Monitor } from "lucide-react";

type Device = "mobile" | "tablet" | "desktop";
const sizes: Record<Device, { label: string; width: number; icon: typeof Smartphone }> = {
  mobile: { label: "هاتف · 390px", width: 390, icon: Smartphone },
  tablet: { label: "تابلت · 768px", width: 768, icon: Tablet },
  desktop: { label: "كمبيوتر · 1280px", width: 1280, icon: Monitor },
};
const pages = [
  { label: "المحادثة الرئيسية", url: "/" },
  { label: "لوحة الإدارة", url: "/admin" },
  { label: "المكونات المتخصصة", url: "/design-system/bayan-components" },
  { label: "خريطة الشاشات", url: "/screens" },
];

export function ResponsivePlayground() {
  const [device, setDevice] = useState<Device>("mobile");
  const [page, setPage] = useState(pages[0].url);
  const [refresh, setRefresh] = useState(0);
  const chosen = useMemo(() => pages.find(item => item.url === page) ?? pages[0], [page]);
  const frameWidth = sizes[device].width;
  return <section className="b6-playground" aria-labelledby="b6-playground-title">
    <div className="b6-playground-title"><div><h2 id="b6-playground-title">معاينة الواجهات الحقيقية</h2><p>غيّر الجهاز والصفحة، ثم استخدم عناصر الواجهة داخل الإطار لتجربة سلوكها.</p></div>
      <a className="b6-open" href={page} target="_blank" rel="noreferrer"><ExternalLink size={17}/> فتح بحجم نافذتك</a>
    </div>
    <div className="b6-controls">
      <fieldset className="b6-device-choice"><legend>حجم العرض</legend><div>
        {(Object.entries(sizes) as [Device,typeof sizes[Device]][]).map(([key,item])=>{
          const Icon=item.icon;
          return <button type="button" key={key} aria-pressed={device===key} className={device===key?"selected":""} onClick={()=>setDevice(key)}><Icon size={17}/>{item.label}</button>;
        })}
      </div></fieldset>
      <label className="b6-page-choice">الصفحة المعروضة
        <select value={page} onChange={e=>setPage(e.target.value)}>{pages.map(item=><option value={item.url} key={item.url}>{item.label}</option>)}</select>
      </label>
      <button className="b6-refresh" type="button" onClick={()=>setRefresh(i=>i+1)} aria-label="إعادة تحميل المعاينة"><RotateCcw size={18}/> تحديث المعاينة</button>
    </div>
    <div className="b6-frame-viewport" role="region" aria-label="معاينة قابلة للتمرير أفقيًا عند الحاجة" tabIndex={0}>
      <div className="b6-frame" style={{width:frameWidth}}>
        <div className="b6-frame-bar"><span>{chosen.label}</span><b>{frameWidth} × 800</b><span className="b6-fake-dot" aria-hidden="true"/></div>
        <iframe key={`${page}:${refresh}`} title={`معاينة ${chosen.label} بعرض ${frameWidth} بكسل`}
          src={page} loading="lazy" width={frameWidth} height={800} />
      </div>
    </div>
    <p className="b6-tip">لتجربة فتح القائمة الجانبية: اختر الهاتف أو التابلت، ثم اضغط زر القائمة أعلى يمين الصفحة داخل الإطار. لتقييم التباين والتكبير الحقيقيين، اختبر الصفحات أيضًا في نافذة مستقلة.</p>
  </section>;
}
