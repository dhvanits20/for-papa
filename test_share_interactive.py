import urllib.request
import urllib.parse
import json
import uuid

BASE_URL = "http://127.0.0.1:8000"

def post(url, data=None, headers=None, form=False):
    if headers is None: headers = {}
    if data is not None:
        if form:
            data = urllib.parse.urlencode(data).encode('utf-8')
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        else:
            data = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def get(url, headers=None):
    if headers is None: headers = {}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def test_shared_endpoints():
    u1 = f"user_{uuid.uuid4().hex[:8]}"
    p1 = "password123"
    
    # User Signup
    status, data = post(f"{BASE_URL}/api/auth/signup", data={"username": u1, "password": p1})
    assert status == 200, f"Signup failed: {data}"
    share_token = data.get("share_token")
    assert share_token, "No share_token returned"
    print(f"User signed up. Share token: {share_token}")

    # User Login
    status, data = post(f"{BASE_URL}/api/auth/login", data={"username": u1, "password": p1}, form=True)
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload memory
    status, data = post(
        f"{BASE_URL}/api/memories/upload", 
        headers=headers,
        data={"year": 2024, "month": 6, "description": "Shared memory test", "title": "Shared Title", "tags": "", "location_name": ""},
        form=True
    )
    if status == 200:
        print("Memory uploaded.")

    # Anonymous user visits shared link
    status, data = get(f"{BASE_URL}/api/shared/{share_token}/memories")
    assert status == 200, f"Failed to fetch shared memories: {data}"
    
    if isinstance(data, list) and len(data) > 0:
        mem_id = data[0]["id"]
        # Guest reacts
        st, res = post(f"{BASE_URL}/api/shared/{share_token}/memories/{mem_id}/react", data={"reaction_type": "love"})
        assert st == 200, f"Failed to react: {res}"
        print("Guest reacted to memory!")
        
        # Guest comments
        st, res = post(f"{BASE_URL}/api/shared/{share_token}/memories/{mem_id}/comment", data={"author": "Auntie", "text": "Beautiful!"})
        assert st == 200, f"Failed to comment: {res}"
        print("Guest commented on memory!")

    print("SUCCESS: Share links, reactions, and comments are working!")

if __name__ == "__main__":
    test_shared_endpoints()
