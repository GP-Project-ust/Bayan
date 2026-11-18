"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, LockKeyhole, UserRoundCog } from "lucide-react";
import { canPreviewRoute, hasPermission, roleIds, roleMeta, type Capability, type RoleId } from "@/lib/access/policy";
import { StatePanel } from "@/components/states";

interface DemoAccessContextValue { role:RoleId;setRole:(role:RoleId)=>void;can:(capability:Capability)=>boolean;canVisit:(path:string)=>boolean; }
const DemoAccessContext=createContext<DemoAccessContextValue|null>(null);
export function DemoAccessProvider({children,initialRole="employee"}:{children:ReactNode;initialRole?:RoleId}) {
  const [role,setRole]=useState<RoleId>(initialRole);
  const value=useMemo(()=>({role,setRole,can:(capability:Capability)=>hasPermission(role,capability),canVisit:(path:string)=>canPreviewRoute(role,path)}),[role]);
  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}
export function useDemoAccess() {const context=useContext(DemoAccessContext);if(!context)throw new Error("useDemoAccess must be used inside DemoAccessProvider");return context;}
export function DemoRolePicker({id="bayan-role-picker"}:{id?:string}) {
  const {role,setRole}=useDemoAccess();
  return <label className="b5-role-picker" htmlFor={id}><span><UserRoundCog size={17} aria-hidden="true"/> الدور التجريبي</span><select id={id} value={role} onChange={e=>setRole(e.target.value as RoleId)}>{roleIds.map(id=><option value={id} key={id}>{roleMeta[id].label}</option>)}</select></label>;
}
export function Can({permission,children,fallback=null}:{permission:Capability;children:ReactNode;fallback?:ReactNode}) {
  const {can}=useDemoAccess();return <>{can(permission)?children:fallback}</>;
}
export function PreviewRouteGuard({route,children}:{route:string;children:ReactNode}) {
  const {canVisit}=useDemoAccess();return canVisit(route)?<>{children}</>:<StatePanel state="forbidden" description="تمنع محاكاة صلاحيات هذا الدور عرض الشاشة المطلوبة. لا يمثل ذلك تحققًا أمنيًا في الخادم."/>;
}
export function PermissionSummary({permission,enabled}:{permission:Capability;enabled:boolean}) {
  return <span className={`b5-permission-chip ${enabled?"yes":"no"}`}>{enabled?<Check size={14}/>:<LockKeyhole size={14}/>} {permission.replaceAll("."," · ")}</span>;
}
