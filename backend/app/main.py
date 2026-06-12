import os
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import db
from app.models import (
    MemoryResponse,
    ReactionRequest,
    CommentRequest,
    CommentSchema,
    PinVerifyRequest
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

# Helper function to check Pin Header
def verify_pin(curator_pin: Optional[str] = Header(None, alias="X-Curator-PIN")):
    if curator_pin != settings.CURATOR_PIN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Curator PIN"
        )
    return True

@app.post("/api/auth/verify")
async def verify_auth_pin(req: PinVerifyRequest):
    if req.pin == settings.CURATOR_PIN:
        return {"status": "success", "message": "Authenticated"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid PIN"
    )

@app.post("/api/memories/upload", response_model=List[MemoryResponse])
async def upload_memories(
    year: int = Form(...),
    month: int = Form(...),
    title: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form(""),
    location_name: Optional[str] = Form(""),
    files: Optional[List[UploadFile]] = File(None)
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
            # Generate unique filename to avoid overwrites
            file_ext = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            full_path = os.path.join(target_dir, unique_filename)

            # Write file to local storage
            with open(full_path, "wb") as f:
                content = await file.read()
                f.write(content)

            # Determine mime type
            mime_type, _ = mimetypes.guess_type(full_path)
            if not mime_type:
                mime_type = "application/octet-stream"

            # Relativize path for database storage to maintain portability
            rel_path = os.path.relpath(full_path, start=settings.STORAGE_DIR).replace("\\", "/")

            memory_id = str(uuid.uuid4())
            memory_data = {
                "id": memory_id,
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
    favorites_only: bool = False
):
    return await db.list_memories(year, month, search, favorites_only)

@app.get("/api/memories/stats")
async def get_memories_stats():
    return await db.get_stats()

@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: str, verified: bool = Depends(verify_pin)):
    success = await db.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "success", "message": "Memory soft-deleted"}

@app.post("/api/memories/{memory_id}/favorite", response_model=MemoryResponse)
async def toggle_favorite(memory_id: str, verified: bool = Depends(verify_pin)):
    updated = await db.toggle_favorite(memory_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.post("/api/memories/{memory_id}/react", response_model=MemoryResponse)
async def react_to_memory(memory_id: str, req: ReactionRequest):
    updated = await db.add_reaction(memory_id, req.reaction_type)
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.post("/api/memories/{memory_id}/comment", response_model=MemoryResponse)
async def comment_on_memory(memory_id: str, req: CommentRequest):
    comment_dict = {
        "author": req.author,
        "text": req.text,
        "created_at": datetime.utcnow().isoformat()
    }
    updated = await db.add_comment(memory_id, comment_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return updated

@app.get("/api/covers")
async def get_covers():
    return await db.get_covers()

@app.post("/api/covers")
async def set_cover_memory(
    year_month: str,  # YYYY-MM
    memory_id: str,
    verified: bool = Depends(verify_pin)
):
    success = await db.set_cover(year_month, memory_id)
    return {"status": "success", "year_month": year_month, "memory_id": memory_id}


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
async def stream_memory_file(memory_id: str, range: Optional[str] = Header(None)):
    memory = await db.get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory metadata not found")

    full_path = os.path.join(settings.STORAGE_DIR, memory["file_path"].replace("/", os.sep))
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

