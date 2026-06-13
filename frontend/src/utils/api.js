const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }
  return res.json();
};

export const signup = async (username, password) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Signup failed');
  }
  return res.json();
};

export const getFileUrl = (memoryId, shareToken = null) => {
  if (shareToken) {
    return `${API_BASE_URL}/api/memories/${memoryId}/file?share_token=${shareToken}`;
  }
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/api/memories/${memoryId}/file?token=${token}`;
};

export const getMemories = async (year = null, month = null, search = null, favoritesOnly = false, shareToken = null) => {
  let url = shareToken 
    ? `${API_BASE_URL}/api/shared/${shareToken}/memories`
    : `${API_BASE_URL}/api/memories`;
    
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (favoritesOnly) params.push(`favorites_only=true`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  const options = shareToken ? {} : { headers: getAuthHeaders() };
  const res = await fetch(url, options);
  
  if (!res.ok) throw new Error('Failed to load memories');
  return res.json();
};

export const getStats = async (shareToken = null) => {
  const url = shareToken 
    ? `${API_BASE_URL}/api/shared/${shareToken}/stats`
    : `${API_BASE_URL}/api/memories/stats`;
  const options = shareToken ? {} : { headers: getAuthHeaders() };
  
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
};

export const uploadMemories = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

export const reactToMemory = async (memoryId, reactionType, shareToken = null) => {
  const url = shareToken
    ? `${API_BASE_URL}/api/shared/${shareToken}/memories/${memoryId}/react`
    : `${API_BASE_URL}/api/memories/${memoryId}/react`;
    
  const headers = shareToken 
    ? { 'Content-Type': 'application/json' }
    : { ...getAuthHeaders(), 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ reaction_type: reactionType }),
  });
  if (!res.ok) throw new Error('Reaction failed');
  return res.json();
};

export const commentOnMemory = async (memoryId, author, text, shareToken = null) => {
  const url = shareToken
    ? `${API_BASE_URL}/api/shared/${shareToken}/memories/${memoryId}/comment`
    : `${API_BASE_URL}/api/memories/${memoryId}/comment`;

  const headers = shareToken 
    ? { 'Content-Type': 'application/json' }
    : { ...getAuthHeaders(), 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ author, text }),
  });
  if (!res.ok) throw new Error('Comment failed');
  return res.json();
};

export const getCovers = async (shareToken = null) => {
  const url = shareToken 
    ? `${API_BASE_URL}/api/shared/${shareToken}/covers`
    : `${API_BASE_URL}/api/covers`;
  const options = shareToken ? {} : { headers: getAuthHeaders() };
  
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Failed to load covers');
  return res.json();
};

export const setCover = async (yearMonth, memoryId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/covers?year_month=${yearMonth}&memory_id=${memoryId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Set cover failed');
  }
  return res.json();
};

export const deleteMemory = async (memoryId) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Delete failed');
  }
  return res.json();
};

export const toggleFavorite = async (memoryId) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}/favorite`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Failed to toggle favorite');
  }
  return res.json();
};
