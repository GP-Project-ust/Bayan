"""مستودعات حفظ حالة التهيئة الذكية مع تحكم تفاؤلي بالتزامن وعزل صارم عن قواعد بيانات العملاء."""

from __future__ import annotations

import copy
import json
import os
import tempfile
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Protocol
from urllib.parse import urlparse


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConcurrentStateUpdateError(RuntimeError):
    """يُرفع عند تعارض تعديل متزامن على لقطة حالة التهيئة (تعارض رقم النسخة)."""

    def __init__(self, expected_version: int, actual_version: int):
        super().__init__(
            f"تعارض تعديل متزامن لحالة التهيئة: المتوقع={expected_version}"
            f" والحالي={actual_version}."
        )
        self.expected_version = expected_version
        self.actual_version = actual_version


@dataclass(frozen=True)
class StateSnapshot:
    """لقطة حالة التهيئة المرتبطة برقم نسخة حتمي للفحص التفاؤلي."""

    state: Dict[str, Any]
    version: int


class OnboardingStateRepository(Protocol):
    """منفذ تخزين مستقل عن الوسط لحفظ حالة مسار التهيئة الذكية للمراحل 0–8."""

    def load_snapshot(self) -> Optional[StateSnapshot]: ...

    def save_snapshot(
        self,
        state: Dict[str, Any],
        *,
        expected_version: Optional[int],
    ) -> StateSnapshot: ...


def _default_state_payload(state: Dict[str, Any]) -> Dict[str, Any]:
    copied = copy.deepcopy(state)
    copied.setdefault("organizations", {})
    return copied


def _strip_transient_secrets(state: Dict[str, Any]) -> Dict[str, Any]:
    """تنقية أي مفاتيح سرية عابرة قبل الكتابة في أي مستودع حفظ."""
    cleaned = _default_state_payload(state)
    for org in cleaned.get("organizations", {}).values():
        if not isinstance(org, dict):
            continue
        for src in org.get("data_sources", []):
            if isinstance(src, dict):
                src.pop("password", None)
                src.pop("dsn", None)
                src.pop("secret", None)
    return cleaned


class InMemoryOnboardingStateRepository:
    """مستودع في الذاكرة للعمليات المعزولة واختبارات CI مع قفل وتدقيق تفاؤلي."""

    def __init__(self, initial_state: Optional[Dict[str, Any]] = None):
        self._lock = threading.RLock()
        self._state: Optional[Dict[str, Any]] = (
            _strip_transient_secrets(initial_state) if initial_state is not None else None
        )
        self._version = 1 if self._state is not None else 0

    def load_snapshot(self) -> Optional[StateSnapshot]:
        with self._lock:
            if self._state is None:
                return None
            return StateSnapshot(state=copy.deepcopy(self._state), version=self._version)

    def save_snapshot(
        self,
        state: Dict[str, Any],
        *,
        expected_version: Optional[int],
    ) -> StateSnapshot:
        with self._lock:
            if expected_version is not None and self._version != expected_version:
                raise ConcurrentStateUpdateError(expected_version, self._version)
            self._state = _strip_transient_secrets(state)
            self._version += 1
            return StateSnapshot(state=copy.deepcopy(self._state), version=self._version)


def resolve_state_path(configured_path: Optional[Path | str] = None) -> Path:
    """تحديد مسار ملف الحالة للتطوير المحلي فقط (بدون بيانات تاريخية مسبقة)."""
    if configured_path is not None:
        return Path(configured_path).expanduser().resolve()
    env_path = os.getenv("BAYAN_ONBOARDING_STATE_PATH", "").strip()
    if env_path:
        return Path(env_path).expanduser().resolve()
    return (Path.cwd() / ".local" / "onboarding_state.json").resolve()


class JsonOnboardingStateRepository:
    """مستودع JSON ذري للتطوير المحلي الاختياري فقط (معزول عن الإنتاج)."""

    def __init__(self, path: Optional[Path | str] = None):
        self.path = resolve_state_path(path)
        self._lock = threading.RLock()

    def load_snapshot(self) -> Optional[StateSnapshot]:
        with self._lock:
            if not self.path.exists():
                return None
            raw = self.path.read_text(encoding="utf-8")
            loaded = json.loads(raw) if raw.strip() else {"organizations": {}}
            if not isinstance(loaded, dict):
                loaded = {"organizations": {}}
            version = int(loaded.pop("_state_version", 1) or 1)
            return StateSnapshot(state=_default_state_payload(loaded), version=version)

    def save_snapshot(
        self,
        state: Dict[str, Any],
        *,
        expected_version: Optional[int],
    ) -> StateSnapshot:
        with self._lock:
            current = self.load_snapshot()
            current_version = current.version if current is not None else 0
            if expected_version is not None and current_version != expected_version:
                raise ConcurrentStateUpdateError(expected_version, current_version)
            next_version = current_version + 1
            payload = _strip_transient_secrets(state)
            payload["_state_version"] = next_version

            self.path.parent.mkdir(parents=True, exist_ok=True)
            serialized = json.dumps(payload, ensure_ascii=False, indent=2)
            fd, temp_name = tempfile.mkstemp(
                prefix=f".{self.path.stem}.",
                suffix=".tmp",
                dir=str(self.path.parent),
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as handle:
                    handle.write(serialized)
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temp_name, self.path)
            except Exception:
                try:
                    os.unlink(temp_name)
                except OSError:
                    pass
                raise
            return StateSnapshot(state=_strip_transient_secrets(state), version=next_version)


class PostgresOnboardingStateRepository:
    """مستودع PostgreSQL في قاعدة بيانات المنصة فقط (DATABASE_URL) مع حفظ ذري وتزامن تفاؤلي."""

    _CREATE_SQL = """
    CREATE TABLE IF NOT EXISTS onboarding_workflow_state (
        state_key TEXT PRIMARY KEY,
        state_version INTEGER NOT NULL,
        payload_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS onboarding_organizations (
        organization_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sector TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        current_phase TEXT NOT NULL DEFAULT 'intake',
        state_version INTEGER NOT NULL DEFAULT 1,
        payload_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_orgs_tenant
        ON onboarding_organizations (tenant_id, status);
    """

    def __init__(
        self,
        *,
        database_url: str,
        state_key: str = "default",
        connect_fn: Optional[Callable[..., Any]] = None,
    ):
        if not str(database_url or "").strip():
            raise ValueError("database_url مطلوب لمستودع PostgreSQL الرسمي.")
        parsed = urlparse(database_url)
        if parsed.scheme.split("+")[0] not in {"postgres", "postgresql"}:
            raise ValueError("مستودع التهيئة الرسمي يتطلب رابط PostgreSQL صالحاً في DATABASE_URL.")
        self._database_url = database_url
        self._state_key = state_key
        self._connect_fn = connect_fn
        self._schema_ready = False
        self._lock = threading.RLock()

    def _connect(self):
        if self._connect_fn is not None:
            return self._connect_fn(self._database_url)
        import psycopg

        return psycopg.connect(self._database_url, connect_timeout=5)

    def ensure_schema(self) -> None:
        with self._lock:
            if self._schema_ready:
                return
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(self._CREATE_SQL)
                conn.commit()
            self._schema_ready = True

    def load_snapshot(self) -> Optional[StateSnapshot]:
        with self._lock:
            self.ensure_schema()
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT state_version, payload_json FROM onboarding_workflow_state "
                        "WHERE state_key = %s",
                        (self._state_key,),
                    )
                    row = cur.fetchone()
                    if row is None:
                        return None
                    version = int(row[0])
                    payload = row[1]
                    if isinstance(payload, str):
                        payload = json.loads(payload)
                    return StateSnapshot(state=_default_state_payload(payload), version=version)

    def save_snapshot(
        self,
        state: Dict[str, Any],
        *,
        expected_version: Optional[int],
    ) -> StateSnapshot:
        with self._lock:
            self.ensure_schema()
            cleaned = _strip_transient_secrets(state)
            serialized_state = json.dumps(cleaned, ensure_ascii=False)
            now_ts = _utc_now()
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT state_version FROM onboarding_workflow_state "
                        "WHERE state_key = %s FOR UPDATE",
                        (self._state_key,),
                    )
                    row = cur.fetchone()
                    current_version = int(row[0]) if row is not None else 0
                    if expected_version is not None and current_version != expected_version:
                        conn.rollback()
                        raise ConcurrentStateUpdateError(expected_version, current_version)
                    next_version = current_version + 1
                    cur.execute(
                        """
                        INSERT INTO onboarding_workflow_state
                            (state_key, state_version, payload_json, updated_at)
                        VALUES (%s, %s, %s::jsonb, %s)
                        ON CONFLICT (state_key) DO UPDATE SET
                            state_version = EXCLUDED.state_version,
                            payload_json = EXCLUDED.payload_json,
                            updated_at = EXCLUDED.updated_at
                        """,
                        (self._state_key, next_version, serialized_state, now_ts),
                    )
                    orgs = cleaned.get("organizations", {})
                    org_ids = list(orgs.keys())
                    if org_ids:
                        for org_id, org in orgs.items():
                            cur.execute(
                                """
                                INSERT INTO onboarding_organizations
                                    (organization_id, tenant_id, name, sector, status,
                                     current_phase, state_version, payload_json, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                                ON CONFLICT (organization_id) DO UPDATE SET
                                    tenant_id = EXCLUDED.tenant_id,
                                    name = EXCLUDED.name,
                                    sector = EXCLUDED.sector,
                                    status = EXCLUDED.status,
                                    current_phase = EXCLUDED.current_phase,
                                    state_version = EXCLUDED.state_version,
                                    payload_json = EXCLUDED.payload_json,
                                    updated_at = EXCLUDED.updated_at
                                """,
                                (
                                    org_id,
                                    str(org.get("tenant_id") or org_id),
                                    str(org.get("name") or org_id),
                                    str(org.get("sector") or ""),
                                    str(org.get("status") or "pending"),
                                    str(org.get("current_phase") or "intake"),
                                    next_version,
                                    json.dumps(org, ensure_ascii=False),
                                    now_ts,
                                ),
                            )
                        cur.execute(
                            "DELETE FROM onboarding_organizations "
                            "WHERE NOT (organization_id = ANY(%s))",
                            (org_ids,),
                        )
                    else:
                        cur.execute("DELETE FROM onboarding_organizations")
                conn.commit()
            return StateSnapshot(state=cleaned, version=next_version)


def create_state_repository(
    *,
    backend: Optional[str] = None,
    database_url: Optional[str] = None,
    json_path: Optional[Path | str] = None,
) -> OnboardingStateRepository:
    """إنشاء مستودع الحالة المناسب للبيئة بدون استيراد بيانات تاريخية."""
    selected = (backend or os.getenv("BAYAN_ONBOARDING_STATE_BACKEND") or "memory").strip().lower()
    if selected == "postgres":
        return PostgresOnboardingStateRepository(
            database_url=database_url or os.getenv("DATABASE_URL", ""),
            state_key=f"bayan:{uuid.uuid5(uuid.NAMESPACE_DNS, 'onboarding-workflow').hex[:8]}",
        )
    if selected == "json":
        return JsonOnboardingStateRepository(path=json_path)
    return InMemoryOnboardingStateRepository()
