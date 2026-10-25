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
    TailoredResumeResponse,
    ForkVersionRequest,
    UpdateVersionMetadataRequest,
    VersionComparisonResponse,
    ExperienceDiff,
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
    updated_at TEXT NOT NULL,
    version_name TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    parent_id TEXT,
    root_id TEXT,
    version_tags TEXT NOT NULL DEFAULT '[]',
    version_notes TEXT,
    is_starred INTEGER NOT NULL DEFAULT 0
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
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(customization_history)")
                existing_cols = {row[1] for row in cursor.fetchall()}
                additive_cols = [
                    ("version_name", "TEXT"),
                    ("version_number", "INTEGER NOT NULL DEFAULT 1"),
                    ("parent_id", "TEXT"),
                    ("root_id", "TEXT"),
                    ("version_tags", "TEXT NOT NULL DEFAULT '[]'"),
                    ("version_notes", "TEXT"),
                    ("is_starred", "INTEGER NOT NULL DEFAULT 0"),
                ]
                for col_name, col_type in additive_cols:
                    if col_name not in existing_cols:
                        cursor.execute(f"ALTER TABLE customization_history ADD COLUMN {col_name} {col_type}")
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

    def _map_row_to_item(self, r: Dict[str, Any]) -> CustomizationHistoryItem:
        raw_tags = r.get("version_tags", [])
        if isinstance(raw_tags, str):
            try:
                tags = json.loads(raw_tags)
            except Exception:
                tags = [t.strip() for t in raw_tags.strip("{}").split(",") if t.strip()]
        elif isinstance(raw_tags, list):
            tags = raw_tags
        else:
            tags = []

        return CustomizationHistoryItem(
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
            version_name=r.get("version_name"),
            version_number=int(r.get("version_number", 1)),
            parent_id=str(r["parent_id"]) if r.get("parent_id") else None,
            root_id=str(r["root_id"]) if r.get("root_id") else None,
            version_tags=tags,
            version_notes=r.get("version_notes"),
            is_starred=bool(r.get("is_starred", False)),
        )

    def _map_row_to_detail(self, r: Dict[str, Any]) -> CustomizationHistoryDetail:
        base_item = self._map_row_to_item(r)
        res_json = r.get("tailored_result", {})
        if isinstance(res_json, str):
            res_json = json.loads(res_json)

        return CustomizationHistoryDetail(
            **base_item.model_dump(),
            job_description=r.get("job_description", ""),
            tailored_result=TailoredResumeResponse(**res_json),
        )

    async def list_history(
        self,
        user_id: str,
        user_token: Optional[str] = None,
        resume_id: Optional[str] = None,
        root_id: Optional[str] = None,
        is_starred: Optional[bool] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
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
                params = [f"user_id=eq.{user_id}"]
                if resume_id:
                    params.append(f"resume_id=eq.{resume_id}")
                if root_id:
                    params.append(f"root_id=eq.{root_id}")
                if is_starred is not None:
                    params.append(f"is_starred=eq.{str(is_starred).lower()}")
                if tag:
                    params.append(f"version_tags=cs.{{{tag}}}")
                if search:
                    safe_search = search.replace(",", "").replace(".", "")
                    params.append(f"or=(title.ilike.*{safe_search}*,version_name.ilike.*{safe_search}*)")

                params.append("order=created_at.desc")
                params.append(f"limit={max(1, min(limit, 100))}")
                params.append(f"offset={max(0, offset)}")

                url = f"{base}/rest/v1/customization_history?{'&'.join(params)}"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Accept": "application/json",
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    rows = resp.json()
                    return [self._map_row_to_item(r) for r in rows]
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
            query = "SELECT * FROM customization_history WHERE user_id = ?"
            params_sql = [user_id]
            if resume_id:
                query += " AND resume_id = ?"
                params_sql.append(resume_id)
            if root_id:
                query += " AND root_id = ?"
                params_sql.append(root_id)
            if is_starred is not None:
                query += " AND is_starred = ?"
                params_sql.append(1 if is_starred else 0)
            if tag:
                query += " AND version_tags LIKE ?"
                params_sql.append(f"%{tag}%")
            if search:
                query += " AND (title LIKE ? OR version_name LIKE ?)"
                params_sql.extend([f"%{search}%", f"%{search}%"])

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params_sql.extend([max(1, min(limit, 100)), max(0, offset)])

            cursor.execute(query, tuple(params_sql))
            rows = cursor.fetchall()
            return [self._map_row_to_item(dict(r)) for r in rows]

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
                        return self._map_row_to_detail(rows[0])
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
            return self._map_row_to_detail(dict(row))

    async def save_history(
        self,
        user_id: str,
        request: SaveHistoryRequest,
        user_token: Optional[str] = None,
    ) -> CustomizationHistoryItem:
        history_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        resume_id = getattr(request, "resume_id", None)
        parent_id = getattr(request, "parent_id", None)
        version_name = getattr(request, "version_name", None)
        version_tags = getattr(request, "version_tags", []) or []
        version_notes = getattr(request, "version_notes", None)

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
                payload: Dict[str, Any] = {
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
                if parent_id:
                    payload["parent_id"] = parent_id
                if version_name:
                    payload["version_name"] = version_name
                if version_tags:
                    payload["version_tags"] = version_tags
                if version_notes:
                    payload["version_notes"] = version_notes

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    rows = resp.json()
                    if isinstance(rows, list) and len(rows) > 0:
                        return self._map_row_to_item(rows[0])
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
                        version_name=version_name,
                        version_number=1,
                        parent_id=parent_id,
                        root_id=history_id if not parent_id else None,
                        version_tags=version_tags,
                        version_notes=version_notes,
                        is_starred=False,
                    )
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to persist history to cloud database: HTTP {resp.status_code} - {resp.text}",
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

        # SQLite fallback calculation
        root_id = history_id
        version_num = 1
        with sqlite3.connect(self._sqlite_path) as conn:
            cursor = conn.cursor()
            if parent_id:
                cursor.execute(
                    "SELECT root_id, version_number FROM customization_history WHERE id = ? AND user_id = ?",
                    (parent_id, user_id),
                )
                parent_row = cursor.fetchone()
                if not parent_row:
                    raise HTTPException(status_code=404, detail="Parent version not found")
                parent_root = parent_row[0] or parent_id
                root_id = parent_root
                cursor.execute(
                    "SELECT COALESCE(MAX(version_number), 0) + 1 FROM customization_history WHERE user_id = ? AND root_id = ?",
                    (user_id, root_id),
                )
                version_num = cursor.fetchone()[0]

            v_name = version_name or f"v{version_num} - {request.title or 'Customized Resume'}"

            insert_sql = """
            INSERT INTO customization_history
            (id, user_id, resume_id, title, target_role, job_description, customization_engine, is_llm_generated, match_score, ats_score, tailored_result, created_at, updated_at, version_name, version_number, parent_id, root_id, version_tags, version_notes, is_starred)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(
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
                    v_name,
                    version_num,
                    parent_id,
                    root_id,
                    json.dumps(version_tags),
                    version_notes,
                    0,
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
            version_name=v_name,
            version_number=version_num,
            parent_id=parent_id,
            root_id=root_id,
            version_tags=version_tags,
            version_notes=version_notes,
            is_starred=False,
        )

    async def fork_version(
        self,
        user_id: str,
        version_id: str,
        request: ForkVersionRequest,
        user_token: Optional[str] = None,
    ) -> CustomizationHistoryItem:
        parent = await self.get_history_detail(user_id, version_id, user_token)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent version not found or you are not authorized to fork it",
            )

        save_req = SaveHistoryRequest(
            title=request.new_title or parent.title,
            target_role=parent.target_role,
            job_description=parent.job_description,
            tailored_result=parent.tailored_result,
            resume_id=parent.resume_id,
            parent_id=version_id,
            version_name=request.new_version_name,
            version_notes=request.version_notes,
            version_tags=request.version_tags or [],
        )
        return await self.save_history(user_id, save_req, user_token)

    async def update_version_metadata(
        self,
        user_id: str,
        version_id: str,
        request: UpdateVersionMetadataRequest,
        user_token: Optional[str] = None,
    ) -> Optional[CustomizationHistoryItem]:
        now_iso = datetime.now(timezone.utc).isoformat()
        payload: Dict[str, Any] = {"updated_at": now_iso}

        if request.title is not None:
            payload["title"] = request.title
        if request.version_name is not None:
            payload["version_name"] = request.version_name
        if request.version_notes is not None:
            payload["version_notes"] = request.version_notes
        if request.version_tags is not None:
            payload["version_tags"] = request.version_tags
        if request.is_starred is not None:
            payload["is_starred"] = request.is_starred

        if self._is_production() and not self._use_supabase():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cloud database is not configured in production environment.",
            )

        if self._use_supabase():
            try:
                base = settings.SUPABASE_URL.rstrip("/")
                url = f"{base}/rest/v1/customization_history?id=eq.{version_id}&user_id=eq.{user_id}"
                headers = {
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {user_token or settings.SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.patch(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows:
                        return self._map_row_to_item(rows[0])
                    return None
                elif self._is_production():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to update version metadata: HTTP {resp.status_code}",
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
            set_clauses = ["updated_at = ?"]
            params = [now_iso]

            if request.title is not None:
                set_clauses.append("title = ?")
                params.append(request.title)
            if request.version_name is not None:
                set_clauses.append("version_name = ?")
                params.append(request.version_name)
            if request.version_notes is not None:
                set_clauses.append("version_notes = ?")
                params.append(request.version_notes)
            if request.version_tags is not None:
                set_clauses.append("version_tags = ?")
                params.append(json.dumps(request.version_tags))
            if request.is_starred is not None:
                set_clauses.append("is_starred = ?")
                params.append(1 if request.is_starred else 0)

            params.extend([version_id, user_id])
            cursor.execute(
                f"UPDATE customization_history SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?",
                tuple(params),
            )
            conn.commit()
            if cursor.rowcount == 0:
                return None

            cursor.execute("SELECT * FROM customization_history WHERE id = ? AND user_id = ?", (version_id, user_id))
            row = cursor.fetchone()
            return self._map_row_to_item(dict(row)) if row else None

    async def compare_versions(
        self,
        user_id: str,
        version_a_id: str,
        version_b_id: str,
        user_token: Optional[str] = None,
    ) -> VersionComparisonResponse:
        detail_a = await self.get_history_detail(user_id, version_a_id, user_token)
        detail_b = await self.get_history_detail(user_id, version_b_id, user_token)

        if not detail_a or not detail_b:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both versions not found or you are not authorized to compare them",
            )

        # 1. Score comparisons
        match_a = detail_a.match_score
        match_b = detail_b.match_score
        match_delta = (match_b - match_a) if (match_a is not None and match_b is not None) else None

        ats_a = detail_a.ats_score
        ats_b = detail_b.ats_score
        ats_delta = (ats_b - ats_a) if (ats_a is not None and ats_b is not None) else None

        # 2. Summary comparison
        sum_a = detail_a.tailored_result.tailored_summary or ""
        sum_b = detail_b.tailored_result.tailored_summary or ""
        sum_changed = sum_a.strip() != sum_b.strip()

        # 3. Skills comparison
        def extract_skills(detail: CustomizationHistoryDetail) -> List[str]:
            res = detail.tailored_result
            if not res or not res.skills:
                return []
            return (res.skills.matching_skills or []) + (res.skills.additional_skills or [])

        skills_a = extract_skills(detail_a)
        skills_b = extract_skills(detail_b)
        norm_a = {s.strip().lower(): s.strip() for s in skills_a if s.strip()}
        norm_b = {s.strip().lower(): s.strip() for s in skills_b if s.strip()}

        added_skills = [norm_b[k] for k in norm_b if k not in norm_a]
        removed_skills = [norm_a[k] for k in norm_a if k not in norm_b]
        shared_skills = [norm_b[k] for k in norm_b if k in norm_a]

        # 4. Experience bullet changes
        exp_a_map: Dict[tuple, Any] = {}
        for item in (detail_a.tailored_result.experience or []):
            k = (item.company.strip().lower(), item.role.strip().lower())
            exp_a_map[k] = item

        exp_b_map: Dict[tuple, Any] = {}
        for item in (detail_b.tailored_result.experience or []):
            k = (item.company.strip().lower(), item.role.strip().lower())
            exp_b_map[k] = item

        all_keys = list(dict.fromkeys(list(exp_a_map.keys()) + list(exp_b_map.keys())))
        exp_diffs: List[ExperienceDiff] = []
        for key in all_keys:
            item_a = exp_a_map.get(key)
            item_b = exp_b_map.get(key)
            role = item_b.role if item_b else (item_a.role if item_a else "")
            company = item_b.company if item_b else (item_a.company if item_a else "")
            bullets_a = item_a.bullets if item_a else []
            bullets_b = item_b.bullets if item_b else []

            b_map_a = {b.strip().lower(): b.strip() for b in bullets_a if b.strip()}
            b_map_b = {b.strip().lower(): b.strip() for b in bullets_b if b.strip()}

            added_b = [b_map_b[k] for k in b_map_b if k not in b_map_a]
            removed_b = [b_map_a[k] for k in b_map_a if k not in b_map_b]
            unchanged_b = [b_map_b[k] for k in b_map_b if k in b_map_a]

            exp_diffs.append(
                ExperienceDiff(
                    role=role,
                    company=company,
                    added_bullets=added_b,
                    removed_bullets=removed_b,
                    unchanged_bullets=unchanged_b,
                )
            )

        return VersionComparisonResponse(
            version_a_id=detail_a.id,
            version_b_id=detail_b.id,
            version_a_name=detail_a.version_name,
            version_b_name=detail_b.version_name,
            version_a_number=detail_a.version_number,
            version_b_number=detail_b.version_number,
            match_score_a=match_a,
            match_score_b=match_b,
            match_score_delta=match_delta,
            ats_score_a=ats_a,
            ats_score_b=ats_b,
            ats_score_delta=ats_delta,
            summary_a=sum_a,
            summary_b=sum_b,
            summary_changed=sum_changed,
            added_skills=added_skills,
            removed_skills=removed_skills,
            shared_skills=shared_skills,
            experience_diffs=exp_diffs,
            title_a=detail_a.title,
            title_b=detail_b.title,
            created_at_a=detail_a.created_at,
            created_at_b=detail_b.created_at,
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
