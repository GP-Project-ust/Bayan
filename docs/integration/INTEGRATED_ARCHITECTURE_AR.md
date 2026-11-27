# المعمارية المدمجة للتهيئة الذكية والمعرفة الدلالية في `C:\Bayan`

## تدفق البيانات والتحكم عبر الطبقات الرسمية

```
Next.js RTL UI (/platform/onboarding)
        │  REST + X-Bayan-Tenant-ID
        ▼
FastAPI Router (app/api/v1/endpoints/onboarding.py -> app/main.py)
        │
        ├──► Governance & Identity (governance/identity.py, stage_reset.py)
        ├──► Workflow Orchestrator (workflow/service.py & workflow/sync.py)
        │       ├── Stage 1..2: connectors/scanner.py ──► PR-1 discovery/ (PostgresIntrospector + Describer + Fingerprints)
        │       ├── Stage 3..5: semantics/ + relationships/ ──► app.llm.provider.get_llm (OfficialLLMStructuredGateway)
        │       └── Stage 0..8 State: persistence/repository.py (Postgres / Memory / Dev-JSON)
        └──► Semantic Knowledge Bridge (workflow/bridge.py)
                ├──► PR-2 SemanticIndexer (indexing/) ──► app.core.qdrant.get_embeddings ──► pgvector
                └──► PR-2 SemanticCatalogV2Provider (catalog/) ──► Frozen CatalogEntry / CatalogColumn
```

## فصل المسؤوليات

1. **خط `make onboarding` (CLI الحتمي في PR-1 + PR-2)** يبقى كما هو بالكامل للتشغيل الآلي السريع بدون LLM أو تدخل بشري.
2. **مسار التهيئة التفاعلي 0–8 (`OnboardingWorkflowService`)** يفرض بوابات الاعتماد البشري والتصعيد وإعادة التعيين والربط التزايدي مع `pgvector` و`Catalog v2` عبر `SemanticKnowledgeBridge`.
3. **قاعدة البيانات المصدر للعميل** محصورة في وضع القراءة فقط (`default_transaction_read_only=on` لـ PostgreSQL، و`mode=ro` لـ SQLite)، ولا تُكتب فيها أي جداول أو فهارس متجهية إطلاقاً.
