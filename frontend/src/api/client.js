const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export function resolveFileUrl(url) {
  if (!url) return '';
  const backendBase = API_BASE.replace(/\/api\/v1\/?$/, '');
  if (url.startsWith('http://localhost:5000')) {
    return url.replace('http://localhost:5000', backendBase);
  }
  if (url.startsWith('/')) {
    return `${backendBase}${url}`;
  }
  return url;
}

export const getAuthToken = () => localStorage.getItem('unilink_token');
export const setAuthToken = (token) => localStorage.setItem('unilink_token', token);
export const removeAuthToken = () => localStorage.removeItem('unilink_token');

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si no es FormData, fijar Content-Type JSON
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (error) {
    const networkError = error instanceof Error
      ? error
      : new Error(String(error));

    if (
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      networkError instanceof TypeError ||
      networkError.name === 'AbortError' ||
      /Failed to fetch|NetworkError/i.test(networkError.message)
    ) {
      networkError.isOffline = true;
    }

    throw networkError;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.isServerResponse = true;
    error.data = data;
    throw error;
  }

  return data;
  } catch (error) {
    // Si no hay red o falló la conexión por completo (servidor en reposo o sin internet)
    if (!navigator.onLine || error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'AbortError') {
      error.isOffline = true;
    }
    throw networkError;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
  }

  return data;
}

export const api = {
  // Health & Warm-up (Despertar Render)
  pingHealth: () => {
    const backendBase = API_BASE.replace(/\/api\/v1\/?$/, '');
    return fetch(`${backendBase}/health`, { method: 'GET' }).then(r => r.json()).catch(() => null);
  },

  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  // Profiles
  getProfile: (id) => request(`/users/${id}`),
  updateProfile: (payload) => request('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),

  // Categories
  getCategories: () => request('/categories'),
  suggestCategory: (payload) => request('/categories/suggest', { method: 'POST', body: JSON.stringify(payload) }),
  getCategorySuggestions: () => request('/categories/suggestions'),
  approveCategorySuggestion: (id) => request(`/categories/suggestions/${id}/approve`, { method: 'POST' }),
  rejectCategorySuggestion: (id) => request(`/categories/suggestions/${id}/reject`, { method: 'POST' }),
  createCategory: (payload) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),

  // Posts
  getPosts: async (params = '') => {
    const data = await request(`/posts${params ? `?${params}` : ''}`);
    if (data && Array.isArray(data.posts)) {
      data.posts.forEach(post => {
        if (Array.isArray(post.attachments)) {
          post.attachments.forEach(att => {
            if (att.url) att.url = resolveFileUrl(att.url);
          });
        }
      });
    }
    return data;
  },
  createPost: (formData) => request('/posts', { method: 'POST', body: formData }),
  reactToPost: (id, reaction_type) => request(`/posts/${id}/react`, { method: 'POST', body: JSON.stringify({ reaction_type }) }),
  deactivatePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  reactivatePost: (id) => request(`/posts/${id}/reactivate`, { method: 'PATCH' }),

  // Groups, Roles & Collaborative Tasks
  getGroups: (params = '') => request(`/groups${params ? `?${params}` : ''}`),
  getGroupById: (id) => request(`/groups/${id}`),
  createGroup: (payload) => request('/groups', { method: 'POST', body: JSON.stringify(payload) }),
  joinGroup: (id) => request(`/groups/${id}/join`, { method: 'POST' }),
  leaveGroup: (id) => request(`/groups/${id}/leave`, { method: 'POST' }),
  getGroupMembers: (groupId) => request(`/groups/${groupId}/members`),
  getGroupTasks: (groupId) => request(`/groups/${groupId}/tasks`),
  createGroupTask: (groupId, payload) => request(`/groups/${groupId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateGroupTask: (groupId, taskId, payload) => request(`/groups/${groupId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteGroupTask: (groupId, taskId) => request(`/groups/${groupId}/tasks/${taskId}`, { method: 'DELETE' }),

  // Meetings
  getMeetings: (params = '') => request(`/meetings${params ? `?${params}` : ''}`),
  createMeeting: (payload) => request('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  rsvpMeeting: (id, attendance_status) => request(`/meetings/${id}/rsvp`, { method: 'POST', body: JSON.stringify({ attendance_status }) }),

  // Notifications & Push
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  getVapidPublicKey: () => request('/notifications/vapid-public-key'),
  subscribePush: (subscription) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  testPush: () => request('/notifications/test-push', { method: 'POST' }),

  // Reports
  createReport: (payload) => request('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  getReports: () => request('/reports'),
  resolveReport: (id, payload) => request(`/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify(payload) })
};
