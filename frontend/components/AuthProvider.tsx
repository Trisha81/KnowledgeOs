'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/* ─── Auth Context ──────────────────────────────────────────────── */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'viewer';
  department?: string;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

const AUTH_ROUTES = ['/login', '/register'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('kos_token');
    const storedUser = localStorage.getItem('kos_user');
    if (stored && storedUser) {
      try {
        setToken(stored);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('kos_token');
        localStorage.removeItem('kos_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
    if (!user && !isAuthRoute) {
      router.replace('/login');
    }
    if (user && isAuthRoute) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('kos_token', newToken);
    localStorage.setItem('kos_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('kos_token');
    localStorage.removeItem('kos_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
