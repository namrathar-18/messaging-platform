import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await apiLogin({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await apiRegister({ username, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch (_) {}
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
