import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setTokens, clearTokens, getToken } from './api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'superadmin' | 'mitra';
  phone: string | null;
  businessName: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<User>('/auth/me');
      setUser(res.data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const res = await api.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { username, password });

    setTokens(res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
