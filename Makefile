# =============================================================================
# بيان — أوامر التطوير الشائعة
# =============================================================================
# الاستخدام: make <الأمر>   (أو make وحده لعرض هذه القائمة)

.DEFAULT_GOAL := help
.PHONY: help setup infra llm up down ps logs backend-dev frontend-dev test lint fmt

help: ## عرض هذه القائمة
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## تجهيز بيئة التطوير المحلية (venv + اعتماديات + env)
	bash scripts/dev_setup.sh

infra: ## تشغيل البنية التحتية فقط (db + redis + qdrant)
	docker compose up -d db redis qdrant
	@echo "قاعدة البيانات: localhost:5432 | Redis: localhost:6379 | Qdrant: localhost:6333"

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
