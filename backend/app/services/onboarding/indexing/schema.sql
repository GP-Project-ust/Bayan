-- مخطط الفهرس الدلالي في قاعدة بيانات المنصة (PostgreSQL 16 + pgvector)
-- مملوك للمنصة فقط (DATABASE_URL)؛ يُمنع تنفيذه داخل قاعدة بيانات العميل.
-- يُستدعى بصيغة idempotent مع التحقق المسبق من تفعيل امتداد vector.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS onboarding_semantic_entries (
    entry_id              VARCHAR(64)  PRIMARY KEY,
    tenant_id             VARCHAR(128) NOT NULL,
    source_id             VARCHAR(128) NOT NULL,
    schema_name           VARCHAR(128) NOT NULL,
    schema_qualified_name VARCHAR(255) NOT NULL,
    object_ref            VARCHAR(512) NOT NULL,
    entry_type            VARCHAR(32)  NOT NULL,
    technical_name        VARCHAR(255) NOT NULL,
    label_ar              TEXT         NOT NULL,
    description_ar        TEXT         NOT NULL,
    description_source    VARCHAR(64)  NOT NULL,
    classification        VARCHAR(32)  NOT NULL DEFAULT 'public',
    searchable_text       TEXT         NOT NULL,
    metadata_payload      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    metadata_fingerprint  VARCHAR(64)  NOT NULL,
    content_hash          VARCHAR(64)  NOT NULL,
    embedding_config_id   VARCHAR(255) NOT NULL,
    catalog_version       VARCHAR(64)  NOT NULL,
    rules_version         VARCHAR(64)  NOT NULL,
    indexing_state        VARCHAR(32)  NOT NULL DEFAULT 'indexed',
    retired_at            TIMESTAMPTZ  NULL,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    embedding             vector(1024) NOT NULL,
    CONSTRAINT uq_onboarding_semantic_scope
        UNIQUE (tenant_id, source_id, entry_type, object_ref)
);

CREATE INDEX IF NOT EXISTS ix_onboarding_semantic_tenant_state
    ON onboarding_semantic_entries (tenant_id, source_id, indexing_state, entry_type);

CREATE INDEX IF NOT EXISTS ix_onboarding_semantic_qualified_name
    ON onboarding_semantic_entries (tenant_id, schema_qualified_name);
