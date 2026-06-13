import os
import uuid
import mimetypes
import json
import cloudinary
import cloudinary.uploader
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from app.config import settings
from app.database import db
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

# Configure Cloudinary if credentials exist
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )
    print("Cloudinary configured for remote storage.")
else:
    print("Cloudinary not configured. Falling back to local storage.")

from app.models import (
    MemoryResponse,
    ReactionRequest,
    CommentRequest,
    CommentSchema,
    UserCreate,
    UserResponse,
    Token
)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(user: UserCreate):
    existing = await db.get_user_by_username(user.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_id = str(uuid.uuid4())
    share_token = uuid.uuid4().hex
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "id": user_id,
        "username": user.username,
        "password_hash": hashed_password,
        "share_token": share_token,
        "created_at": datetime.utcnow().isoformat()
    }
    created = await db.create_user(user_dict)
    if not created:
        raise HTTPException(status_code=500, detail="Could not create user")
    return created

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "user_id": user["id"]}
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/api/memories/upload", response_model=List[MemoryResponse])
async def upload_memories(
    year: int = Form(...),
    month: int = Form(...),
    title: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form(""),
    location_name: Optional[str] = Form(""),
    files: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user)
):
    # Create target directory for YYYY/MM/
    target_dir = os.path.join(settings.STORAGE_DIR, str(year), f"{month:02d}")
    os.makedirs(target_dir, exist_ok=True)

    saved_memories = []
    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    if not files and description:
        memory_id = str(uuid.uuid4())
        memory_data = {
            "id": memory_id,
            "user_id": current_user["user_id"],
            "title": title,
            "description": description,
            "file_path": "",
            "file_type": "text/quote",
            "year": year,
            "month": month,
            "reactions": {"love": 0, "haha": 0, "wow": 0, "sad": 0},
            "comments": [],
            "created_at": datetime.utcnow().isoformat(),
            "is_deleted": False,
            "is_favorite": False,
            "tags": parsed_tags,
            "location_name": location_name or None
        }
        saved = await db.create_memory(memory_data)
        saved_memories.append(saved)
    elif files:
        for file in files:
            content = await file.read()
            mime_type = file.content_type or "application/octet-stream"
            
            if settings.CLOUDINARY_CLOUD_NAME:
                # Upload to Cloudinary
                resource_type = "video" if mime_type.startswith("video") else "image"
                upload_result = cloudinary.uploader.upload(
                    content, 
                    resource_type=resource_type,
                    folder="for-papa"
                )
                rel_path = upload_result.get("secure_url")
            else:
                # Generate unique filename to avoid overwrites
                file_ext = os.path.splitext(file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_ext}"
                full_path = os.path.join(target_dir, unique_filename)
    
                # Write file to local storage
                with open(full_path, "wb") as f:
                    f.write(content)
    
                # Relativize path for database storage to maintain portability
                rel_path = os.path.relpath(full_path, start=settings.STORAGE_DIR).replace("\\", "/")

            memory_id = str(uuid.uuid4())
            memory_data = {
                "id": memory_id,
                "user_id": current_user["user_id"],
                "title": title,
                "description": description,
                "file_path": rel_path,
                "file_type": mime_type,
                "year": year,
                "month": month,
                "reactions": {"love": 0, "haha": 0, "wow": 0, "sad": 0},
                "comments": [],
                "created_at": datetime.utcnow().isoformat(),
                "is_deleted": False,
                "is_favorite": False,
                "tags": parsed_tags,
                "location_name": location_name or None
            }

            # Save to database
            saved = await db.create_memory(memory_data)
            saved_memories.append(saved)

    return saved_memories

@app.get("/api/memories", response_model=List[MemoryResponse])
async def list_memories(
    year: Optional[int] = None, 
    month: Optional[int] = None,
    search: Optional[str] = None,
    favorites_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    return await db.list_memories(current_user["user_id"], year, month, search, favorites_only)

@app.get("/api/memories/stats")
async def get_memories_stats(current_user: dict = Depends(get_current_user)):
    return await db.get_stats(current_user["user_id"])

@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    success = await db.delete_memory(memory_id, current_user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "success", "message": "Memory soft-deleted"}

@app.post("/api/memories/{memory_id}/favorite", response_model=MemoryResponse)
async def toggle_favorite(memory_id: str, current_user: dict = Depends(get_current_user)):
    updated = await db.toggle_favorite(memory_id, current_user["user_id"])
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.post("/api/memories/{memory_id}/react", response_model=MemoryResponse)
async def react_to_memory(memory_id: str, req: ReactionRequest, current_user: dict = Depends(get_current_user)):
    updated = await db.add_reaction(memory_id, current_user["user_id"], req.reaction_type)
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.post("/api/memories/{memory_id}/comment", response_model=MemoryResponse)
async def comment_on_memory(memory_id: str, req: CommentRequest, current_user: dict = Depends(get_current_user)):
    comment_dict = {
        "author": req.author,
        "text": req.text,
        "created_at": datetime.utcnow().isoformat()
    }
    updated = await db.add_comment(memory_id, current_user["user_id"], comment_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.get("/api/covers")
async def get_covers(current_user: dict = Depends(get_current_user)):
    return await db.get_covers(current_user["user_id"])

@app.post("/api/covers")
async def set_cover_memory(
    year_month: str,  # YYYY-MM
    memory_id: str,
    current_user: dict = Depends(get_current_user)
):
    success = await db.set_cover(year_month, memory_id, current_user["user_id"])
    return {"status": "success", "year_month": year_month, "memory_id": memory_id}


@app.get("/api/shared/{share_token}/memories", response_model=List[MemoryResponse])
async def list_shared_memories(
    share_token: str,
    year: Optional[int] = None, 
    month: Optional[int] = None,
    search: Optional[str] = None,
    favorites_only: bool = False
):
    user = await db.get_user_by_share_token(share_token)
    if not user:
        raise HTTPException(status_code=404, detail="Shared album not found")
    return await db.list_memories(user["id"], year, month, search, favorites_only)

@app.get("/api/shared/{share_token}/stats")
async def get_shared_stats(share_token: str):
    user = await db.get_user_by_share_token(share_token)
    if not user:
        raise HTTPException(status_code=404, detail="Shared album not found")
    return await db.get_stats(user["id"])

@app.get("/api/shared/{share_token}/covers")
async def get_shared_covers(share_token: str):
    user = await db.get_user_by_share_token(share_token)
    if not user:
        raise HTTPException(status_code=404, detail="Shared album not found")
    return await db.get_covers(user["id"])

@app.post("/api/shared/{share_token}/memories/{memory_id}/react")
async def shared_react_to_memory(share_token: str, memory_id: str, req: ReactionRequest):
    user = await db.get_user_by_share_token(share_token)
    if not user:
        raise HTTPException(status_code=404, detail="Shared album not found")
    res = await db.add_reaction(memory_id, user["id"], req.reaction_type)
    if not res:
        raise HTTPException(status_code=404, detail="Memory not found")
    return res

@app.post("/api/shared/{share_token}/memories/{memory_id}/comment")
async def shared_comment_on_memory(share_token: str, memory_id: str, req: CommentRequest):
    user = await db.get_user_by_share_token(share_token)
    if not user:
        raise HTTPException(status_code=404, detail="Shared album not found")
    
    comment_dict = {
        "author": req.author,
        "text": req.text,
        "created_at": datetime.utcnow().isoformat()
    }
    res = await db.add_comment(memory_id, user["id"], comment_dict)
    if not res:
        raise HTTPException(status_code=404, detail="Memory not found")
    return res

# File streaming helper with Range header support for large videos
def range_streamer(file_path: str, start: int, end: int, chunk_size: int = 8192):
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            to_read = min(chunk_size, remaining)
            data = f.read(to_read)
            if not data:
                break
            remaining -= len(data)
            yield data

@app.get("/api/memories/{memory_id}/file")
async def stream_memory_file(memory_id: str, token: Optional[str] = None, share_token: Optional[str] = None, range: Optional[str] = Header(None)):
    user_id = None
    if share_token:
        user = await db.get_user_by_share_token(share_token)
        if user:
            user_id = user["id"]
    
    if not user_id and token:
        from jose import jwt, JWTError
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("user_id")
        except JWTError:
            pass
            
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token or share token")

    memory = await db.get_memory(memory_id, user_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory metadata not found")

    file_path = memory["file_path"]
    if file_path.startswith("http://") or file_path.startswith("https://"):
        return RedirectResponse(url=file_path)

    full_path = os.path.join(settings.STORAGE_DIR, file_path.replace("/", os.sep))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Physical file not found on disk")

    file_size = os.path.getsize(full_path)
    content_type = memory["file_type"]

    if range:
        # Range header format: bytes=start-end (e.g. bytes=0-1023)
        try:
            range_val = range.replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
            
            # Bound check
            if start >= file_size:
                raise HTTPException(
                    status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                    detail=f"Range start {start} is out of bounds for size {file_size}"
                )
            
            end = min(end, file_size - 1)
            content_length = end - start + 1

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type
            }

            return StreamingResponse(
                range_streamer(full_path, start, end),
                status_code=206,
                headers=headers
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Range header format")

    # If no Range header, return the whole file
    return FileResponse(
        full_path,
        media_type=content_type,
        filename=os.path.basename(full_path)
    )

# Serve React Frontend
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Not Found")

