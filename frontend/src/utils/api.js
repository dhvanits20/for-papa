const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

export const getFileUrl = (memoryId) => {
  return `${API_BASE_URL}/api/memories/${memoryId}/file`;
};

export const getMemories = async (year = null, month = null, search = null, favoritesOnly = false) => {
  let url = `${API_BASE_URL}/api/memories`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (favoritesOnly) params.push(`favorites_only=true`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load memories');
  return res.json();
};

export const getStats = async () => {
  const res = await fetch(`${API_BASE_URL}/api/memories/stats`);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
};

export const uploadMemories = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

export const reactToMemory = async (memoryId, reactionType) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reaction_type: reactionType }),
  });
  if (!res.ok) throw new Error('Reaction failed');
  return res.json();
};

export const commentOnMemory = async (memoryId, author, text) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ author, text }),
  });
  if (!res.ok) throw new Error('Comment failed');
  return res.json();
};

export const getCovers = async () => {
  const res = await fetch(`${API_BASE_URL}/api/covers`);
  if (!res.ok) throw new Error('Failed to load covers');
  return res.json();
};

export const setCover = async (yearMonth, memoryId, pin) => {
  const res = await fetch(
    `${API_BASE_URL}/api/covers?year_month=${yearMonth}&memory_id=${memoryId}`,
    {
      method: 'POST',
      headers: {
        'X-Curator-PIN': pin,
      },
    }
  );
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Set cover failed');
  }
  return res.json();
};

export const deleteMemory = async (memoryId, pin) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}`, {
    method: 'DELETE',
    headers: {
      'X-Curator-PIN': pin,
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Delete failed');
  }
  return res.json();
};

export const verifyPin = async (pin) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error('Invalid PIN');
  return res.json();
};

export const toggleFavorite = async (memoryId, pin) => {
  const res = await fetch(`${API_BASE_URL}/api/memories/${memoryId}/favorite`, {
    method: 'POST',
    headers: {
      'X-Curator-PIN': pin,
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Failed to toggle favorite');
  }
  return res.json();
};
