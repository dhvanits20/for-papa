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
    
    if isinstance(data, list):
        print(f"Guest can see {len(data)} memories via share link!")
        if len(data) > 0:
            assert data[0]["title"] == "Shared Title"
    
    print("SUCCESS: Share links are working!")

if __name__ == "__main__":
    test_shared_endpoints()
