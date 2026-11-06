"""موجّه الإصدار الأول من واجهة بيان البرمجية."""

from fastapi import APIRouter

from app.api.v1.endpoints import chat, health, stream

api_router = APIRouter()
api_router.include_router(health.router, tags=["الصحة"])
api_router.include_router(chat.router, tags=["المحادثة"])
api_router.include_router(stream.router, tags=["المحادثة"])
