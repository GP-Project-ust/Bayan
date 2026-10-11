# =============================================================================
# بيان — صورة الواجهة الخلفية
# =============================================================================
FROM python:3.11-slim

WORKDIR /app

# الاعتماديات أولاً (طبقة تُخزَّن ما دامت requirements لم تتغير)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# شيفية التطبيق
COPY app ./app

# مستخدم غير جذر (أمان)
RUN useradd --create-home runner && chown -R runner:runner /app
USER runner

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
