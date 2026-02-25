import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ffa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 503 && err.response?.data?.setupRequired) {
      window.__ffaSetupRequired = true;
    }
    return Promise.reject(err);
  }
);

export default api;

export const setup = {
  status: () => api.get('/setup/status'),
  complete: (body) => api.post('/setup', body),
};

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const apps = {
  list: () => api.get('/apps'),
  create: (name) => api.post('/apps', { name }),
  update: (id, data) => api.patch(`/apps/${id}`, data),
  delete: (id) => api.delete(`/apps/${id}`),
};

export const monitors = {
  list: (appId) => api.get('/monitors', appId ? { params: { app_id: appId } } : {}),
  create: (data) => api.post('/monitors', data),
  update: (id, data) => api.patch(`/monitors/${id}`, data),
  delete: (id) => api.delete(`/monitors/${id}`),
};

export const logs = {
  list: (params) => api.get('/logs', { params }),
  get: (id) => api.get(`/logs/${id}`),
};

export const pingHistory = {
  list: (monitorId, params) => api.get('/ping-history', { params: { monitor_id: monitorId, ...params } }),
};

export const ready = () => api.get('/ready');
