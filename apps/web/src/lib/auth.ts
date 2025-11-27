type User = { id: string; email: string; role: 'ADMIN' | 'USER' };

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export function saveSession(r: LoginResponse) {
  localStorage.setItem(ACCESS_KEY, r.accessToken);
  localStorage.setItem(REFRESH_KEY, r.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(r.user));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
