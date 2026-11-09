const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
    }

    return data;
  } catch (error) {
    // Si no hay red, detectarlo
    if (!navigator.onLine || error.message.includes('Failed to fetch')) {
      error.isOffline = true;
    }
    throw error;
  }
}

export const api = {
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

  // Posts
  getPosts: (params = '') => request(`/posts${params ? `?${params}` : ''}`),
  createPost: (formData) => request('/posts', { method: 'POST', body: formData }),
  reactToPost: (id, reaction_type) => request(`/posts/${id}/react`, { method: 'POST', body: JSON.stringify({ reaction_type }) }),
  deactivatePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

  // Groups
  getGroups: (params = '') => request(`/groups${params ? `?${params}` : ''}`),
  getGroupById: (id) => request(`/groups/${id}`),
  createGroup: (payload) => request('/groups', { method: 'POST', body: JSON.stringify(payload) }),
  joinGroup: (id) => request(`/groups/${id}/join`, { method: 'POST' }),

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
  createReport: (payload) => request('/reports', { method: 'POST', body: JSON.stringify(payload) })
};
