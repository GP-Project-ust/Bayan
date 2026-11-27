# مصفوفة اختيار الميزات والمواءمة المعمارية بين `C:\bayan-onboarding` و`C:\Bayan`

## 1. الوحدات المنقولة والمكيَّفة رسمياً

| الميزة في التطبيق المستقل | المسار المدمج في `C:\Bayan` | التكييف الهندسي |
|---|---|---|
| Stage 0–8 Workflow Orchestrator | `backend/app/services/onboarding/workflow/` | تفكيك `service.py` و`lifecycle_sync.py` إلى وحدات مركّزة (`models.py`, `service.py`, `sync.py`, `bridge.py`) |
| Multi-DB Connectors | `backend/app/services/onboarding/connectors/scanner.py` | توجيه PostgreSQL مباشرة إلى PR-1 `PostgresIntrospector` + دعم SQLite وMySQL وSQL Server بوضع قراءة فقط |
| State Persistence | `backend/app/services/onboarding/persistence/repository.py` | إضافة `PostgresOnboardingStateRepository` لقاعدة المنصة (`DATABASE_URL`) مع الاحتفاظ بـ `InMemory` و`Json` المعزول للتطوير |
| Stage 3–4 Domain & Semantics | `backend/app/services/onboarding/semantics/` | استبدال مصنع المزودين المستقل بالمحوّل `OfficialLLMStructuredGateway(get_llm)` + تحقق الإسناد `normalize_domain_analysis` |
| Stage 5 Relationships | `backend/app/services/onboarding/relationships/analysis.py` | الفصل الصارم بين `declared` و`ai_inferred` و`manual` والمفاتيح المركبة |
| Stage Reset & Tenant Auth | `backend/app/services/onboarding/governance/` | تطبيق عزل المستأجر Fail-Closed وإعادة تعيين المراحل 0–8 بتبعياتها الكاملة |
| Arabic RTL UI (Stages 0–8) | `frontend/src/components/onboarding/` و`frontend/src/app/platform/onboarding/` | شاشات أصلية داخل `AppShell` مع ربط `Sidebar.tsx` بـ `/platform/onboarding` |

## 2. المكونات المستبعدة عمداً ولماذا

- **`backend/onboarding/ai_providers.py` ومفاتيح `ai_settings.json`**: استُبعد بالكامل لمنع ازدواجية مزود LLM ولتمرير كل الاستدعاءات عبر `app.llm.provider.get_llm` و`app.core.config.Settings`.
- **بيانات العملاء التجريبية التاريخية في `backend/data/*.json` وملفات `.env`**: مستبعدة نهائياً؛ تبدأ المنصة بحالة نظيفة دون أسرار مخزنة.
- **مسارات البروكسي التجريبية داخل Next.js**: يتصل العميل `frontend/src/lib/onboarding-api.ts` مباشرة بخادم FastAPI عبر `NEXT_PUBLIC_API_URL`.
