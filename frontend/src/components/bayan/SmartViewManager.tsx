"use client";

import { useMemo, useState } from "react";
import { Layers3, Plus, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import type { SmartViewData, SmartViewSecurity } from "./types";

export interface SmartViewManagerProps {
  views: SmartViewData[];
  canManage: boolean;
  onCreate?: () => void;
  onSelect?: (view: SmartViewData) => void;
  onToggle?: (view: SmartViewData) => void;
}
const securityArabic:Record<SmartViewSecurity,string>={Public:"عام",Masked:"مقنّع",Restricted:"مقيّد",Blacklist:"محظور"};

export function SmartViewManager({views,canManage,onCreate,onSelect,onToggle}:SmartViewManagerProps) {
  const [search,setSearch]=useState("");
  const [security,setSecurity]=useState<SmartViewSecurity|"all">("all");
  const filtered=useMemo(()=>views.filter(v=>(security==="all"||v.security===security)&&(v.name.includes(search)||v.source.includes(search))),[views,security,search]);
  const columns:Column<SmartViewData>[]=[
    {key:"name",title:"العرض الذكي",render:v=><strong className="bayan-view-name"><Layers3 size={17}/>{v.name}</strong>},
    {key:"source",title:"مصدر البيانات",render:v=>v.source},
    {key:"security",title:"المستوى الأمني",render:v=><Badge tone={v.security==="Blacklist"?"danger":v.security==="Restricted"?"warning":v.security==="Masked"?"info":"success"}>{securityArabic[v.security]}</Badge>},
    {key:"state",title:"الحالة",render:v=><Badge tone={v.state==="active"?"success":"neutral"}>{v.state==="active"?"نشط":"متوقف"}</Badge>},
    {key:"actions",title:"الإجراء",render:v=><div className="bayan-view-actions">{onSelect&&<Button variant="outline" size="sm" onClick={()=>onSelect(v)}>تفاصيل</Button>}{canManage&&onToggle&&<Button variant="ghost" size="sm" onClick={()=>onToggle(v)}>{v.state==="active"?"إيقاف":"تفعيل"}</Button>}</div>}
  ];
  return <section className="bayan-domain bayan-domain-card bayan-smartviews" dir="rtl">
    <div className="bayan-smartviews-head"><div><h3><Layers3 size={22}/> إدارة العروض الذكية</h3><p>فهرس طبقة Smart Views، وتصنيف الوصول إلى البيانات حسب الأدوار.</p></div>{canManage&&onCreate&&<Button onClick={onCreate} leadingIcon={<Plus size={17}/>}>إضافة عرض ذكي</Button>}</div>
    <div className="bayan-smartviews-filter"><label><Search size={17}/><span className="bayan-screen-reader">البحث في العروض الذكية</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم العرض أو المصدر..."/></label><label><span className="bayan-screen-reader">التصنيف الأمني</span><select value={security} onChange={e=>setSecurity(e.target.value as SmartViewSecurity|"all")}><option value="all">جميع المستويات</option><option value="Public">عام</option><option value="Masked">مقنّع</option><option value="Restricted">مقيّد</option><option value="Blacklist">محظور</option></select></label></div>
    <DataTable caption="قائمة العروض الذكية" columns={columns} rows={filtered} rowKey={v=>v.id} emptyMessage="لم يتم العثور على عروض ذكية مطابقة"/>
    <p className="bayan-smartviews-foot">{canManage?<ShieldCheck size={16}/>:<ShieldAlert size={16}/>} {canManage?"عناصر الإدارة تجريبية؛ التعديل الحقيقي يتطلب API وصلاحيات خادم.":"الوضع الحالي للعرض فقط. يجب التحقق من الصلاحيات في Backend."}</p>
  </section>;
}
