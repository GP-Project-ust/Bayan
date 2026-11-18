/**
 * Screen 21 — presentation-only role-review model.
 * These requests are local proposals, never effective grants or RBAC enforcement.
 */
import {capabilities,rolePermissions,type Capability,type RoleId} from './policy';

export type ReviewAction='grant'|'revoke';
export type TenantRole=Exclude<RoleId,'platform_admin'>;
export type ReviewDraft={role:RoleId;capability:Capability;action:ReviewAction;reason:string};
export type ReviewRequest=ReviewDraft&{id:string;createdAt:string;status:'proposal'};
export const ROLE_REVIEW_STORAGE_KEY='bayan.demo.role.review.v1';
export const institutionRoles:readonly TenantRole[]=['employee','manager','it_admin'];
export const protectedPlatformCapabilities:readonly Capability[]=['platform.manage','onboarding.run'];
export const permissionSections:readonly {id:string;title:string;capabilities:readonly Capability[]}[]=[
 {id:'chat',title:'المحادثات والمستندات',capabilities:['chat.ask','documents.search','citations.view','sql.inspect']},
 {id:'reports',title:'التقارير والتحليلات',capabilities:['reports.view','reports.create','reports.export','analytics.view']},
 {id:'tenant',title:'إدارة المؤسسة والرقابة',capabilities:['users.manage','roles.manage','sources.manage','smartviews.manage','audit.view','traces.view']},
 {id:'platform',title:'تشغيل المنصة',capabilities:['onboarding.run','platform.manage']},
];
export const roleScope:Record<RoleId,string>={
 employee:'داخل المؤسسة — بيانات العمل المصرح بها',
 manager:'داخل المؤسسة — البيانات الإدارية والتحليلية',
 it_admin:'داخل المؤسسة — حسابات المستخدمين والمصادر والتدقيق',
 platform_admin:'خدمات المنصة — دون وصول تلقائي لبيانات المؤسسات',
};
export function grantedFor(role:RoleId,capability:Capability):boolean{return rolePermissions[role].includes(capability);}
export function compareRoles(from:RoleId,to:RoleId){
 const shared=capabilities.filter(cap=>grantedFor(from,cap)&&grantedFor(to,cap));
 const added=capabilities.filter(cap=>!grantedFor(from,cap)&&grantedFor(to,cap));
 const removed=capabilities.filter(cap=>grantedFor(from,cap)&&!grantedFor(to,cap));
 return {shared,added,removed};
}
export function validateReviewDraft(draft:ReviewDraft):string|null{
 if(!institutionRoles.includes(draft.role as TenantRole))return 'تغييرات دور مسؤول المنصة خارج نطاق مسؤول المؤسسة.';
 if(!capabilities.includes(draft.capability))return 'صلاحية غير معروفة.';
 if(protectedPlatformCapabilities.includes(draft.capability))return 'لا يمكن اقتراح منح صلاحيات المنصة من إدارة المؤسسة.';
 if(draft.action!=='grant'&&draft.action!=='revoke')return 'إجراء غير معتمد.';
 if(draft.reason.trim().length<12||draft.reason.trim().length>500)return 'اكتب سببًا للمراجعة من 12 إلى 500 حرف.';
 if(draft.action==='grant'&&grantedFor(draft.role,draft.capability))return 'هذه الصلاحية متاحة بالفعل للدور.';
 if(draft.action==='revoke'&&!grantedFor(draft.role,draft.capability))return 'هذه الصلاحية غير متاحة حاليًا للدور.';
 return null;
}
export function createReviewRequest(existing:readonly ReviewRequest[],draft:ReviewDraft,now=new Date()):{ok:true;items:ReviewRequest[]}|{ok:false;error:string}{
 const issue=validateReviewDraft(draft);
 if(issue)return {ok:false,error:issue};
 if(existing.length>=50)return{ok:false,error:'بلغت قائمة المسودات الحد الأقصى (50 طلبًا).'};
 if(existing.some(x=>x.role===draft.role&&x.capability===draft.capability&&x.action===draft.action))return {ok:false,error:'هناك طلب مراجعة مطابق بالفعل.'};
 const unique=`${now.getTime()}-${existing.length+1}`;
 return{ok:true,items:[{...draft,reason:draft.reason.trim(),status:'proposal',createdAt:now.toISOString(),id:`REV-${unique}`},...existing]};
}
/** Reject untrusted browser storage if a single record is invalid. */
export function restoreReviewRequests(value:unknown):ReviewRequest[]{
 if(!Array.isArray(value)||value.length>50)return [];
 const safe:ReviewRequest[]=[];
 const ids=new Set<string>();
 for(const item of value){
  if(!item||typeof item!=='object'||Array.isArray(item))return [];
  const x=item as Partial<ReviewRequest>;
  if(typeof x.id!=='string'||!/^REV-\d{8,16}-\d{1,3}$/.test(x.id)||ids.has(x.id)||x.status!=='proposal'||typeof x.createdAt!=='string'||!Number.isFinite(Date.parse(x.createdAt))||typeof x.reason!=='string'||typeof x.capability!=='string'||typeof x.role!=='string'||typeof x.action!=='string')return [];
  const draft={role:x.role as RoleId,capability:x.capability as Capability,action:x.action as ReviewAction,reason:x.reason};
  if(validateReviewDraft(draft))return [];
  ids.add(x.id);safe.push(x as ReviewRequest);
 }
 return safe;
}
