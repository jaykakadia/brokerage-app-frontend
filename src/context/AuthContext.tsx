import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setCsrfToken, getCsrfToken } from '../services/api';
import type { User, AuthResponse, RegisterRequest, ApiResponse } from '../types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember_me?: boolean) => Promise<AuthResponse>;
  register: (userData: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (): Promise<void> => {
    try {
      const res = await api.get<ApiResponse<User>>('/api/v1/auth/me');
      if (res.data?.status === 'success' && res.data?.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void getCsrfToken();
    void fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string, remember_me = false): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/api/v1/auth/login', { email, password, remember_me });
    if (res.data?.csrf_token) {
      setCsrfToken(res.data.csrf_token);
    }
    if (res.data?.user) {
      setUser(res.data.user);
    } else {
      await fetchCurrentUser();
    }
    return res.data;
  };

  const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/api/v1/auth/register', userData);
    if (res.data?.csrf_token) {
      setCsrfToken(res.data.csrf_token);
    }
    if (res.data?.user) {
      setUser(res.data.user);
    } else {
      await fetchCurrentUser();
    }
    return res.data;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
