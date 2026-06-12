import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/config';

type AuthUser = {
  name?: string;
  id?: string;
  username?: string;
  department?: string;
  designation?: string;
  notification_permissions?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isTokenValid: () => boolean;
  validateToken: () => Promise<boolean>;
};

const KEY = 'fc_auth_v1';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const nextUser = parsed.user ?? null;
        const nextToken = parsed.token ?? null;
        const nextExpiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null;

        if (nextToken && nextExpiresAt && Date.now() >= nextExpiresAt) {
          localStorage.removeItem(KEY);
          setUser(null);
          setToken(null);
          setExpiresAt(null);
        } else {
          setUser(nextUser);
          setToken(nextToken);
          setExpiresAt(nextExpiresAt);
        }
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const endOfTodayMs = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  };

  const jwtExpMs = (t: string) => {
    // Best-effort decode JWT exp claim (seconds) -> ms.
    // If token isn't a JWT, return null.
    try {
      const parts = t.split('.');
      if (parts.length < 2) return null;
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json);
      const expSec = payload?.exp;
      if (typeof expSec === 'number' && Number.isFinite(expSec)) return expSec * 1000;
      return null;
    } catch {
      return null;
    }
  };

  const computeExpiresAt = (t: string) => {
    const endToday = endOfTodayMs();
    const jwtExp = jwtExpMs(t);
    if (jwtExp && jwtExp > 0) return Math.min(endToday, jwtExp);
    return endToday;
  };

  const persist = (u: AuthUser | null, t: string | null, exp: number | null) => {
    setUser(u);
    setToken(t);
    setExpiresAt(exp);
    try {
      if (u && t) localStorage.setItem(KEY, JSON.stringify({ user: u, token: t, expiresAt: exp }));
      else localStorage.removeItem(KEY);
    } catch (err) {
      // ignore
    }
  };

  const isTokenValid = useCallback(() => {
    if (!token) return false;
    const exp = expiresAt;
    if (!exp) return true;
    return Date.now() < exp;
  }, [token, expiresAt]);

  const fetchCredentials = async (t: string) => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${BASE_URL}/login/get_credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    const detail = (data && (data.detail || data.message)) ?? '';
    const expired = String(detail).toLowerCase().includes('token has expired');

    if (!res.ok) {
      if (expired) return { expired: true as const, user: null as AuthUser | null };
      throw new Error(detail || `Token validation failed (HTTP ${res.status})`);
    }

    if (expired) return { expired: true as const, user: null as AuthUser | null };

    const nextUser: AuthUser = {
      id: data?.staff_id ?? data?.staffId ?? '',
      name: data?.staff_name ?? data?.staffName ?? '',
      department: data?.staff_department ?? data?.staffDepartment ?? '',
      designation: data?.staff_designation ?? data?.staffDesignation ?? '',
      notification_permissions: data?.notification_permissions === true,
    };

    return { expired: false as const, user: nextUser };
  };

  const validateToken = useCallback(async () => {
    if (!token) return false;

    // Fast local check first (end-of-day/JWT exp if available)
    if (!isTokenValid()) {
      persist(null, null, null);
      return false;
    }

    const { expired, user: nextUser } = await fetchCredentials(token);
    if (expired) {
      persist(null, null, null);
      return false;
    }

    // Keep token cached for the rest of the day, but don't extend beyond JWT exp if present
    const nextExp = computeExpiresAt(token);
    persist(nextUser, token, nextExp);
    return true;
  }, [token, isTokenValid]);

  const login = async (username: string, password: string) => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${BASE_URL}/login/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || `Login failed (HTTP ${res.status})`;
      throw new Error(detail);
    }

    if (!data?.success || !data?.token) {
      throw new Error('Invalid login response');
    }

    const t = String(data.token);
    const exp = computeExpiresAt(t);

    // cache token immediately; user details are optional
    persist(null, t, exp);

    try {
      const creds = await fetchCredentials(t);
      if (creds.expired) {
        persist(null, null, null);
        throw new Error('Token has expired');
      }
      persist(creds.user, t, exp);
    } catch {
      // keep token cached even if user info fetch fails
    }
  };

  const logout = () => {
    persist(null, null, null);
  };

  return (
    <AuthContext.Provider value={{ user, token, expiresAt, loading, login, logout, isTokenValid, validateToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
