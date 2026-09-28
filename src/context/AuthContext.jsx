import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setCsrfToken, getCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      if (res.data?.status === 'success' && res.data?.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCsrfToken();
    fetchCurrentUser();
  }, []);

  const login = async (email, password, remember_me = false) => {
    const res = await api.post('/api/v1/auth/login', { email, password, remember_me });
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

  const register = async (userData) => {
    const res = await api.post('/api/v1/auth/register', userData);
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

  const logout = async () => {
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

export const useAuth = () => useContext(AuthContext);
