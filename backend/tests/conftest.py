"""تهيئة مشتركة لاختبارات بيان."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    """عميل اختبار جاهز — يُشغّل دورة حياة التطبيق."""
    with TestClient(app) as test_client:
        yield test_client
