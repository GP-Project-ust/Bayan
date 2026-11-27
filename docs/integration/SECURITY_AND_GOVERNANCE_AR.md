# الأمن والحوكمة والعزل وضوابط الاعتماد البشري

## 1. عزل المستأجر (Tenant Isolation Fail-Closed)

- يتحقق `enforce_tenant_header` في `governance/identity.py` من تطابق `X-Bayan-Tenant-ID` مع `organization_id` ويرفض أي طلب متضارب برمز `403`.
- في وضع الإنتاج (`BAYAN_ENV=production`) يصبح تمرير الترويسة والصلاحيات الصريحة مثل `onboarding.reset` إلزامياً بالكامل.

## 2. بوابات الاعتماد البشري ومنع الأتمتة المنفردة

- ترفض دالة `validate_human_actor` أي فاعل آلي (`ai`, `llm`, `bot`, `system`, `النظام`, `auto`, `automatic`).
- تُمنع مرحلة التفعيل (6) عبر `get_activation_readiness` ما لم تُعتمد المراحل 0–5 وتُغلق جميع التصعيدات المفتوحة.
- يتحقق `normalize_domain_analysis` من صحة كل مرجع جدول وعمود وعلاقة يقترحها AI ويرفض أي مرجع غير موجود في الكتالوج الفيزيائي.
- تتطلب إعادة تعيين أي مرحلة عبر `stage_reset.py` تأكيداً صريحاً (`confirm=true`) وسبباً ومشغلاً بشرياً مع تصفير جميع المراحل اللاحقة التابعة لها.

## 3. أمن البيانات في نماذج التضمين والذكاء الاصطناعي

- يقتصر الإرسال إلى `OfficialLLMStructuredGateway` (`app.llm.provider.get_llm`) و`OfficialEmbeddingService` (`app.core.qdrant.get_embeddings`) على البيانات الوصفية المعتمدة (أسماء، أوصاف، علاقات ومفاهيم) دون صفوف العملاء أو كلمات المرور أو استعلامات SQL التشغيلية.
