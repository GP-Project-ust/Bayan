'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import catalogData from '@/lib/screen-catalog.json';
import { ORGANIZATION_ROUTES } from '@/lib/routes';
import {
  Activity, ArrowUpLeft, CheckCircle2, ChevronDown, CircleDot,
  ExternalLink, Filter, LayoutGrid, List, Search, ShieldCheck, X,
} from 'lucide-react';

type ScreenItem = {
  path: string;
  title: string;
  group: string;
  kind: string;
  description: string;
  roles: string[];
  priority: string;
  requirements?: string;
};
const screens = catalogData as ScreenItem[];
const groups = ['الكل', ...Array.from(new Set(screens.map(item => item.group)))];
const roles = ['كل الأدوار', ...Array.from(new Set(screens.flatMap(item => item.roles)))];

const groupIcons: Record<string, string> = {
  'المحادثات': '💬', 'الوثائق': '📚', 'التقارير': '📊', 'التحليلات': '📈',
  'الإدارة': '⚙️', 'المنصة': '🏢', 'الحساب': '👤',
};

export function ScreensCatalog() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('الكل');
  const [role, setRole] = useState('كل الأدوار');
  const [priority, setPriority] = useState('الكل');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ar');
    return screens.filter(item => {
      const searchable = [item.title, item.path, item.group, item.description, ...(item.roles || [])].join(' ').toLocaleLowerCase('ar');
      return (!q || searchable.includes(q))
        && (group === 'الكل' || item.group === group)
        && (role === 'كل الأدوار' || item.roles?.includes(role))
        && (priority === 'الكل' || item.priority === priority);
    });
  }, [query, group, role, priority]);

  const counts = useMemo(() => ({
    total: screens.length,
    groups: new Set(screens.map(s => s.group)).size,
    p0: screens.filter(s => s.priority === 'P0').length,
  }), []);

  function clearFilters() {
    setQuery(''); setGroup('الكل'); setRole('كل الأدوار'); setPriority('الكل');
  }

  return (
    <main className="sc-page" dir="rtl">
      <header className="sc-header">
        <Link href={ORGANIZATION_ROUTES.home} className="sc-brand" aria-label="بيان — الرئيسية">
          <span className="sc-brand-mark"><ShieldCheck size={24} /></span>
          <span><strong>بيان</strong><small>خريطة النظام</small></span>
        </Link>
        <div className="sc-header-actions">
          <span className="sc-secure"><Activity size={14} /> فهرس الواجهات</span>
          <Link href={ORGANIZATION_ROUTES.home} className="sc-home-link">الرئيسية <ArrowUpLeft size={15} /></Link>
        </div>
      </header>

      <section className="sc-container">
        <div className="sc-intro">
          <div>
            <div className="sc-kicker"><LayoutGrid size={15} /> دليل التنقل المؤسسي</div>
            <h1>خريطة واجهات بيان</h1>
            <p>استعرض شاشات النظام، وابحث حسب الاسم أو المسار أو القسم، ثم انتقل مباشرة إلى الواجهة المطلوبة.</p>
          </div>
          <div className="sc-intro-mark" aria-hidden="true"><LayoutGrid size={38} /><span>42</span></div>
        </div>

        <div className="sc-stats">
          <div className="sc-stat"><span>إجمالي الشاشات</span><strong>{counts.total}</strong><small>ضمن كتالوج النظام</small></div>
          <div className="sc-stat"><span>الأقسام</span><strong>{counts.groups}</strong><small>مجموعات وظيفية</small></div>
          <div className="sc-stat"><span>أولوية قصوى</span><strong>{counts.p0}</strong><small>تصنيف P0</small></div>
          <div className="sc-stat"><span>نتائج العرض</span><strong>{filtered.length}</strong><small>حسب عوامل التصفية</small></div>
        </div>

        <section className="sc-panel" aria-label="البحث والتصفية">
          <div className="sc-toolbar">
            <label className="sc-search">
              <Search size={18} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن شاشة أو مسار أو وظيفة..." aria-label="البحث في الشاشات" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15} /></button>}
            </label>
            <button type="button" className={`sc-filter-toggle ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(v => !v)}>
              <Filter size={16} /> التصفية <ChevronDown size={15} />
            </button>
            <div className="sc-view-toggle" aria-label="طريقة عرض النتائج">
              <button type="button" className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="عرض شبكي"><LayoutGrid size={17} /></button>
              <button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="عرض قائمة"><List size={18} /></button>
            </div>
          </div>

          <div className={`sc-filters ${filtersOpen ? 'is-open' : ''}`}>
            <label>القسم
              <select value={group} onChange={e => setGroup(e.target.value)}>{groups.map(g => <option key={g}>{g}</option>)}</select>
            </label>
            <label>الدور
              <select value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r}>{r}</option>)}</select>
            </label>
            <label>الأولوية
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="الكل">كل الأولويات</option><option value="P0">P0 — قصوى</option><option value="P1">P1 — عالية</option><option value="P2">P2 — عادية</option>
              </select>
            </label>
            <button type="button" className="sc-clear" onClick={clearFilters}>مسح عوامل التصفية</button>
          </div>

          <div className="sc-results-head">
            <div><strong>{filtered.length}</strong> شاشة <span>مطابقة لمعايير البحث</span></div>
            <span className="sc-results-hint"><CircleDot size={13} /> اختر أي بطاقة لفتح الشاشة</span>
          </div>

          {filtered.length ? (
            <div className={view === 'grid' ? 'sc-grid' : 'sc-list'}>
              {filtered.map((item, index) => (
                <article className="sc-item" key={item.path}>
                  <div className="sc-item-top">
                    <span className="sc-item-icon">{groupIcons[item.group] || '◈'}</span>
                    <span className={`sc-priority ${item.priority?.toLowerCase() || 'p2'}`}>{item.priority || '—'}</span>
                  </div>
                  <div className="sc-item-body">
                    <div className="sc-item-group">{item.group}</div>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <code dir="ltr">{item.path}</code>
                  </div>
                  <div className="sc-item-bottom">
                    <span className="sc-roles"><ShieldCheck size={13} />{item.roles?.length || 0} أدوار</span>
                    <Link href={item.path} className="sc-open">فتح الشاشة <ExternalLink size={14} /></Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sc-empty">
              <Search size={30} />
              <strong>لا توجد شاشات مطابقة</strong>
              <p>جرّب تغيير عبارة البحث أو عوامل التصفية.</p>
              <button type="button" onClick={clearFilters}>عرض جميع الشاشات</button>
            </div>
          )}
        </section>
        <footer className="sc-footer"><span>بيان · خريطة الواجهات</span><span><CheckCircle2 size={14} /> البيانات مستمدة من كتالوج النظام</span></footer>
      </section>
    </main>
  );
}
