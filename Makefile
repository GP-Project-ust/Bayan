# =============================================================================
# بيان — أوامر التطوير الشائعة
# =============================================================================
# الاستخدام: make <الأمر>   (أو make وحده لعرض هذه القائمة)
# القاعدة التجريبية الموحدة للجامعة (الموصى بها لكل الفريق): make dev-db

.DEFAULT_GOAL := help
.PHONY: help setup infra dev-db llm up down ps logs backend-dev frontend-dev test lint fmt

# مفسّر Python الذي يُتوقع وجود psycopg لديه:
# بيئة backend الافتراضية أولاً، ثم بيئة جذر المستودع، ثم python3 النظام
PY_RUN := $(shell if [ -x backend/.venv/bin/python ]; then echo backend/.venv/bin/python; elif [ -x .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)

help: ## عرض هذه القائمة
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## تجهيز بيئة التطوير المحلية (venv + اعتماديات + env)
	bash scripts/dev_setup.sh

infra: ## تشغيل البنية التحتية فقط (db + redis + qdrant)
	docker compose up -d db redis qdrant
	@echo "قاعدة البيانات: localhost:5432 | Redis: localhost:6379 | Qdrant: localhost:6333"

# تجهيز القاعدة التجريبية الموحدة للجامعة بأمر واحد:
# تشغيل university-db + المخطط + البيانات الاصطناعية + المشاهد + دور القراءة + التحقق
dev-db: ## تجهيز القاعدة التجريبية الموحدة للجامعة (university-db على 5433)
	docker compose up -d university-db
	@echo "⏳ في انتظار جاهزية قاعدة الجامعة (university-db)..."
	@for i in $$(seq 1 60); do \
		docker compose exec -T university-db pg_isready -U odoo -d university >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	@docker compose exec -T university-db pg_isready -U odoo -d university >/dev/null 2>&1 \
		|| { echo "❌ لم تصبح قاعدة الجامعة جاهزة خلال 60 ثانية"; exit 1; }
	@echo "📐 تطبيق المخطط (01_schema.sql)..."
	docker compose exec -T university-db psql -X -v ON_ERROR_STOP=1 -U odoo -d university < database/university_demo/01_schema.sql
	@echo "🌱 تعبئة البيانات الاصطناعية العربية (02_seed.py)..."
	$(PY_RUN) database/university_demo/02_seed.py --dsn postgresql://odoo:odoo@localhost:5433/university
	@echo "👀 إنشاء المشاهد ودور القراءة فقط (03_views_and_reader.sql)..."
	docker compose exec -T university-db psql -X -v ON_ERROR_STOP=1 -U odoo -d university < database/university_demo/03_views_and_reader.sql
	@echo "🔍 التحقق الشامل (verify.sh)..."
	bash database/university_demo/verify.sh
	@echo ""
	@echo "✅ القاعدة التجريبية الموحدة جاهزة: localhost:5433/university"
	@echo "   الاتصال بصلاحية القراءة فقط:"
	@echo "   PGPASSWORD=bayan_dev_reader psql -h localhost -p 5433 -U bayan_reader -d university"

llm: ## تشغيل Ollama المحلي + سحب نموذج Qwen (يستغرق وقتاً أول مرة)
	docker compose --profile llm up -d ollama
	docker compose exec ollama ollama pull qwen2.5:14b

up: ## تشغيل المكدس كاملاً (بناء الصور عند أول مرة)
	docker compose up -d --build

down: ## إيقاف كل الخدمات
	docker compose down

ps: ## حالة الخدمات
	docker compose ps

logs: ## متابعة سجلات كل الخدمات (Ctrl+C للخروج)
	docker compose logs -f

backend-dev: ## تشغيل backend محلياً مع إعادة تحميل (يتطلب make infra أولاً)
	cd backend && uvicorn app.main:app --reload --port 8000

frontend-dev: ## تشغيل frontend محلياً مع إعادة تحميل
	cd frontend && npm run dev

test: ## تشغيل اختبارات backend
	cd backend && python -m pytest tests -q

lint: ## فحص جودة الكود (ruff)
	cd backend && ruff check app tests

fmt: ## تنسيق الكود تلقائياً
	cd backend && ruff format app tests && ruff check --fix app tests
