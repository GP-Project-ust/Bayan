'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRightLeft, BookOpen, Check, CheckCircle2, ChevronLeft, ClipboardCheck,
  FileQuestion, History, Info, KeyRound, LockKeyhole, Plus, RefreshCcw, Search, Shield,
  ShieldCheck, ShieldX, Users, UsersRound, X, Layers, FileText, Sparkles, Pencil, Trash2, Building2
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { Badge, Button, Dialog, Drawer, Toast } from '@/components/ui';
import { StatePanel } from '@/components/states';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { capabilities, capabilityLabels, roleIds, roleMeta, rolePermissions, type RoleId, type Capability } from '@/lib/access/policy';
import { DEMO_USERS, restoreUserFixtures } from '@/lib/user-management/users';
import {
  ROLE_REVIEW_STORAGE_KEY, compareRoles, createReviewRequest, grantedFor, institutionRoles,
  permissionSections, restoreReviewRequests, roleScope, validateReviewDraft,
  type ReviewAction, type ReviewDraft, type ReviewRequest
} from '@/lib/access/role-review';
import {
  PermissionMatrix
} from '@/components/access/PermissionMatrix';
import {
 getCustomRoles,
 createCustomRole,
 updateCustomRole,
 deleteCustomRole,
 getPermissionGroups,
 createPermissionGroup,
 updatePermissionGroup,
 deletePermissionGroup,
 ORGANIZATION_PERMISSION_GROUPS,
 PLATFORM_PERMISSION_GROUPS,
 type CustomRole,
 type PermissionGroup,
 type Scope,
 getAuditLog,
 type AuditLogEntry,
 RBAC_STATE_CHANGE_EVENT
} from '@/lib/access/enterprise-rbac';

const USER_STORAGE_KEY = 'bayan.demo.users.v1';
type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
type MainView = 'matrix' | 'engine' | 'custom_roles' | 'groups' | 'audit';

function RolesBody() {
  const { can, role: actor } = useDemoAccess();
  const authorized = can('roles.manage');
  const [mainView, setMainView] = useState<MainView>('matrix');
  const [selected, setSelected] = useState<RoleId>('it_admin');
  const [compare, setCompare] = useState<RoleId>('manager');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [details, setDetails] = useState<RoleId | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState<ReviewDraft>({ role: 'employee', capability: 'reports.export', action: 'grant', reason: '' });
  const [issue, setIssue] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [users, setUsers] = useState(DEMO_USERS);

  // Custom roles state
  const [customRolesList, setCustomRolesList] = useState<CustomRole[]>([]);
  const [newRoleModalOpen, setNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleBase, setNewRoleBase] = useState<RoleId>('employee');
  const [newRoleCaps, setNewRoleCaps] = useState<Capability[]>(['chat.ask', 'documents.search']);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  // Edit custom role state
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

 // Permission groups state
 const [groupsList, setGroupsList] = useState<PermissionGroup[]>([]);
 const [groupScopeFilter, setGroupScopeFilter] = useState<'all' | 'organization' | 'platform'>('organization');
 const [groupModalOpen, setGroupModalOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
 const [groupDraftTitle, setGroupDraftTitle] = useState('');
 const [groupDraftDesc, setGroupDraftDesc] = useState('');
 const [groupDraftScope, setGroupDraftScope] = useState<Scope>('organization');
 const [groupDraftCaps, setGroupDraftCaps] = useState<Capability[]>([]);
 const [groupModalError, setGroupModalError] = useState<string | null>(null);
 const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // RBAC Audit Trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
   setGroupsList(getPermissionGroups());

   const handleRbacChange = () => {
     setCustomRolesList(getCustomRoles());
     setAuditLogs(getAuditLog());
     setGroupsList(getPermissionGroups());
   };
   window.addEventListener(RBAC_STATE_CHANGE_EVENT, handleRbacChange);
   return () => window.removeEventListener(RBAC_STATE_CHANGE_EVENT, handleRbacChange);
 },[]);

    const handleRbacChange = () => {
      setCustomRolesList(getCustomRoles());
      setAuditLogs(getAuditLog());
    };
    window.addEventListener(RBAC_STATE_CHANGE_EVENT, handleRbacChange);
    return () => window.removeEventListener(RBAC_STATE_CHANGE_EVENT, handleRbacChange);
  }, []);

  const totals = useMemo(() => roleIds.map(role => ({ role, count: role === 'platform_admin' ? 0 : users.filter(x => x.role === role && x.status === 'active').length })), [users]);
  const comparison = useMemo(() => compareRoles(compare, selected), [compare, selected]);
  const filtered = useMemo(() => permissionSections.filter(group => scope === 'all' || group.id === scope).map(group => ({
    ...group, capabilities: group.capabilities.filter(cap => {
      const normalized = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064b-\u065f]/g, '').trim();
      return !query.trim() || normalized(`${capabilityLabels[cap]} ${cap}`).includes(normalized(query));
    })
  })).filter(group => group.capabilities.length > 0), [scope, query]);
  const isEditable = institutionRoles.includes(selected as typeof institutionRoles[number]);

  function persist(next: ReviewRequest[]): boolean {
    try { localStorage.setItem(ROLE_REVIEW_STORAGE_KEY, JSON.stringify(next)); setRequests(next); return true; }
    catch { setNotice({ title: 'تعذّر الحفظ المحلي', message: 'لم تُسجل مسودة المراجعة. تحقّق من إعدادات تخزين المتصفح.', tone: 'danger' }); return false; }
  }

  function submitReview() {
    if (!authorized) return;
    const error = validateReviewDraft(request); setIssue(error); if (error) return;
    const result = createReviewRequest(requests, request);
    if (!result.ok) { setIssue(result.error); return; }
    if (!persist(result.items)) return;
    setRequestOpen(false); setIssue(null);
    setNotice({ title: 'حُفظ طلب مراجعة تجريبي', message: 'المسودة محلية ولم تُرسل إلى إدارة المنصة أو تغيّر أي صلاحية.', tone: 'success' });
  }

  function openNewReview() {
    if (!authorized || !isEditable) return;
    const first = capabilities.find(x => !grantedFor(selected, x) && x !== 'onboarding.run' && x !== 'platform.manage') ?? 'chat.ask';
    setRequest({ role: selected, capability: first, action: 'grant', reason: '' }); setIssue(null); setRequestOpen(true);
  }

  function removeRequest(id: string) {
    const next = requests.filter(x => x.id !== id);
    if (persist(next)) setNotice({ title: 'حُذفت المسودة', message: 'هذا حذف لطلب محلي فقط.', tone: 'info' });
  }

  function reset() { if (persist([])) { setConfirmReset(false); setNotice({ title: 'تم مسح طلبات المراجعة', message: 'لم تتغير أدوار النظام أو الصلاحيات.', tone: 'success' }); } }

  function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) { setRoleModalError('يرجى إدخال اسم الدور بالعربية.'); return; }
    const res = createCustomRole({
      tenantId: 'demo-institution',
      nameCode: newRoleName.trim().toLowerCase().replace(/\s+/g, '_'),
      nameAr: newRoleName.trim(),
      descriptionAr: newRoleDesc.trim(),
      scope: 'organization',
      isSystemRole: false,
      baseRole: newRoleBase,
      capabilities: newRoleCaps
    }, { id: 'USR-003', name: 'م. أحمد الشامي', role: actor });

    if (res.ok) {
      setCustomRolesList(getCustomRoles());
      setNewRoleModalOpen(false);
      setNewRoleName(''); setNewRoleDesc('');
      setNotice({ title: 'تم إنشاء الدور المخصص بنجاح', message: `تم تسجيل الدور «${newRoleName}» وتخزينه في محرك الصلاحيات.`, tone: 'success' });
    } else {
      setRoleModalError(res.error || 'تعذر إنشاء الدور.');
    }
  }

  function handleUpdateRole(e: FormEvent) {
    e.preventDefault();
    if (!editingRole) return;
    const res = updateCustomRole(editingRole.id, {
      nameAr: editingRole.nameAr,
      descriptionAr: editingRole.descriptionAr,
      capabilities: editingRole.capabilities
    }, { id: 'USR-003', name: 'م. أحمد الشامي', role: actor });

    if (res.ok) {
      setCustomRolesList(getCustomRoles());
      setEditingRole(null);
      setNotice({ title: 'تم تحديث الدور المخصص', message: `تم تعديل صلاحيات «${editingRole.nameAr}» وحفظها.`, tone: 'success' });
    }
  }

 function openNewGroupModal(){
  setEditingGroup(null);
  setGroupDraftTitle('');
  setGroupDraftDesc('');
  setGroupDraftScope('organization');
  setGroupDraftCaps(['reports.view', 'reports.export']);
  setGroupModalError(null);
  setGroupModalOpen(true);
 }

 function openEditGroupModal(g:PermissionGroup){
  setEditingGroup(g);
  setGroupDraftTitle(g.titleAr);
  setGroupDraftDesc(g.descriptionAr);
  setGroupDraftScope(g.scope);
  setGroupDraftCaps([...g.capabilities]);
  setGroupModalError(null);
  setGroupModalOpen(true);
 }

 function toggleGroupCapability(cap:Capability){
  setGroupDraftCaps(prev=>prev.includes(cap)?prev.filter(c=>c!==cap):[...prev,cap]);
 }

 function handleSaveGroup(e?:FormEvent){
  if(e)e.preventDefault();
  if(!groupDraftTitle.trim()){setGroupModalError('يرجى إدخال اسم مجموعة الصلاحيات.');return;}
  if(groupDraftCaps.length===0){setGroupModalError('يجب اختيار صلاحية واحدة على الأقل في المجموعة.');return;}
  const actorInfo={id:'USR-003',name:'م. أحمد الشامي',role:actor};
  if(editingGroup){
    const res=updatePermissionGroup(editingGroup.id,{
      titleAr:groupDraftTitle.trim(),
      descriptionAr:groupDraftDesc.trim(),
      capabilities:groupDraftCaps
    },actorInfo);
    if(!res.ok){setGroupModalError(res.error||'فشل تحديث المجموعة.');return;}
    setNotice({title:'تم التحديث بنجاح',message:`تم تحديث حزمة الصلاحيات «${groupDraftTitle}».`,tone:'success'});
  } else {
    const res=createPermissionGroup({
      titleAr:groupDraftTitle.trim(),
      descriptionAr:groupDraftDesc.trim(),
      scope:groupDraftScope,
      capabilities:groupDraftCaps
    },actorInfo);
    if(!res.ok){setGroupModalError(res.error||'فشل إنشاء المجموعة.');return;}
    setNotice({title:'تم إنشاء الحزمة',message:`تمت إضافة حزمة الصلاحيات «${groupDraftTitle}» بنجاح.`,tone:'success'});
  }
  setGroupModalOpen(false);
  setGroupsList(getPermissionGroups());
 }

 function handleDeleteGroup(){
  if(!deletingGroupId)return;
  const actorInfo={id:'USR-003',name:'م. أحمد الشامي',role:actor};
  const res=deletePermissionGroup(deletingGroupId,actorInfo);
  if(!res.ok){setNotice({title:'تعذر الحذف',message:res.error||'فشل حذف المجموعة.',tone:'danger'});}
  else{setNotice({title:'تم الحذف',message:'تم حذف حزمة الصلاحيات المخصصة بنجاح.',tone:'success'});}
  setDeletingGroupId(null);
  setGroupsList(getPermissionGroups());
 }

  return <div className="ban brp" dir="rtl" data-testid="roles-permissions-screen">
    <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15} /><Link href="/admin/users">إدارة المستخدمين</Link><ChevronLeft size={15} /><span aria-current="page">الأدوار والصلاحيات</span></nav>
    <header className="ban-hero brp-hero"><div><span className="ban-eyebrow"><ShieldCheck size={17} /> الإدارة · UC-04</span><h1>إدارة الأدوار والصلاحيات</h1><p>مراجعة الأدوار الأربعة ومصفوفة الوصول ومقارنة الامتيازات ومحرك الصلاحيات المرن للمؤسسة.</p><div className="ban-hero-tags"><span><LockKeyhole size={14} /> مبدأ أقل امتياز</span><span><Shield size={14} /> فصل المنصة عن المؤسسة</span><span><ClipboardCheck size={14} /> مراجعة الصلاحيات</span></div></div><div className="ban-hero-art" aria-hidden="true"><ShieldCheck size={66} /><i /></div></header>
    <div className="ban-disclaimer" role="note"><Info size={18} /><span><strong>معاينة تجريبية تفاعلية:</strong> الأدوار والحقوق تعمل محلياً وفق محرك التقييم القطعي المعتمد في الوثيقة المعمارية، مع حفظ التعديلات وسجل التدقيق في هذا المتصفح.</span></div>
    <div className="ban-role"><span><Users size={17} /> اختيار دور العرض يغير محاكاة الصلاحيات والتنقل فورياً.</span><DemoRolePicker id="brp-demo-role-picker" /></div>
    {!authorized ? <div className="ban-locked" data-testid="roles-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة الأدوار المؤسسية" description={`الدور الحالي: ${roleMeta[actor].label}. هذه الصفحة مخصصة لمسؤول تقنية المعلومات في المعاينة؛ مسؤول المنصة لا يرث صلاحية إدارة بيانات المؤسسة.`} /><Link href="/admin/users">العودة إلى إدارة المستخدمين <ArrowLeft size={15} /></Link></div> : <>

      {/* View Navigation Tabs */}
      <div className="brp-view-tabs" style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0 1.5rem', borderBottom: '1px solid var(--bayan-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <Button size="sm" variant={mainView === 'matrix' ? 'primary' : 'outline'} onClick={() => setMainView('matrix')} leadingIcon={<Layers size={16} />}>الأدوار ومصفوفة المقارنة</Button>
        <Button size="sm" variant={mainView === 'engine' ? 'primary' : 'outline'} onClick={() => setMainView('engine')} leadingIcon={<ShieldCheck size={16} />}>محرك الصلاحيات والاستثناءات التفاعلي</Button>
        <Button size="sm" variant={mainView === 'custom_roles' ? 'primary' : 'outline'} onClick={() => setMainView('custom_roles')} leadingIcon={<UsersRound size={16} />}>الأدوار المؤسسية المخصصة ({customRolesList.length})</Button>
        <Button size="sm" variant={mainView === 'groups' ? 'primary' : 'outline'} onClick={() => setMainView('groups')} leadingIcon={<Building2 size={16} />}>مجموعات الصلاحيات ({ORGANIZATION_PERMISSION_GROUPS.length})</Button>
        <Button size="sm" variant={mainView === 'audit' ? 'primary' : 'outline'} onClick={() => setMainView('audit')} leadingIcon={<History size={16} />}>سجل تدقيق الصلاحيات ({auditLogs.length})</Button>
      </div>

      {mainView === 'engine' && <section className="ban-panel brp-section" style={{ marginBottom: '2rem' }}>
        <div className="ban-section-header">
          <div>
            <h2><ShieldCheck size={20} /> محرك الصلاحيات المرن والاستثناءات الفردية</h2>
            <p>استعراض الصلاحيات الفعالة لأي مستخدم مع إمكانية تطبيق استثناءات المنح الصريح (ALLOW) أو الحجب الصريح (DENY) واستعادة التوريث لحظياً.</p>
          </div>
        </div>
        <PermissionMatrix scope="organization" interactive={true} />
      </section>}

   {mainView==='groups'&&<section className="ban-panel brp-section" style={{marginBottom:'2rem'}}>
     <div className="ban-section-header">
       <div>
         <h2><Building2 size={20}/> مجموعات وحزم الصلاحيات المؤسسية والمنصة</h2>
         <p>حزم وظيفية تدمج الصلاحيات المترابطة لتسهيل الإسناد والحوكمة وإدارة التفويضات الموحدة.</p>
       </div>
       <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
         <div style={{display:'inline-flex',borderRadius:'8px',background:'rgba(255,255,255,0.06)',padding:'2px'}}>
           <button type="button" onClick={()=>setGroupScopeFilter('organization')} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'0.8125rem',border:'none',background:groupScopeFilter==='organization'?'rgba(251,191,36,0.18)':'transparent',color:groupScopeFilter==='organization'?'#fbbf24':'var(--bayan-text-muted)',fontWeight:groupScopeFilter==='organization'?700:500,cursor:'pointer'}}>حزم المؤسسة</button>
           <button type="button" onClick={()=>setGroupScopeFilter('platform')} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'0.8125rem',border:'none',background:groupScopeFilter==='platform'?'rgba(251,191,36,0.18)':'transparent',color:groupScopeFilter==='platform'?'#fbbf24':'var(--bayan-text-muted)',fontWeight:groupScopeFilter==='platform'?700:500,cursor:'pointer'}}>حزم المنصة</button>
           <button type="button" onClick={()=>setGroupScopeFilter('all')} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'0.8125rem',border:'none',background:groupScopeFilter==='all'?'rgba(251,191,36,0.18)':'transparent',color:groupScopeFilter==='all'?'#fbbf24':'var(--bayan-text-muted)',fontWeight:groupScopeFilter==='all'?700:500,cursor:'pointer'}}>كافة الحزم ({groupsList.length})</button>
         </div>
         <Button size="sm" variant="primary" leadingIcon={<Plus size={16}/>} onClick={openNewGroupModal}>إنشاء حزمة صلاحيات مخصصة</Button>
       </div>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',gap:'1rem',marginTop:'1rem'}}>
       {groupsList.filter(g => groupScopeFilter === 'all' || g.scope === groupScopeFilter).map(g=><article key={g.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--bayan-border)',borderRadius:'0.75rem',padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
         <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
           <div>
             <h3 style={{margin:0,fontSize:'1rem',color:'#fff'}}>{g.titleAr}</h3>
             <small style={{color:'var(--bayan-text-muted)'}}>{g.scope === 'platform' ? 'نطاق المنصة المركزية' : 'نطاق المؤسسة'}</small>
           </div>
           {g.isSystemGroup ? (
             <Badge tone="info">حزمة نظام أساسية</Badge>
           ) : (
             <Badge tone="warning">حزمة مخصصة</Badge>
           )}
         </div>
         <p style={{fontSize:'0.85rem',color:'var(--bayan-text-muted)',margin:0}}>{g.descriptionAr || 'لا يوجد وصف تفصيلي للحزمة.'}</p>
         <div style={{display:'flex',flexDirection:'column',gap:'0.4rem',marginTop:'0.5rem'}}>
           {g.capabilities.map(cap=><div key={cap} style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.8125rem'}}>
             <CheckCircle2 size={15} style={{color:'#10b981'}}/>
             <span>{capabilityLabels[cap] || cap}</span>
             <small style={{color:'var(--bayan-text-muted)',marginRight:'auto'}} dir="ltr">{cap}</small>
           </div>)}
         </div>
         <div style={{display:'flex',justifyContent:'flex-end',gap:'0.5rem',marginTop:'auto',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'0.75rem'}}>
           <Button size="sm" variant="outline" leadingIcon={<Pencil size={14}/>} onClick={()=>openEditGroupModal(g)}>تعديل الصلاحيات</Button>
           {!g.isSystemGroup && (
             <Button size="sm" variant="danger" leadingIcon={<Trash2 size={14}/>} onClick={()=>setDeletingGroupId(g.id)}>حذف الحزمة</Button>
           )}
         </div>
       </article>)}
     </div>
   </section>}

      {mainView === 'groups' && <section className="ban-panel brp-section" style={{ marginBottom: '2rem' }}>
        <div className="ban-section-header">
          <div>
            <h2><Building2 size={20} /> مجموعات وحزم الصلاحيات المؤسسية</h2>
            <p>حزم وظيفية تدمج الصلاحيات المترابطة لتسهيل الإسناد والمراجعة الأمنية الموحدة.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {ORGANIZATION_PERMISSION_GROUPS.map(g => <article key={g.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bayan-border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{g.titleAr}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--bayan-text-muted)', margin: '0.5rem 0 1rem' }}>{g.descriptionAr}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {g.capabilities.map(cap => <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                <span>{capabilityLabels[cap]}</span>
                <small style={{ color: 'var(--bayan-text-muted)', marginRight: 'auto' }} dir="ltr">{cap}</small>
              </div>)}
            </div>
          </article>)}
        </div>
      </section>}

      {mainView === 'audit' && <section className="ban-panel brp-section" style={{ marginBottom: '2rem' }}>
        <div className="ban-section-header">
          <div>
            <h2><History size={20} /> سجل تدقيق وتعديل الصلاحيات الفورية (Live RBAC Audit Trail)</h2>
            <p>تسجيل فوري لكافة التعديلات على الصلاحيات والاستثناءات الفردية والأدوار المخصصة ومسؤولي المنصة مع الامتثال لمبدأ عدم القابلية للتلاعب.</p>
          </div>
          <Badge tone="info" icon={<ShieldCheck size={14} />}>تدقيق فوري نشط</Badge>
        </div>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="ban-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '2px solid var(--bayan-border)', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px', color: 'var(--bayan-text-muted)' }}>الوقت والتاريخ</th>
                <th style={{ padding: '10px 14px', color: 'var(--bayan-text-muted)' }}>المستخدم الفاعل</th>
                <th style={{ padding: '10px 14px', color: 'var(--bayan-text-muted)' }}>نوع الإجراء</th>
                <th style={{ padding: '10px 14px', color: 'var(--bayan-text-muted)' }}>الهدف المتأثر</th>
                <th style={{ padding: '10px 14px', color: 'var(--bayan-text-muted)' }}>تفاصيل العملية وبيانات السجل</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--bayan-border)' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--bayan-text-muted)' }} dir="ltr">{log.timestamp.slice(0, 19).replace('T', ' ')}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: '#fff' }}>{log.actorId}</strong>
                    <span style={{ fontSize: 10, marginRight: 8, padding: '2px 6px', borderRadius: 6, background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>{log.actorRole}</span>
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      background: log.operation.includes('GRANT') || log.operation.includes('CREATE') || log.operation.includes('STATUS') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: log.operation.includes('GRANT') || log.operation.includes('CREATE') || log.operation.includes('STATUS') ? '#4ade80' : '#f87171'
                    }}>
                      {log.operation}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }} dir="ltr"><code>{log.targetId}</code></td>
                  <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {mainView === 'matrix' && <>
        <section className="brp-stats" aria-label="ملخص إدارة الصلاحيات">
          {[{ icon: <UsersRound />, label: 'الأدوار المعتمدة', value: roleIds.length, tip: '3 مؤسسية + دور المنصة' }, { icon: <KeyRound />, label: 'الصلاحيات المعرفة', value: capabilities.length, tip: 'مرجع سياسة العرض' }, { icon: <ShieldCheck />, label: 'صلاحيات الدور المحدد', value: rolePermissions[selected].length, tip: roleMeta[selected].label }, { icon: <FileQuestion />, label: 'طلبات المراجعة المحلية', value: requests.length, tip: 'مسودات وليست صلاحيات فعالة' }].map(x => <article key={x.label} className="brp-stat"><span className="brp-stat-icon">{x.icon}</span><div><small>{x.label}</small><strong>{x.value.toLocaleString('ar-EG')}</strong><p>{x.tip}</p></div></article>)}
        </section>
        <section className="ban-panel brp-section" aria-labelledby="brp-role-heading"><div className="ban-section-header"><div><h2 id="brp-role-heading"><UsersRound size={20} /> الأدوار ونطاق الوصول</h2><p>اضغط على أي دور لعرض صلاحياته، أو افتح تفاصيله في الدرج الجانبي.</p></div><Link href="/admin/users" className="brp-inline-link"><UsersRound size={16} /> قائمة المستخدمين <ArrowLeft size={15} /></Link></div>
          <div className="brp-role-grid">{roleIds.map(role => {
            const selectedRole = role === selected; const count = totals.find(x => x.role === role)?.count ?? 0; return <article className={`brp-role-card ${selectedRole ? 'is-selected' : ''}`} key={role}>
              <button type="button" className="brp-role-choice" onClick={() => setSelected(role)} aria-pressed={selectedRole} aria-label={`اختيار دور ${roleMeta[role].label}`}><span className="brp-role-emblem">{role === 'platform_admin' ? <Layers /> : <ShieldCheck />}</span><span className="brp-role-info"><strong>{roleMeta[role].label}</strong><small>{roleScope[role]}</small></span>{selectedRole && <CheckCircle2 className="brp-selected-icon" size={19} />}</button>
              <div className="brp-role-foot"><span><KeyRound size={13} /> {rolePermissions[role].length} صلاحيات</span><span><Users size={13} /> {role === 'platform_admin' ? 'غير ممثل في سجلات المؤسسة' : `${count} حسابات نشطة تجريبية`}</span></div><button type="button" className="brp-details-action" onClick={() => setDetails(role)}>تفاصيل الدور <ArrowLeft size={14} /></button>
            </article>
          })}</div>
        </section>
        <section className="ban-panel brp-section" aria-labelledby="brp-matrix-heading"><div className="ban-section-header"><div><h2 id="brp-matrix-heading"><Shield size={20} /> مصفوفة الصلاحيات</h2><p>كل علامة تشير إلى سياسة العرض الثابتة للدور؛ لا تُمكّن الخانات من تعديل صلاحيات النظام.</p></div><div className="ban-actions"><Button size="sm" variant="outline" onClick={() => { setQuery(''); setScope('all'); }} leadingIcon={<RefreshCcw size={15} />}>إزالة المرشحات</Button></div></div>
          <div className="brp-filters"><label><span><Search size={16} /> البحث في الصلاحيات</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="البحث باسم الصلاحية أو رمزها..." aria-label="البحث في الصلاحيات" /></label><label><span>المجموعة</span><select value={scope} onChange={event => setScope(event.target.value)} aria-label="مجموعة الصلاحيات"><option value="all">جميع المجموعات</option>{permissionSections.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
          {filtered.length === 0 ? <div className="brp-empty"><Search size={30} /><p>لا توجد صلاحيات تطابق البحث.</p></div> : <div className="brp-table-scroll" role="region" tabIndex={0} aria-label="مصفوفة الصلاحيات قابلة للتمرير أفقيًا"><table className="brp-matrix"><caption className="brp-sr-only">عرض صلاحيات الأدوار الأربعة في نموذج بيان، دون تعديل مباشر</caption><thead><tr><th scope="col">العملية</th>{roleIds.map(r => <th scope="col" key={r} className={selected === r ? 'brp-current-col' : ''}>{roleMeta[r].label}</th>)}</tr></thead><tbody>{filtered.flatMap(group => [<tr key={`${group.id}-label`} className="brp-group-row"><th colSpan={5} scope="rowgroup">{group.title}</th></tr>, ...group.capabilities.map(cap => <tr key={cap}><th scope="row"><span>{capabilityLabels[cap]}</span><small dir="ltr">{cap}</small></th>{roleIds.map(r => <td key={r} className={selected === r ? 'brp-current-col' : ''}><span className={`brp-matrix-mark ${grantedFor(r, cap) ? 'allowed' : 'denied'}`} title={grantedFor(r, cap) ? 'مسموح في سياسة العرض' : 'غير مسموح في سياسة العرض'}>{grantedFor(r, cap) ? <Check size={17} /> : <X size={17} />}<span className="brp-sr-only">{grantedFor(r, cap) ? 'مسموح' : 'غير مسموح'}</span></span></td>)}</tr>)])}</tbody></table></div>}
        </section>
        <div className="brp-two-cols"><section className="ban-panel brp-section" aria-labelledby="brp-compare-heading"><div className="ban-section-header"><div><h2 id="brp-compare-heading"><ArrowRightLeft size={20} /> مقارنة الأدوار</h2><p>الفروق تعكس سياسة العرض الموجودة في الكود.</p></div></div><div className="brp-compare-controls"><label>الدور الأول <select value={compare} onChange={event => setCompare(event.target.value as RoleId)}>{roleIds.map(r => <option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label><ArrowLeft size={18} aria-hidden="true" /><label>الدور الثاني <select value={selected} onChange={event => setSelected(event.target.value as RoleId)}>{roleIds.map(r => <option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label></div>
          <div className="brp-compare-result"><p><Badge tone="success">{comparison.added.length} إضافية</Badge> موجودة في الدور الثاني دون الأول</p><div>{comparison.added.length ? comparison.added.map(c => <span key={c} className="brp-chip positive">{capabilityLabels[c]}</span>) : <small>لا توجد صلاحيات إضافية.</small>}</div><p><Badge tone="warning">{comparison.removed.length} أقل</Badge> موجودة في الدور الأول دون الثاني</p><div>{comparison.removed.length ? comparison.removed.map(c => <span key={c} className="brp-chip negative">{capabilityLabels[c]}</span>) : <small>لا توجد صلاحيات مفقودة.</small>}</div><p className="brp-common-count">{comparison.shared.length} صلاحيات مشتركة بين الدورين.</p></div>
        </section><section className="ban-panel brp-section" aria-labelledby="brp-review-heading"><div className="ban-section-header"><div><h2 id="brp-review-heading"><ClipboardCheck size={20} /> مقترحات مراجعة الصلاحيات</h2><p>مسودات محلية لا تغيّر مصفوفة الوصول ولا تنشئ طلب موافقة فعليًا.</p></div><Button size="sm" leadingIcon={<Plus size={16} />} onClick={openNewReview} disabled={!isEditable}>اقتراح مراجعة</Button></div>
            {selected === 'platform_admin' && <div className="brp-platform-warning"><LockKeyhole size={18} /> تغييرات صلاحيات مسؤول المنصة خارج نطاق إدارة المؤسسة.</div>}
            {requests.length === 0 ? <div className="brp-empty"><FileQuestion size={30} /><p>لم تُسجل مقترحات مراجعة محلية بعد.</p></div> : <div className="brp-request-list">{requests.slice(0, 6).map(item => <article key={item.id} className="brp-request"><div><strong>{item.action === 'grant' ? 'اقتراح منح' : 'اقتراح سحب'}: {capabilityLabels[item.capability]}</strong><p>{roleMeta[item.role].label} · {item.reason}</p><small>مسودة غير مطبقة</small></div><button type="button" aria-label={`حذف مقترح ${capabilityLabels[item.capability]}`} onClick={() => removeRequest(item.id)}><X size={17} /></button></article>)}</div>}
            {requests.length > 0 && <div className="brp-review-footer"><span>المقترحات: {requests.length} (محلية فقط)</span><Button variant="outline" size="sm" leadingIcon={<RefreshCcw size={15} />} onClick={() => setConfirmReset(true)}>مسح الطلبات</Button></div>}
          </section></div>
      </>}

      <div className="brp-footer"><Info size={18} /><div><strong>محرك الصلاحيات المرن:</strong> يدعم النظام إضافة الأدوار المؤسسية المخصصة واستثناءات المستخدمين الصريحة مع إمكانية استعادة التوريث وسجل تدقيق العمليات.</div><Link href="/admin/users">إدارة المستخدمين <ArrowLeft size={15} /></Link></div>
    </>}

    {/* Existing Drawer for details */}
    <Drawer open={Boolean(details) && authorized} onClose={() => setDetails(null)} title={details ? `تفاصيل دور: ${roleMeta[details].label}` : 'تفاصيل الدور'} description="نطاق الوصول وصلاحيات العرض المقترحة">
      {details && <div className="brp-drawer"><p className="brp-drawer-scope"><ShieldCheck size={19} />{roleScope[details]}</p><p>{roleMeta[details].description}</p><h3>الصلاحيات المسموحة في نموذج العرض ({rolePermissions[details].length})</h3><ul>{rolePermissions[details].map(cap => <li key={cap}><CheckCircle2 size={17} /><div><strong>{capabilityLabels[cap]}</strong><small dir="ltr">{cap}</small></div></li>)}</ul>{details === 'platform_admin' && <div className="brp-platform-warning"><LockKeyhole size={18} /> مسؤول المنصة لا يحصل تلقائيًا على حق قراءة بيانات المؤسسة أو إدارة مستخدميها.</div>}<Button variant="outline" fullWidth onClick={() => { setSelected(details); setDetails(null); }}>اختيار الدور في المصفوفة</Button></div>}
    </Drawer>

    {/* Review Proposal Dialog */}
    <Dialog open={requestOpen && authorized} onClose={() => setRequestOpen(false)} title="اقتراح مراجعة صلاحية" description="طلب توضيحي محفوظ محليًا ولا يُطبق على أي حساب أو دور" footer={<><Button variant="outline" onClick={() => setRequestOpen(false)}>إلغاء</Button><Button onClick={submitReview} leadingIcon={<ClipboardCheck size={16} />}>حفظ مسودة المراجعة</Button></>}>
      <div className="brp-review-form"><label>الدور المؤسسي<select value={request.role} onChange={e => { setRequest({ ...request, role: e.target.value as RoleId }); setIssue(null); }}>{institutionRoles.map(r => <option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label><label>العملية<select value={request.capability} onChange={e => { setRequest({ ...request, capability: e.target.value as Capability }); setIssue(null); }}>{capabilities.filter(c => c !== 'onboarding.run' && c !== 'platform.manage').map(cap => <option key={cap} value={cap}>{capabilityLabels[cap]}</option>)}</select></label><label>الإجراء المقترح<select value={request.action} onChange={e => { setRequest({ ...request, action: e.target.value as ReviewAction }); setIssue(null); }}><option value="grant">اقتراح منح</option><option value="revoke">اقتراح سحب</option></select></label><label>سبب المراجعة<textarea value={request.reason} maxLength={500} rows={4} onChange={e => { setRequest({ ...request, reason: e.target.value }); setIssue(null); }} placeholder="اشرح سبب طلب مراجعة هذه الصلاحية (12 حرفًا على الأقل)" /></label>{issue && <p role="alert" className="brp-validation">{issue}</p>}<p className="brp-form-note"><Info size={16} /> لا تعدل هذه المسودة مصفوفة الصلاحيات أو بيانات المستخدمين، ولا تُرسل إلى الخادم.</p></div>
    </Dialog>

    {/* Custom Role Creation Dialog */}
    <Dialog open={newRoleModalOpen && authorized} onClose={() => setNewRoleModalOpen(false)} title="إنشاء دور مؤسسي مخصص جديد" description="تحديد اسم الدور وصلاحياته داخل نطاق المؤسسة" footer={<><Button variant="outline" onClick={() => setNewRoleModalOpen(false)}>إلغاء</Button><Button variant="primary" type="submit" form="brp-new-role-form">إنشاء الدور وحفظه</Button></>}>
      <form id="brp-new-role-form" onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>اسم الدور بالعربية:</label>
          <input style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }} placeholder="مثال: منسق الجودة والاعتماد" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>وصف الدور والمسؤوليات:</label>
          <textarea style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }} rows={2} placeholder="وصف موجز للمهام المصرح بها..." value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>الدور الأساسي للتوريث:</label>
          <select style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }} value={newRoleBase} onChange={e => setNewRoleBase(e.target.value as RoleId)}>
            <option value="employee">موظف المؤسسة (Employee)</option>
            <option value="manager">مدير المؤسسة (Manager)</option>
            <option value="it_admin">مسؤول تقنية المعلومات (IT Admin)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>الصلاحيات الإضافية للدور:</label>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
            {capabilities.filter(c => c !== 'platform.manage' && c !== 'onboarding.run').map(cap => <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={newRoleCaps.includes(cap)} onChange={e => {
                if (e.target.checked) setNewRoleCaps([...newRoleCaps, cap]);
                else setNewRoleCaps(newRoleCaps.filter(c => c !== cap));
              }} />
              <span>{capabilityLabels[cap]}</span>
              <small style={{ color: 'var(--bayan-text-muted)' }} dir="ltr">{cap}</small>
            </label>)}
          </div>
        </div>
        {roleModalError && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{roleModalError}</div>}
      </form>
    </Dialog>

  {/* Group Create / Edit Dialog */}
  <Dialog
    open={groupModalOpen}
    onClose={() => setGroupModalOpen(false)}
    title={editingGroup ? `تعديل حزمة الصلاحيات: ${editingGroup.titleAr}` : 'إنشاء حزمة صلاحيات وظيفية مخصصة'}
    description="تجميع الصلاحيات في حزمة إدارية موحدة تسهل الحوكمة وتخصيص التفويضات"
    footer={
      <>
        <Button variant="outline" onClick={() => setGroupModalOpen(false)}>إلغاء</Button>
        <Button variant="primary" onClick={() => handleSaveGroup()}>{editingGroup ? 'حفظ التعديلات' : 'إنشاء الحزمة'}</Button>
      </>
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0', textAlign: 'right' }}>
      {groupModalError && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.85rem' }}>
          {groupModalError}
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>اسم الحزمة العربي <b>*</b>:</label>
        <input
          style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }}
          value={groupDraftTitle}
          onChange={(e) => setGroupDraftTitle(e.target.value)}
          placeholder="مثال: حزمة المراجعة الأكاديمية والاعتماد"
          required
        />
      </div>
      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>الوصف الوظيفي:</label>
        <textarea
          rows={2}
          style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff', resize: 'vertical' }}
          value={groupDraftDesc}
          onChange={(e) => setGroupDraftDesc(e.target.value)}
          placeholder="وصف الغرض من هذه الحزمة والمهام المنوطة بها..."
        />
      </div>
      {!editingGroup && (
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>نطاق الحزمة <b>*</b>:</label>
          <select
            style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }}
            value={groupDraftScope}
            onChange={(e) => {
              const sc = e.target.value as Scope;
              setGroupDraftScope(sc);
              setGroupDraftCaps(sc === 'platform' ? ['platform.manage'] : ['reports.view']);
            }}
          >
            <option value="organization">نطاق المؤسسة (جامعة بيان)</option>
            <option value="platform">نطاق المنصة (البنية التحتية والتشغيل)</option>
          </select>
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          الصلاحيات المندرجة تحت الحزمة ({groupDraftCaps.length}) <b>*</b>:
        </label>
        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
          {capabilities
            .filter((c) => (groupDraftScope === 'platform' ? ['platform.manage', 'onboarding.run'].includes(c) : !['platform.manage'].includes(c)))
            .map((cap) => (
              <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.2rem' }}>
                <input
                  type="checkbox"
                  checked={groupDraftCaps.includes(cap)}
                  onChange={() => toggleGroupCapability(cap)}
                />
                <span style={{ color: '#fff' }}>{capabilityLabels[cap]}</span>
                <small style={{ color: 'var(--bayan-text-muted)', marginRight: 'auto' }} dir="ltr">{cap}</small>
              </label>
            ))}
        </div>
      </div>
    </div>
  </Dialog>

  {/* Delete Group Dialog */}
  <Dialog
    open={Boolean(deletingGroupId)}
    onClose={() => setDeletingGroupId(null)}
    title="تأكيد حذف حزمة الصلاحيات"
    description="هذا الإجراء محلي في المتصفح ويزيل تعريف الحزمة المخصصة"
    footer={
      <>
        <Button variant="outline" onClick={() => setDeletingGroupId(null)}>إلغاء</Button>
        <Button variant="danger" onClick={handleDeleteGroup}>تأكيد الحذف</Button>
      </>
    }
  >
    <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
      هل تريد بالتأكيد حذف حزمة الصلاحيات المخصصة «{groupsList.find((g) => g.id === deletingGroupId)?.titleAr}»؟ لن يؤثر ذلك على الصلاحيات المعينة مسبقاً للمستخدمين.
    </p>
  </Dialog>

    {/* Edit Role Dialog */}
    <Dialog open={Boolean(editingRole)} onClose={() => setEditingRole(null)} title={`تعديل صلاحيات دور: ${editingRole?.nameAr}`} description="تحديث الصلاحيات المسندة لهذا الدور المخصص" footer={<><Button variant="outline" onClick={() => setEditingRole(null)}>إلغاء</Button><Button variant="primary" type="submit" form="brp-edit-role-form">حفظ التحديثات</Button></>}>
      {editingRole && <form id="brp-edit-role-form" onSubmit={handleUpdateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>اسم الدور:</label>
          <input style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', color: '#fff' }} value={editingRole.nameAr} onChange={e => setEditingRole({ ...editingRole, nameAr: e.target.value })} required />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>الصلاحيات المسندة للدور:</label>
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--bayan-border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
            {capabilities.filter(c => c !== 'platform.manage' && c !== 'onboarding.run').map(cap => <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={editingRole.capabilities.includes(cap)} onChange={e => {
                if (e.target.checked) setEditingRole({ ...editingRole, capabilities: [...editingRole.capabilities, cap] });
                else setEditingRole({ ...editingRole, capabilities: editingRole.capabilities.filter(c => c !== cap) });
              }} />
              <span>{capabilityLabels[cap]}</span>
              <small style={{ color: 'var(--bayan-text-muted)' }} dir="ltr">{cap}</small>
            </label>)}
          </div>
        </div>
      </form>}
    </Dialog>

    <Dialog open={confirmReset && authorized} onClose={() => setConfirmReset(false)} title="مسح مقترحات المراجعة" description="إزالة جميع المسودات التجريبية من هذا المتصفح" footer={<><Button variant="outline" onClick={() => setConfirmReset(false)}>إلغاء</Button><Button variant="danger" onClick={reset}>مسح المسودات</Button></>}><p className="brp-confirm">هل تريد مسح {requests.length} مقترح مراجعة؟ لن يؤثر ذلك على صلاحيات حقيقية.</p></Dialog>
    {notice && <div className="brp-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
  </div>;
}
export function RolesPermissionsScreen() { return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><RolesBody /></AdminLayout></DemoAccessProvider>; }
