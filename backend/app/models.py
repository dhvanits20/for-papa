from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    share_token: str
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class CommentSchema(BaseModel):
    author: str
    text: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class MemoryBase(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    year: int
    month: int

class MemoryCreate(MemoryBase):
    pass

class MemoryResponse(MemoryBase):
    id: str
    user_id: str
    file_path: str
    file_type: str
    reactions: Dict[str, int] = Field(default_factory=lambda: {"love": 0, "haha": 0, "wow": 0, "sad": 0})
    comments: List[CommentSchema] = Field(default_factory=list)
    created_at: str
    is_deleted: bool = False
    is_favorite: bool = False
    tags: List[str] = Field(default_factory=list)
    location_name: Optional[str] = None

class ReactionRequest(BaseModel):
    reaction_type: str  # e.g., "love", "haha", "wow", "sad"

class CommentRequest(BaseModel):
    author: str
    text: str

class CoverResponse(BaseModel):
    year_month: str  # YYYY-MM
    memory_id: str
    user_id: str

class PinVerifyRequest(BaseModel):
    pin: str
