/** Screen 20 route and UI metadata helpers. No backend identity or authorization logic. */
import type {UserRecord} from './users';

export function normalizeRequestedUserId(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const id=value.trim();
  return /^USR-\d{3,6}$/.test(id)?id:null;
}
export function userDetailsHref(id:string):string{
  const valid=normalizeRequestedUserId(id);
  if(!valid)throw new Error('Invalid demo user identifier');
  return `/admin/users/details?id=${encodeURIComponent(valid)}`;
}
export function findUserById(users:readonly UserRecord[],value:unknown):UserRecord|null{
  const id=normalizeRequestedUserId(value);
  return id?(users.find(u=>u.id===id)??null):null;
}
export type UserPreviewActivity={id:string;title:string;detail:string;date:string;kind:'fixture'|'local'};
/** These are explicitly labelled sample fields, not real security audit events. */
export function fixtureActivity(user:UserRecord):UserPreviewActivity[]{
  return [
    {id:`joined-${user.id}`,title:'تاريخ إضافة السجل التجريبي',detail:'مأخوذ من بيانات العرض، وليس من سجل التدقيق الفعلي.',date:user.joined,kind:'fixture'},
    {id:`seen-${user.id}`,title:'آخر نشاط توضيحي',detail:'قيمة توضيحية ضمن بيانات المعاينة؛ ليست نتيجة جلسة موثّقة.',date:user.lastSeen,kind:'fixture'},
  ];
}
export function roleChangeAllowed(user:UserRecord,actorId:string):boolean{return user.id!==actorId;}
export const USER_DETAILS_STORAGE_KEY='bayan.demo.users.v1';
