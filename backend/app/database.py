import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.config import settings

class SQLiteRepo:
    def __init__(self, db_path: str = "memories.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            # Create users table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE,
                    password_hash TEXT,
                    share_token TEXT UNIQUE,
                    created_at TEXT
                )
            """)
            # Create memories table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    title TEXT,
                    description TEXT,
                    file_path TEXT,
                    file_type TEXT,
                    year INTEGER,
                    month INTEGER,
                    reactions TEXT,
                    comments TEXT,
                    created_at TEXT,
                    is_deleted INTEGER DEFAULT 0,
                    is_favorite INTEGER DEFAULT 0,
                    tags TEXT DEFAULT '[]',
                    location_name TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)
            # Create covers table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS covers (
                    year_month TEXT,
                    user_id TEXT,
                    memory_id TEXT,
                    PRIMARY KEY (year_month, user_id),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)
            
            # Migration: add user_id if table was created before
            try:
                conn.execute("ALTER TABLE memories ADD COLUMN user_id TEXT")
            except sqlite3.OperationalError:
                pass
            try:
                conn.execute("ALTER TABLE covers ADD COLUMN user_id TEXT")
            except sqlite3.OperationalError:
                pass
            try:
                conn.execute("ALTER TABLE users ADD COLUMN share_token TEXT")
                # Assign a unique share_token to existing users
                rows = conn.execute("SELECT id FROM users WHERE share_token IS NULL").fetchall()
                for r in rows:
                    conn.execute("UPDATE users SET share_token = ? WHERE id = ?", (uuid.uuid4().hex, r["id"]))
            except sqlite3.OperationalError:
                pass
            
            conn.commit()

    async def create_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_conn() as conn:
            try:
                conn.execute(
                    "INSERT INTO users (id, username, password_hash, share_token, created_at) VALUES (?, ?, ?, ?, ?)",
                    (user["id"], user["username"], user["password_hash"], user["share_token"], user["created_at"])
                )
                conn.commit()
                return user
            except sqlite3.IntegrityError:
                return None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            if not row:
                return None
            return dict(row)

    async def get_user_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM users WHERE share_token = ?", (share_token,)).fetchone()
            if not row:
                return None
            return dict(row)

    async def create_memory(self, m: Dict[str, Any]) -> Dict[str, Any]:
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO memories (id, user_id, title, description, file_path, file_type, year, month, reactions, comments, created_at, is_deleted, is_favorite, tags, location_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    m["id"],
                    m["user_id"],
                    m.get("title", ""),
                    m.get("description", ""),
                    m["file_path"],
                    m["file_type"],
                    m["year"],
                    m["month"],
                    json.dumps(m.get("reactions", {"love": 0, "haha": 0, "wow": 0, "sad": 0})),
                    json.dumps(m.get("comments", [])),
                    m["created_at"],
                    1 if m.get("is_deleted", False) else 0,
                    1 if m.get("is_favorite", False) else 0,
                    json.dumps(m.get("tags", [])),
                    m.get("location_name")
                )
            )
            conn.commit()
        return m

    async def get_memory(self, memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id)).fetchone()
            if not row:
                return None
            m = dict(row)
            m["reactions"] = json.loads(m["reactions"])
            m["comments"] = json.loads(m["comments"])
            m["is_deleted"] = bool(m["is_deleted"])
            m["is_favorite"] = bool(m.get("is_favorite", 0))
            m["tags"] = json.loads(m.get("tags", "[]") or "[]")
            return m

    async def list_memories(self, user_id: str, year: Optional[int] = None, month: Optional[int] = None, search: Optional[str] = None, favorites_only: bool = False) -> List[Dict[str, Any]]:
        query = "SELECT * FROM memories WHERE is_deleted = 0 AND user_id = ?"
        params = [user_id]
        if year is not None:
            query += " AND year = ?"
            params.append(year)
        if month is not None:
            query += " AND month = ?"
            params.append(month)
        if favorites_only:
            query += " AND is_favorite = 1"
        if search:
            search_param = f"%{search}%"
            query += " AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR location_name LIKE ?)"
            params.extend([search_param, search_param, search_param, search_param])
        
        query += " ORDER BY created_at DESC"
        
        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            memories = []
            for r in rows:
                m = dict(r)
                m["reactions"] = json.loads(m["reactions"])
                m["comments"] = json.loads(m["comments"])
                m["is_deleted"] = bool(m["is_deleted"])
                m["is_favorite"] = bool(m.get("is_favorite", 0))
                m["tags"] = json.loads(m.get("tags", "[]") or "[]")
                memories.append(m)
            return memories

    async def delete_memory(self, memory_id: str, user_id: str) -> bool:
        with self._get_conn() as conn:
            cursor = conn.execute("UPDATE memories SET is_deleted = 1 WHERE id = ? AND user_id = ?", (memory_id, user_id))
            if cursor.rowcount > 0:
                conn.execute("DELETE FROM covers WHERE memory_id = ? AND user_id = ?", (memory_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    async def toggle_favorite(self, memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            conn.execute("UPDATE memories SET is_favorite = 1 - is_favorite WHERE id = ? AND user_id = ?", (memory_id, user_id))
            conn.commit()
        return await self.get_memory(memory_id, user_id)

    async def add_reaction(self, memory_id: str, user_id: str, r_type: str) -> Optional[Dict[str, Any]]:
        m = await self.get_memory(memory_id, user_id)
        if not m:
            return None
        reactions = m["reactions"]
        reactions[r_type] = reactions.get(r_type, 0) + 1
        
        with self._get_conn() as conn:
            conn.execute("UPDATE memories SET reactions = ? WHERE id = ? AND user_id = ?", (json.dumps(reactions), memory_id, user_id))
            conn.commit()
        m["reactions"] = reactions
        return m

    async def add_comment(self, memory_id: str, user_id: str, comment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        m = await self.get_memory(memory_id, user_id)
        if not m:
            return None
        comments = m["comments"]
        comments.append(comment)
        
        with self._get_conn() as conn:
            conn.execute("UPDATE memories SET comments = ? WHERE id = ? AND user_id = ?", (json.dumps(comments), memory_id, user_id))
            conn.commit()
        m["comments"] = comments
        return m

    async def get_stats(self, user_id: str) -> List[Dict[str, Any]]:
        # Returns count of active memories grouped by year and month
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT year, month, COUNT(*) as count 
                FROM memories 
                WHERE is_deleted = 0 AND user_id = ?
                GROUP BY year, month
            """, (user_id,)).fetchall()
            return [dict(r) for r in rows]

    async def get_covers(self, user_id: str) -> Dict[str, str]:
        with self._get_conn() as conn:
            rows = conn.execute("SELECT * FROM covers WHERE user_id = ?", (user_id,)).fetchall()
            return {r["year_month"]: r["memory_id"] for r in rows}

    async def set_cover(self, year_month: str, memory_id: str, user_id: str) -> bool:
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO covers (year_month, user_id, memory_id) 
                VALUES (?, ?, ?) 
                ON CONFLICT(year_month, user_id) DO UPDATE SET memory_id = excluded.memory_id
            """, (year_month, user_id, memory_id))
            conn.commit()
            
        return True


class MongoRepo:
    def __init__(self, uri: str, db_name: str):
        self.uri = uri
        self.db_name = db_name
        self._client = None
        self._db = None

    def _get_db(self):
        if self._client is None:
            from motor.motor_asyncio import AsyncIOMotorClient
            self._client = AsyncIOMotorClient(self.uri)
            self._db = self._client[self.db_name]
        return self._db

    @property
    def users(self):
        return self._get_db()["users"]

    @property
    def memories(self):
        return self._get_db()["memories"]

    @property
    def covers(self):
        return self._get_db()["covers"]

    async def create_user(self, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            await self.users.insert_one(user)
            return user
        except Exception:
            # Catch duplicate key error
            return None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        user = await self.users.find_one({"username": username})
        if user:
            user.pop("_id", None)
        return user

    async def get_user_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        user = await self.users.find_one({"share_token": share_token})
        if user:
            user.pop("_id", None)
        return user

    async def create_memory(self, m: Dict[str, Any]) -> Dict[str, Any]:
        await self.memories.insert_one(m)
        return m

    async def get_memory(self, memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        m = await self.memories.find_one({"id": memory_id, "user_id": user_id})
        if m:
            m.pop("_id", None)
        return m

    async def list_memories(self, user_id: str, year: Optional[int] = None, month: Optional[int] = None, search: Optional[str] = None, favorites_only: bool = False) -> List[Dict[str, Any]]:
        query = {"is_deleted": False, "user_id": user_id}
        if year is not None:
            query["year"] = year
        if month is not None:
            query["month"] = month
        if favorites_only:
            query["is_favorite"] = True
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}},
                {"location_name": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = self.memories.find(query).sort("created_at", -1)
        memories = []
        async for doc in cursor:
            doc.pop("_id", None)
            memories.append(doc)
        return memories

    async def delete_memory(self, memory_id: str, user_id: str) -> bool:
        res = await self.memories.update_one({"id": memory_id, "user_id": user_id}, {"$set": {"is_deleted": True}})
        if res.modified_count > 0:
            await self.covers.delete_one({"memory_id": memory_id, "user_id": user_id})
        return res.modified_count > 0

    async def toggle_favorite(self, memory_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        m = await self.memories.find_one({"id": memory_id, "user_id": user_id})
        if not m:
            return None
        current = m.get("is_favorite", False)
        res = await self.memories.find_one_and_update(
            {"id": memory_id, "user_id": user_id},
            {"$set": {"is_favorite": not current}},
            return_document=True
        )
        if res:
            res.pop("_id", None)
        return res

    async def add_reaction(self, memory_id: str, user_id: str, r_type: str) -> Optional[Dict[str, Any]]:
        res = await self.memories.find_one_and_update(
            {"id": memory_id, "user_id": user_id},
            {"$inc": {f"reactions.{r_type}": 1}},
            return_document=True
        )
        if res:
            res.pop("_id", None)
        return res

    async def add_comment(self, memory_id: str, user_id: str, comment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        res = await self.memories.find_one_and_update(
            {"id": memory_id, "user_id": user_id},
            {"$push": {"comments": comment}},
            return_document=True
        )
        if res:
            res.pop("_id", None)
        return res

    async def get_stats(self, user_id: str) -> List[Dict[str, Any]]:
        pipeline = [
            {"$match": {"is_deleted": False, "user_id": user_id}},
            {"$group": {
                "_id": {"year": "$year", "month": "$month"},
                "count": {"$sum": 1}
            }}
        ]
        cursor = self.memories.aggregate(pipeline)
        stats = []
        async for doc in cursor:
            stats.append({
                "year": doc["_id"]["year"],
                "month": doc["_id"]["month"],
                "count": doc["count"]
            })
        return stats

    async def get_covers(self, user_id: str) -> Dict[str, str]:
        cursor = self.covers.find({"user_id": user_id})
        covers_map = {}
        async for doc in cursor:
            covers_map[doc["year_month"]] = doc["memory_id"]
        return covers_map

    async def set_cover(self, year_month: str, memory_id: str, user_id: str) -> bool:
        await self.covers.update_one(
            {"year_month": year_month, "user_id": user_id},
            {"$set": {"memory_id": memory_id}},
            upsert=True
        )
        return True


# Instantiate the active repository based on config settings
if settings.MONGODB_URI:
    print("Connecting to MongoDB database...")
    db = MongoRepo(settings.MONGODB_URI, settings.DATABASE_NAME)
else:
    print(f"Using local SQLite database at {settings.DATABASE_NAME}...")
    db_path = settings.DATABASE_NAME if settings.DATABASE_NAME.endswith('.db') else f"{settings.DATABASE_NAME}.db"
    db = SQLiteRepo(db_path=db_path)
