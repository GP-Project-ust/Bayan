"""اختبارات التكرار الحتمي (Idempotency) والعمومية عبر قاعدتَي بيانات وأمر CLI."""

from __future__ import annotations

import copy
import json

import pytest

from app.core.config import Settings
from app.services.onboarding.cli import main as cli_main
from app.services.onboarding.discovery import PostgresConnectionSettings
from app.services.onboarding.indexing import (
    InMemorySemanticRepository,
    OfficialEmbeddingService,
)
from app.services.onboarding.pipeline import UnifiedOnboardingPipeline
from tests.test_onboarding_catalog_v2 import _university_catalog_with_two_new_views
from tests.test_onboarding_introspection import InMemoryPostgresConnection, _logistics_catalog


class _CountingMockEmbedder(OfficialEmbeddingService):
    """يحسب عدد نداءات التضمين الفعلية لإثبات عدم إعادة التضمين عند تكرار التشغيل."""

    def __init__(self, app_settings: Settings):
        super().__init__(app_settings=app_settings)
        self.calls: int = 0
        self.total_texts_embedded: int = 0

    def embed_texts(self, texts):
        if texts:
            self.calls += 1
            self.total_texts_embedded += len(texts)
        return super().embed_texts(texts)


def test_unified_pipeline_idempotent_incremental_and_retires_safely():
    cfg = Settings(embedding_provider="mock", embedding_model="bge-m3", embedding_dimensions=1024)
    repo = InMemorySemanticRepository(dimensions=1024)
    embedder = _CountingMockEmbedder(cfg)

    current_catalog = copy.deepcopy(_university_catalog_with_two_new_views())
    pipeline = UnifiedOnboardingPipeline(
        app_settings=cfg,
        repository=repo,
        embedder=embedder,
        source_connect_fn=lambda **_kw: InMemoryPostgresConnection(current_catalog),
    )
    src = PostgresConnectionSettings(
        host="localhost",
        port=5433,
        database="university",
        username="bayan_reader",
        password="bayan_dev_reader",
        schemas=("public",),
        source_id="SRC-UNI",
    )

    # التشغيل الأول: يدرج كل السجلات
    first = pipeline.run(source_settings=src, tenant_id="tenant-uni")
    assert first.indexing_summary.inserted > 0
    assert first.indexing_summary.updated == 0
    assert first.indexing_summary.retired == 0
    assert len(first.catalog_views) == 5
    calls_after_first = embedder.calls

    # التشغيل الثاني بنفس المخطط: صفر إدراج، صفر تحديث، صفر إعادة تضمين
    second = pipeline.run(source_settings=src, tenant_id="tenant-uni")
    assert second.indexing_summary.inserted == 0
    assert second.indexing_summary.updated == 0
    assert second.indexing_summary.retired == 0
    assert second.indexing_summary.embedded_count == 0
    assert second.indexing_summary.unchanged == second.indexing_summary.total_active
    assert second.indexing_summary.reused_vectors == second.indexing_summary.total_active
    assert embedder.calls == calls_after_first

    # التشغيل الثالث مع تعديل مشهد وإزالة جدول مؤقت: يحدث المتغير فقط ويؤرشف المحذوف بأمان
    current_catalog["objects"] = [
        o for o in current_catalog["objects"] if o["name"] != "op_subject"
    ]
    profile_view = next(o for o in current_catalog["objects"] if o["name"] == "v_student_profile")
    profile_view["comment"] = "بيان: الملف الشخصي المحدّث للطالب"

    third = pipeline.run(source_settings=src, tenant_id="tenant-uni")
    assert third.indexing_summary.updated >= 1
    assert third.indexing_summary.retired >= 1
    assert third.indexing_summary.reused_vectors > 0

    # عزل الأعطال الجزئية: فشل الحفظ في pgvector لا يفسد الحالة السليمة السابقة
    repo.fail_on_next_apply = True
    current_catalog["objects"][0]["comment"] = "تعديل سيفشل حفظه"
    with pytest.raises(RuntimeError, match="pgvector"):
        pipeline.run(source_settings=src, tenant_id="tenant-uni")
    assert len(repo.list_active_views(tenant_id="tenant-uni")) == 5

    # منع توجيه pgvector إلى قاعدة بيانات العميل المصدر نفسه
    same_db_pipeline = UnifiedOnboardingPipeline(
        app_settings=Settings(database_url="postgresql://reader:secret@localhost:5433/university"),
        repository=repo,
        embedder=embedder,
        source_connect_fn=lambda **_kw: InMemoryPostgresConnection(current_catalog),
    )
    with pytest.raises(ValueError, match="تطابق قاعدة بيانات المنصة"):
        same_db_pipeline.run(source_settings=src, tenant_id="tenant-uni")


def test_unified_cli_processes_both_university_and_logistics_without_code_changes(capsys):
    cfg = Settings(
        embedding_provider="mock",
        embedding_model="bge-m3",
        embedding_dimensions=1024,
        odoo_db_password="secret-not-for-output",
    )
    repo = InMemorySemanticRepository(dimensions=1024)

    rc_uni = cli_main(
        [
            "--tenant",
            "tenant-a",
            "--source-id",
            "SRC-UNI",
            "--schemas",
            "public",
            "--format",
            "json",
        ],
        app_settings=cfg,
        repository=repo,
        source_connect_fn=lambda **_kw: InMemoryPostgresConnection(
            _university_catalog_with_two_new_views()
        ),
    )
    assert rc_uni == 0
    uni_out = json.loads(capsys.readouterr().out)
    assert uni_out["counts"]["tables"] == 9
    assert uni_out["counts"]["views"] == 5
    assert "secret-not-for-output" not in json.dumps(uni_out)

    rc_log = cli_main(
        [
            "--tenant",
            "tenant-b",
            "--source-id",
            "SRC-LOG",
            "--schemas",
            "logistics",
            "--format",
            "markdown",
        ],
        app_settings=cfg,
        repository=repo,
        source_connect_fn=lambda **_kw: InMemoryPostgresConnection(_logistics_catalog()),
    )
    assert rc_log == 0
    log_out = capsys.readouterr().out
    assert "logistics" in log_out
    assert "v_active_shipments_overview" in log_out
    assert "secret-not-for-output" not in log_out

    # فشل الاتصال يعيد رمز خروج غير صفري
    def broken_conn(**_kw):
        raise RuntimeError("تعذر الوصول للخادم")

    rc_fail = cli_main(
        ["--tenant", "tenant-a"],
        app_settings=cfg,
        repository=repo,
        source_connect_fn=broken_conn,
    )
    assert rc_fail == 1
