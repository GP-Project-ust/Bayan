import { CheckCircle2, Clock3, Copy, Pencil, Trash2, UserRound, X } from "lucide-react";
import type { DemoSmartView, DemoUser } from "@/lib/demo/admin-dashboard-store";
import { RoleIcon } from "./roleIcon";

type CommonProps = {
  canEdit: boolean;
  onClose: () => void;
};

/**
 * Read-only record viewer for the selected table row. Editing still happens in the
 * existing dialogs; this panel only reviews stored fields and offers the entry points.
 */
export function UserInspector({
  user,
  canEdit,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
}: CommonProps & {
  user: DemoUser;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="ao-inspector" aria-label={`تفاصيل المستخدم ${user.name}`}>
      <div className="ao-ins-head">
        <span className="ao-ins-avatar">
          <UserRound size={26} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div>
          <h3>{user.name}</h3>
          <p>{user.role}</p>
        </div>
        <button type="button" className="ao-ins-close" onClick={onClose} aria-label="إغلاق التفاصيل">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="ao-ins-fields">
        <div className="ao-ins-field">
          <span>البريد الإلكتروني</span>
          <b className="is-ltr">{user.email}</b>
        </div>
        <div className="ao-ins-field">
          <span>القسم</span>
          <b>{user.department || "عام"}</b>
        </div>
        <div className="ao-ins-field">
          <span>الدور</span>
          <b className="ao-ins-role">
            <RoleIcon role={user.role} size={14} />
            {user.role}
          </b>
        </div>
        <div className="ao-ins-field">
          <span>الحالة</span>
          <b>
            <span className={`ao-pill ${user.active ? "is-ok" : "is-warn"}`}>
              {user.active ? "نشط" : "غير نشط"}
            </span>
          </b>
        </div>
        <div className="ao-ins-field">
          <span>تاريخ الإنشاء</span>
          <b className="ao-num" dir="ltr">
            {user.createdAt}
          </b>
        </div>
      </div>

      <div className="ao-ins-actions">
        <button type="button" className="ao-primary" onClick={onEdit} disabled={!canEdit}>
          <Pencil size={16} aria-hidden="true" />
          تعديل بيانات المستخدم
        </button>
        <button type="button" className="ao-secondary" onClick={onToggleActive} disabled={!canEdit}>
          {user.active ? (
            <Clock3 size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          {user.active ? "تعطيل الحساب" : "تنشيط الحساب"}
        </button>
      </div>

      <div className="ao-ins-danger">
        <button type="button" className="ao-danger-btn" onClick={onDelete} disabled={!canEdit}>
          <Trash2 size={16} aria-hidden="true" />
          حذف المستخدم
        </button>
      </div>

      {!canEdit && <p className="ao-ins-note">هذا الدور يمتلك صلاحيات استعراض فقط.</p>}
    </aside>
  );
}

export function SmartViewInspector({
  view,
  canEdit,
  onClose,
  onEdit,
  onToggleActive,
  onDuplicate,
  onDelete,
}: CommonProps & {
  view: DemoSmartView;
  onEdit: () => void;
  onToggleActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="ao-inspector" aria-label={`تفاصيل العرض الذكي ${view.name}`}>
      <div className="ao-ins-head">
        <span className="ao-ins-avatar">
          <Copy size={24} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div>
          <h3>{view.name}</h3>
          <p>{view.source}</p>
        </div>
        <button type="button" className="ao-ins-close" onClick={onClose} aria-label="إغلاق التفاصيل">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="ao-ins-fields">
        <div className="ao-ins-field">
          <span>المصدر الأكاديمي</span>
          <b>{view.source}</b>
        </div>
        <div className="ao-ins-field">
          <span>المستوى الأمني</span>
          <b>
            <span className="ao-security" data-level={view.security}>
              {view.security}
            </span>
          </b>
        </div>
        <div className="ao-ins-field">
          <span>الحالة</span>
          <b>
            <span className={`ao-pill ${view.active ? "is-ok" : "is-warn"}`}>
              {view.active ? "نشط" : "متوقف"}
            </span>
          </b>
        </div>
        <div className="ao-ins-field">
          <span>تاريخ الإنشاء</span>
          <b className="ao-num" dir="ltr">
            {view.createdAt}
          </b>
        </div>
      </div>

      <div className="ao-ins-actions">
        <button type="button" className="ao-primary" onClick={onEdit} disabled={!canEdit}>
          <Pencil size={16} aria-hidden="true" />
          تعديل العرض الذكي
        </button>
        <button type="button" className="ao-secondary" onClick={onToggleActive} disabled={!canEdit}>
          {view.active ? (
            <Clock3 size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          {view.active ? "إيقاف العرض" : "تنشيط العرض"}
        </button>
        <button type="button" className="ao-secondary" onClick={onDuplicate} disabled={!canEdit}>
          <Copy size={16} aria-hidden="true" />
          نسخ العرض الذكي
        </button>
      </div>

      <div className="ao-ins-danger">
        <button type="button" className="ao-danger-btn" onClick={onDelete} disabled={!canEdit}>
          <Trash2 size={16} aria-hidden="true" />
          حذف العرض الذكي
        </button>
      </div>

      {!canEdit && <p className="ao-ins-note">هذا الدور يمتلك صلاحيات استعراض فقط.</p>}
    </aside>
  );
}
