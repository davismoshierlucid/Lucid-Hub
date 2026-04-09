import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (
      !original ||
      original._retry ||
      original.url?.includes('/api/auth/refresh') ||
      err.response?.status !== 401
    ) {
      return Promise.reject(err);
    }
    original._retry = true;
    try {
      await api.post('/api/auth/refresh');
      return api(original);
    } catch {
      return Promise.reject(err);
    }
  }
);
