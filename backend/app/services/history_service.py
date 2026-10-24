import os
import json
import uuid
import sqlite3
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from fastapi import HTTPException, status
from app.config import settings
from app.models.schemas import (
    CustomizationHistoryItem,
    CustomizationHistoryDetail,
    SaveHistoryRequest,
    TailoredResumeResponse
)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS customization_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resume_id TEXT,
    title TEXT NOT NULL,
    target_role TEXT,
    job_description TEXT NOT NULL,
    customization_engine TEXT NOT NULL DEFAULT 'gemini',
    is_llm_generated INTEGER NOT NULL DEFAULT 1,
    match_score INTEGER,
    ats_score INTEGER,
    tailored_result TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hist_user_created
ON customization_history (user_id, created_at DESC);
"""

class HistoryService:
    def __init__(self):
        self._sqlite_path = settings.LOCAL_DB_PATH
        self._init_sqlite()

    def _init_sqlite(self):
        try:
            os.makedirs(os.path.dirname(os.path.abspath(self._sqlite_path)), exist_ok=True)
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.executescript(SCHEMA_SQL)
                conn.commit()
        except Exception:
            self._sqlite_path = ":memory:"
            with sqlite3.connect(self._sqlite_path) as conn:
                conn.executescript(SCHEMA_SQL)
                conn.commit()

    def _is_production(self) -> bool:
        return settings.ENVIRONMENT.lower() == "production"

    def _use_supabase(self) -> bool:
        return bool(
            settings.SUPABASE_URL
            and settings.SUPABASE_URL.strip()
            and settings.SUPABASE_KEY
            and settings.SUPABASE_KEY.strip()
        )

    async def list_history(
        self, user_id: str, user_token: Optional[str] = None
    ) -> List[CustomizationHistoryItem]:
        if not user_id:
            return []

        if self._is_production() and not self._use_supabase():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud database is not configured in production environment.",
            )

        if self._use_supabase():
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                url = f"{base}/rest/v1/customization_history?user_id=eq.{user_id}&order=created_at.desc"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Accept": "application/json",
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    rows = resp.json()
                    return [
                        CustomizationHistoryItem(
                            id=str(r["id"]),
                            user_id=str(r["user_id"]),
                            resume_id=str(r["resume_id"]) if r.get("resume_id") else None,
                            title=r.get("title", "Customized Resume"),
                            target_role=r.get("target_role"),
                            match_score=r.get("match_score"),
                            ats_score=r.get("ats_score"),
                            customization_engine=r.get("customization_engine", "gemini"),
                            is_llm_generated=bool(r.get("is_llm_generated", True)),
                            created_at=str(r.get("created_at")),
                        )
                        for r in rows
                    ]
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to fetch history from cloud database: HTTP {resp.status_code}",
                    )
            except HTTPException:
                raise
            except Exception as e:
                if self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloud database request error: {str(e)}",
                    )
                pass

        if self._is_production():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local database fallback is disabled in production.",
            )

        with sqlite3.connect(self._sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, user_id, resume_id, title, target_role, match_score, ats_score, customization_engine, is_llm_generated, created_at FROM customization_history WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
            rows = cursor.fetchall()
            return [
                CustomizationHistoryItem(
                    id=r["id"],
                    user_id=r["user_id"],
                    resume_id=r["resume_id"] if "resume_id" in r.keys() else None,
                    title=r["title"],
                    target_role=r["target_role"],
                    match_score=r["match_score"],
                    ats_score=r["ats_score"],
                    customization_engine=r["customization_engine"],
                    is_llm_generated=bool(r["is_llm_generated"]),
                    created_at=r["created_at"],
                )
                for r in rows
            ]

    async def get_history_detail(
        self, user_id: str, history_id: str, user_token: Optional[str] = None
    ) -> Optional[CustomizationHistoryDetail]:
        if not user_id or not history_id:
            return None

        if self._is_production() and not self._use_supabase():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud database is not configured in production environment.",
            )

        if self._use_supabase():
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                url = f"{base}/rest/v1/customization_history?id=eq.{history_id}&user_id=eq.{user_id}"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Accept": "application/json",
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows:
                        r = rows[0]
                        res_json = r["tailored_result"]
                        if isinstance(res_json, str):
                            res_json = json.loads(res_json)
                        return CustomizationHistoryDetail(
                            id=str(r["id"]),
                            user_id=str(r["user_id"]),
                            resume_id=str(r["resume_id"]) if r.get("resume_id") else None,
                            title=r.get("title", "Customized Resume"),
                            target_role=r.get("target_role"),
                            match_score=r.get("match_score"),
                            ats_score=r.get("ats_score"),
                            customization_engine=r.get("customization_engine", "gemini"),
                            is_llm_generated=bool(r.get("is_llm_generated", True)),
                            created_at=str(r.get("created_at")),
                            job_description=r.get("job_description", ""),
                            tailored_result=TailoredResumeResponse(**res_json),
                        )
                    return None
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to fetch history detail from cloud database: HTTP {resp.status_code}",
                    )
            except HTTPException:
                raise
            except Exception as e:
                if self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloud database request error: {str(e)}",
                    )
                pass

        if self._is_production():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local database fallback is disabled in production.",
            )

        with sqlite3.connect(self._sqlite_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM customization_history WHERE id = ? AND user_id = ?",
                (history_id, user_id),
            )
            row = cursor.fetchone()
            if not row:
                return None
            res_dict = json.loads(row["tailored_result"])
            return CustomizationHistoryDetail(
                id=row["id"],
                user_id=row["user_id"],
                resume_id=row["resume_id"] if "resume_id" in row.keys() else None,
                title=row["title"],
                target_role=row["target_role"],
                match_score=row["match_score"],
                ats_score=row["ats_score"],
                customization_engine=row["customization_engine"],
                is_llm_generated=bool(row["is_llm_generated"]),
                created_at=row["created_at"],
                job_description=row["job_description"],
                tailored_result=TailoredResumeResponse(**res_dict),
            )

    async def save_history(
        self,
        user_id: str,
        request: SaveHistoryRequest,
        user_token: Optional[str] = None,
    ) -> CustomizationHistoryItem:
        history_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        resume_id = getattr(request, 'resume_id', None)

        match_score = request.tailored_result.match_score
        ats_score = (
            request.tailored_result.ats_compatibility.score
            if request.tailored_result.ats_compatibility
            else None
        )
        engine = request.tailored_result.customization_engine or "gemini"
        is_llm = bool(request.tailored_result.is_llm_generated)
        tailored_json = request.tailored_result.model_dump()

        if self._is_production() and not self._use_supabase():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud database is not configured in production environment.",
            )

        if self._use_supabase():
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                url = f"{base}/rest/v1/customization_history"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                }
                payload = {
                    "id": history_id,
                    "user_id": user_id,
                    "resume_id": resume_id,
                    "title": request.title,
                    "target_role": request.target_role,
                    "job_description": request.job_description,
                    "customization_engine": engine,
                    "is_llm_generated": is_llm,
                    "match_score": match_score,
                    "ats_score": ats_score,
                    "tailored_result": tailored_json,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    return CustomizationHistoryItem(
                        id=history_id,
                        user_id=user_id,
                        resume_id=resume_id,
                        title=request.title,
                        target_role=request.target_role,
                        match_score=match_score,
                        ats_score=ats_score,
                        customization_engine=engine,
                        is_llm_generated=is_llm,
                        created_at=now_iso,
                    )
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to persist history to cloud database: HTTP {resp.status_code}",
                    )
            except HTTPException:
                raise
            except Exception as e:
                if self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloud database request error: {str(e)}",
                    )
                pass

        if self._is_production():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local database fallback is disabled in production.",
            )

        insert_sql = """
        INSERT INTO customization_history
        (id, user_id, resume_id, title, target_role, job_description, customization_engine, is_llm_generated, match_score, ats_score, tailored_result, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        with sqlite3.connect(self._sqlite_path) as conn:
            conn.execute(
                insert_sql,
                (
                    history_id,
                    user_id,
                    resume_id,
                    request.title,
                    request.target_role,
                    request.job_description,
                    engine,
                    1 if is_llm else 0,
                    match_score,
                    ats_score,
                    json.dumps(tailored_json),
                    now_iso,
                    now_iso,
                ),
            )
            conn.commit()

        return CustomizationHistoryItem(
            id=history_id,
            user_id=user_id,
            resume_id=resume_id,
            title=request.title,
            target_role=request.target_role,
            match_score=match_score,
            ats_score=ats_score,
            customization_engine=engine,
            is_llm_generated=is_llm,
            created_at=now_iso,
        )

    async def delete_history(
        self, user_id: str, history_id: str, user_token: Optional[str] = None
    ) -> bool:
        if not user_id or not history_id:
            return False

        if self._is_production() and not self._use_supabase():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud database is not configured in production environment.",
            )

        if self._use_supabase():
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                url = f"{base}/rest/v1/customization_history?id=eq.{history_id}&user_id=eq.{user_id}"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Accept": "application/json",
                    "Prefer": "return=representation",
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.delete(url, headers=headers)
                if resp.status_code in (200, 204):
                    deleted_rows = resp.json() if resp.text else []
                    if isinstance(deleted_rows, list) and len(deleted_rows) > 0:
                        return True
                    return False
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to delete history from cloud database: HTTP {resp.status_code}",
                    )
            except HTTPException:
                raise
            except Exception as e:
                if self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloud database request error: {str(e)}",
                    )
                pass

        if self._is_production():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local database fallback is disabled in production.",
            )

        with sqlite3.connect(self._sqlite_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM customization_history WHERE id = ? AND user_id = ?",
                (history_id, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0

history_service = HistoryService()
