# المعرفة الدلالية المعتمدة، فهرسة pgvector، وتوافق Catalog v2

## آلية الجسر الدلالي (`workflow/bridge.py`)

عند تفعيل المؤسسة في المرحلة 6 أو مزامنة التغييرات المعتمدة في المرحلة 8:
1. يجمع `build_approved_semantics_map` المفاهيم المعتمدة ومرادفاتها وتصنيفاتها الأمنية.
2. كل مفهوم جرى رفضه أو تصعيده (`rejected` / `escalated`) يُمرَّر بتصنيف `blacklist` فيُحجب تلقائياً من الفهرس الدلالي ومن `Catalog v2`.
3. يحوّل `build_discovery_report_from_catalog` المخطط إلى `DiscoveryReport` الرسمي (PR-1) ويستدعي `SemanticIndexer.index_report(...)` (PR-2).
4. يتحقق `SemanticIndexer` من بصمة المحتوى `content_hash`:
   - السجلات غير المتغيرة يُعاد استخدام متجهاتها دون استدعاء نموذج التضمين (`unchanged`).
   - السجلات المحذوفة تُؤرشف عبر `retire_ids`.
5. يقرأ `SemanticCatalogV2Provider` المشاهد المعتمدة فقط (`entry_type == 'view'` و`classification != 'blacklist'`) ويرجع كائنات `CatalogEntry` و`CatalogColumn` المطابقة حرفياً لعقد `app.agents.sql_catalog`.
