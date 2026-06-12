import os
import io
import shutil
import pytest
from fastapi.testclient import TestClient

# Mock settings before importing app
os.environ["STORAGE_DIR"] = os.path.abspath("test_storage")
os.environ["CURATOR_PIN"] = "8888"

from app.main import app
from app.database import db
from app.config import settings

client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_and_teardown():
    # Clean up DB and storage if they exist
    if os.path.exists("memories.db"):
        os.remove("memories.db")
    if os.path.exists("test_storage"):
        shutil.rmtree("test_storage")
    
    # Re-initialize DB
    db._init_db()
    
    yield
    
    # Cleanup after tests
    if os.path.exists("memories.db"):
        os.remove("memories.db")
    if os.path.exists("test_storage"):
        shutil.rmtree("test_storage")

def test_verify_pin():
    # Correct PIN
    res = client.post("/api/auth/verify", json={"pin": "8888"})
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Incorrect PIN
    res = client.post("/api/auth/verify", json={"pin": "0000"})
    assert res.status_code == 401

def test_upload_memories():
    # Prepare dummy files
    file1 = ("test1.jpg", io.BytesIO(b"dummy image data 1"), "image/jpeg")
    file2 = ("test2.mp4", io.BytesIO(b"dummy video data 2"), "video/mp4")

    form_data = {
        "year": 2026,
        "month": 6,
        "title": "Chai with Papa",
        "description": "Lovely afternoon sharing tea."
    }

    res = client.post(
        "/api/memories/upload",
        data=form_data,
        files=[("files", file1), ("files", file2)]
    )

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    
    assert data[0]["title"] == "Chai with Papa"
    assert data[0]["year"] == 2026
    assert data[0]["month"] == 6
    assert data[0]["file_type"] == "image/jpeg"
    
    assert data[1]["file_type"] == "video/mp4"

def test_list_memories_and_stats():
    # List all memories
    res = client.get("/api/memories")
    assert res.status_code == 200
    memories = res.json()
    assert len(memories) == 2

    # Filtered listing
    res = client.get("/api/memories?year=2026&month=6")
    assert res.status_code == 200
    assert len(res.json()) == 2

    res = client.get("/api/memories?year=2025")
    assert res.status_code == 200
    assert len(res.json()) == 0

    # Stats aggregation
    res = client.get("/api/memories/stats")
    assert res.status_code == 200
    stats = res.json()
    assert len(stats) == 1
    assert stats[0]["year"] == 2026
    assert stats[0]["month"] == 6
    assert stats[0]["count"] == 2

def test_reactions_and_comments():
    # Get memory ID
    res = client.get("/api/memories")
    memory_id = res.json()[0]["id"]

    # Add reaction
    res = client.post(f"/api/memories/{memory_id}/react", json={"reaction_type": "love"})
    assert res.status_code == 200
    assert res.json()["reactions"]["love"] == 1

    # Add another reaction
    res = client.post(f"/api/memories/{memory_id}/react", json={"reaction_type": "love"})
    assert res.json()["reactions"]["love"] == 2

    # Add comment
    res = client.post(
        f"/api/memories/{memory_id}/comment",
        json={"author": "Rahul", "text": "Miss you Papa!"}
    )
    assert res.status_code == 200
    comments = res.json()["comments"]
    assert len(comments) == 1
    assert comments[0]["author"] == "Rahul"
    assert comments[0]["text"] == "Miss you Papa!"

def test_covers():
    res = client.get("/api/memories")
    memory_id = res.json()[0]["id"]

    # Set cover photo (unauthorized without PIN header)
    res = client.post(f"/api/covers?year_month=2026-06&memory_id={memory_id}")
    assert res.status_code == 401

    # Set cover photo (authorized)
    res = client.post(
        f"/api/covers?year_month=2026-06&memory_id={memory_id}",
        headers={"X-Curator-PIN": "8888"}
    )
    assert res.status_code == 200

    # Get covers map
    res = client.get("/api/covers")
    assert res.status_code == 200
    assert res.json()["2026-06"] == memory_id

def test_range_stream_video():
    res = client.get("/api/memories")
    # Find the video memory
    video_memory = next(m for m in res.json() if m["file_type"] == "video/mp4")
    memory_id = video_memory["id"]

    # Stream whole file
    res = client.get(f"/api/memories/{memory_id}/file")
    assert res.status_code == 200
    assert res.content == b"dummy video data 2"

    # Stream partial content (Range: bytes=0-4)
    res = client.get(f"/api/memories/{memory_id}/file", headers={"Range": "bytes=0-4"})
    assert res.status_code == 206
    assert res.content == b"dummy"
    assert res.headers["Content-Range"] == "bytes 0-4/18"
    assert res.headers["Content-Length"] == "5"

def test_soft_delete():
    res = client.get("/api/memories")
    memory_id = res.json()[0]["id"]

    # Delete memory (unauthorized)
    res = client.delete(f"/api/memories/{memory_id}")
    assert res.status_code == 401

    # Delete memory (authorized)
    res = client.delete(f"/api/memories/{memory_id}", headers={"X-Curator-PIN": "8888"})
    assert res.status_code == 200

    # Verify memory is removed from default list
    res = client.get("/api/memories")
    assert len(res.json()) == 1
    assert res.json()[0]["id"] != memory_id
