import axios from 'axios';
import { getAccessToken, getRefreshToken, saveSession } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

// Agrega Authorization si hay token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh token automático (simple)
let refreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        await new Promise<void>((resolve) => queue.push(resolve));
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      }
      try {
        refreshing = true;
        original._retry = true;
        const rt = getRefreshToken();
        if (!rt) throw error;

        const resp = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken: rt }
        );
        saveSession({
          accessToken: resp.data.accessToken,
          refreshToken: rt,
          user: JSON.parse(localStorage.getItem('user') || 'null')
        });
        queue.forEach((fn) => fn());
        queue = [];
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch (e) {
        queue = [];
        throw error;
      } finally {
        refreshing = false;
      }
    }
    throw error;
  }
);

export default api;
