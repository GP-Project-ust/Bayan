# دليل التشغيل والتحقق المحلي للمشروع المدمج

## 1. المتطلبات المسبقة

- Python 3.12+ مع البيئة الافتراضية `C:\Bayan\backend\.venv`
- Node.js 22+ للواجهة الأمامية في `C:\Bayan\frontend` (يلزم تثبيت الحزم عبر `npm ci` أو `npm install` عند الحاجة لتشغيل البناء الفعلي)
- (اختياري للتشغيل الحي) PostgreSQL + pgvector لقاعدة المنصة، وقاعدة الجامعة على المنفذ `5433` عبر `make dev-db`

## 2. تشغيل الخادم الخلفي (`FastAPI`) محلياً

```powershell
cd C:\Bayan\backend
$env:LLM_PROVIDER="mock"
$env:EMBEDDING_PROVIDER="mock"
$env:BAYAN_ONBOARDING_STATE_BACKEND="memory"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 3. فحص جاهزية التهيئة والكتالوج

- فحص الجاهزية: `GET http://localhost:8000/api/v1/onboarding/readiness`
- صفحة التهيئة الذكية في الواجهة الأمامية: `http://localhost:3000/platform/onboarding`
- صفحة الأرشيف والتشغيلات: `http://localhost:3000/platform/onboarding/history`

## 4. تشغيل خط CLI الموحد الحتمي (PR-1 + PR-2)

```powershell
cd C:\Bayan\backend
.\.venv\Scripts\python.exe -m app.services.onboarding.cli --help
```

## 5. تشغيل اختبارات التهيئة الذكية وفحص Ruff

```powershell
cd C:\Bayan\backend
.\.venv\Scripts\ruff.exe check app tests
.\.venv\Scripts\python.exe -m pytest tests/test_onboarding_workflow_stages.py tests/test_onboarding_api_endpoints.py -q
```
