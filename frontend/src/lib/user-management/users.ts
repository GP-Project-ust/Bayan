/** Screen 18. All records below are invented UI fixtures; never treat them as authenticated identities. */
export type TenantRole = 'employee'|'manager'|'it_admin';
export type AccountStatus = 'active'|'disabled';
export type UserRecord = {
  id:string; name:string; email:string; role:TenantRole; status:AccountStatus;
  department:string; institution:string; joined:string; lastSeen:string;
  customRoleId?: string;
};
export type UserDraft = Pick<UserRecord,'name'|'email'|'department'|'role'> & { customRoleId?: string };
export type UserFilters = {search:string;role:TenantRole|'all';status:AccountStatus|'all';department:string;sort:'newest'|'name'|'oldest'};
export type UserChange = {ok:true;users:UserRecord[]}|{ok:false;error:string};
export const demoInstitution='جامعة بيان النموذجية — بيانات افتراضية';
export const demoActorId='USR-003';
export const userRoleLabels:Record<TenantRole,string>={employee:'موظف المؤسسة',manager:'مدير المؤسسة',it_admin:'مسؤول تقنية المعلومات'};
export const userStatusLabels:Record<AccountStatus,string>={active:'نشط',disabled:'معطّل'};
export const departments=['تقنية المعلومات','شؤون الطلاب','الشؤون الأكاديمية','التسجيل والقبول','الجودة والتطوير','الشؤون الإدارية','المالية'];
export const initialUserFilters:UserFilters={search:'',role:'all',status:'all',department:'all',sort:'newest'};
export const DEMO_USERS:UserRecord[]=[
 {id:'USR-001',name:'أ. د. ناصر العتيبي',email:'nasser@example.test',role:'manager',status:'active',department:'الشؤون الأكاديمية',institution:demoInstitution,joined:'2026-01-02',lastSeen:'اليوم 10:18 ص'},
 {id:'USR-002',name:'أ. سارة القحطاني',email:'sara@example.test',role:'employee',status:'active',department:'شؤون الطلاب',institution:demoInstitution,joined:'2026-01-07',lastSeen:'اليوم 09:56 ص'},
 {id:'USR-003',name:'م. خالد الشهري',email:'khaled@example.test',role:'it_admin',status:'active',department:'تقنية المعلومات',institution:demoInstitution,joined:'2026-01-04',lastSeen:'اليوم 11:07 ص'},
 {id:'USR-004',name:'أ. ليان الحربي',email:'layan@example.test',role:'employee',status:'disabled',department:'شؤون الطلاب',institution:demoInstitution,joined:'2026-02-15',lastSeen:'قبل شهر'},
 {id:'USR-005',name:'أ. ريم الهاشمي',email:'reem@example.test',role:'employee',status:'active',department:'التسجيل والقبول',institution:demoInstitution,joined:'2026-02-19',lastSeen:'أمس 03:20 م'},
 {id:'USR-006',name:'د. عمر النعماني',email:'omar@example.test',role:'manager',status:'active',department:'الجودة والتطوير',institution:demoInstitution,joined:'2026-03-03',lastSeen:'اليوم 08:11 ص'},
 {id:'USR-007',name:'م. هدى الشريف',email:'huda@example.test',role:'it_admin',status:'active',department:'تقنية المعلومات',institution:demoInstitution,joined:'2026-03-10',lastSeen:'أمس 02:35 م'},
 {id:'USR-008',name:'أ. فاطمة السقاف',email:'fatima@example.test',role:'employee',status:'active',department:'المالية',institution:demoInstitution,joined:'2026-03-20',lastSeen:'أمس 04:14 م'},
 {id:'USR-009',name:'أ. باسل الأهدل',email:'basel@example.test',role:'employee',status:'disabled',department:'الشؤون الإدارية',institution:demoInstitution,joined:'2026-04-02',lastSeen:'قبل شهرين'},
 {id:'USR-010',name:'أ. مها العنسي',email:'maha@example.test',role:'employee',status:'active',department:'التسجيل والقبول',institution:demoInstitution,joined:'2026-04-21',lastSeen:'اليوم 09:04 ص'},
 {id:'USR-011',name:'د. أنس الوادعي',email:'anas@example.test',role:'manager',status:'active',department:'الشؤون الأكاديمية',institution:demoInstitution,joined:'2026-05-12',lastSeen:'أمس 08:57 ص'},
 {id:'USR-012',name:'أ. هاجر الحميري',email:'hajar@example.test',role:'employee',status:'active',department:'الجودة والتطوير',institution:demoInstitution,joined:'2026-06-01',lastSeen:'اليوم 11:25 ص'},
 {id:'USR-013',name:'أ. ياسر الجبري',email:'yasser@example.test',role:'employee',status:'active',department:'المالية',institution:demoInstitution,joined:'2026-06-14',lastSeen:'أمس 11:40 ص'},
 {id:'USR-014',name:'أ. نهى المؤيد',email:'noha@example.test',role:'employee',status:'active',department:'شؤون الطلاب',institution:demoInstitution,joined:'2026-07-05',lastSeen:'اليوم 10:31 ص'},
];
export function normalizeArabic(value:string):string{return value.normalize('NFKC').toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065f\u0670]/g,'').replace(/ـ/g,'').trim();}
export function normalizeEmail(value:string){return value.trim().toLowerCase();}
export function validateUserDraft(draft:UserDraft,existing:UserRecord[],excludeId?:string):Record<string,string>{
 const errors:Record<string,string>={};
 const name=draft.name.trim().replace(/\s+/g,' '),email=normalizeEmail(draft.email);
 if(name.length<3||name.length>90)errors.name='يجب إدخال اسم من 3 إلى 90 حرفًا.';
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email='يرجى إدخال بريد إلكتروني صحيح.';
 else if(existing.some(u=>u.id!==excludeId&&normalizeEmail(u.email)===email))errors.email='البريد الإلكتروني موجود في هذا النموذج.';
 if(!departments.includes(draft.department))errors.department='اختر قسمًا من القائمة.';
 if(!Object.prototype.hasOwnProperty.call(userRoleLabels,draft.role))errors.role='اختر دورًا مؤسسيًا معتمدًا.';
 return errors;
}
export function filterUsers(users:UserRecord[],filters:UserFilters):UserRecord[]{
 const q=normalizeArabic(filters.search);
 return users.filter(u=>(filters.role==='all'||filters.role===u.role)&&(filters.status==='all'||filters.status===u.status)&&(filters.department==='all'||filters.department===u.department)&&(!q||normalizeArabic(`${u.name} ${u.email} ${u.department} ${u.id} ${userRoleLabels[u.role]}`).includes(q)))
 .sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name,'ar'):filters.sort==='oldest'?a.joined.localeCompare(b.joined)||a.id.localeCompare(b.id):b.joined.localeCompare(a.joined)||a.id.localeCompare(b.id));
}
export function userTotals(users:UserRecord[]){return{total:users.length,active:users.filter(u=>u.status==='active').length,disabled:users.filter(u=>u.status==='disabled').length,admins:users.filter(u=>u.status==='active'&&u.role==='it_admin').length};}
export function createUser(users:UserRecord[],draft:UserDraft):UserChange{
 const errors=validateUserDraft(draft,users);if(Object.keys(errors).length)return {ok:false,error:Object.values(errors)[0]};
 const next=Math.max(0,...users.map(u=>Number(u.id.replace('USR-',''))||0))+1;
 const entry:UserRecord={id:`USR-${String(next).padStart(3,'0')}`,name:draft.name.trim().replace(/\s+/g,' '),email:normalizeEmail(draft.email),role:draft.role,status:'active',department:draft.department,institution:demoInstitution,joined:new Date().toISOString().slice(0,10),lastSeen:'لم يسجل الدخول (نموذج)',...(draft.customRoleId?{customRoleId:draft.customRoleId}:{})};
 return {ok:true,users:[...users,entry]};
}
export function editUser(users:UserRecord[],id:string,draft:UserDraft,actorId=demoActorId):UserChange{
 const user=users.find(u=>u.id===id);if(!user)return{ok:false,error:'المستخدم غير موجود.'};
 const errors=validateUserDraft(draft,users,id);if(Object.keys(errors).length)return{ok:false,error:Object.values(errors)[0]};
 if(id===actorId&&draft.role!==user.role)return{ok:false,error:'لا يمكن تعديل دور الحساب الإداري الحالي في المعاينة.'};
 if(user.role==='it_admin'&&user.status==='active'&&draft.role!=='it_admin'&&userTotals(users).admins<=1)return{ok:false,error:'لا يمكن إزالة دور آخر مسؤول تقنية معلومات نشط.'};
 return {ok:true,users:users.map(u=>u.id===id?{...u,name:draft.name.trim().replace(/\s+/g,' '),email:normalizeEmail(draft.email),role:draft.role,department:draft.department,customRoleId:draft.customRoleId}:u)};
}
export function setUserStatus(users:UserRecord[],id:string,next:AccountStatus,actorId=demoActorId):UserChange{
 const user=users.find(u=>u.id===id);if(!user)return{ok:false,error:'المستخدم غير موجود.'};
 if(user.status===next)return{ok:true,users};
 if(next==='disabled'&&user.id===actorId)return{ok:false,error:'لا يمكن تعطيل الحساب الإداري الحالي.'};
 if(next==='disabled'&&user.role==='it_admin'&&userTotals(users).admins<=1)return{ok:false,error:'لا يمكن تعطيل آخر مسؤول تقنية معلومات نشط.'};
 return{ok:true,users:users.map(u=>u.id===id?{...u,status:next}:u)};
}
/** Accept only well-formed, demo-tenant records; never trust storage as authorization. */
export function restoreUserFixtures(value:unknown):UserRecord[]{
 if(!Array.isArray(value)||value.length>300)return DEMO_USERS.map(u=>({...u}));
 const clean:UserRecord[]=[],seen=new Set<string>(),emails=new Set<string>();
 for(const raw of value){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return DEMO_USERS.map(u=>({...u}));
  const u=raw as Partial<UserRecord>;
  if(typeof u.id!=='string'||!/^USR-\d{3,6}$/.test(u.id)||typeof u.name!=='string'||typeof u.email!=='string'||typeof u.department!=='string'||typeof u.joined!=='string'||typeof u.lastSeen!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(u.joined)||u.institution!==demoInstitution||!['employee','manager','it_admin'].includes(String(u.role))||!['active','disabled'].includes(String(u.status))||!departments.includes(u.department))return DEMO_USERS.map(u=>({...u}));
  if(seen.has(u.id)||emails.has(normalizeEmail(u.email))||Object.keys(validateUserDraft({name:u.name,email:u.email,department:u.department,role:u.role as TenantRole},[],u.id)).length)return DEMO_USERS.map(u=>({...u}));
  seen.add(u.id);emails.add(normalizeEmail(u.email));clean.push(u as UserRecord);
 }
 if(!clean.some(u=>u.id===demoActorId&&u.role==='it_admin'&&u.status==='active'))return DEMO_USERS.map(u=>({...u}));
 return clean;
}
export const USERS_DEMO_NOTE='جميع الحسابات والأسماء والمؤسسة والبريد الإلكتروني في هذه الشاشة بيانات خيالية للعرض. لا يوجد اتصال بخادم المصادقة أو قاعدة البيانات، ولا يتم إنشاء حسابات أو إرسال دعوات حقيقية.';
