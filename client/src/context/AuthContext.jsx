import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  googleAuth as apiGoogleAuth,
  logout as apiLogout,
  updateProfile as apiUpdateProfile,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
} from '../api/auth';

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

  const register = useCallback(async (username, email, password, phone) => {
    const { data } = await apiRegister({ username, email, password, phone: phone || undefined });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const { data } = await apiGoogleAuth(credential);
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

  const updateProfile = useCallback(async (updates) => {
    const { data } = await apiUpdateProfile(updates);
    setUser(data.user);
    return data.user;
  }, []);

  const blockUser = useCallback(async (id) => {
    const { data } = await apiBlockUser(id);
    setUser(data.user);
    return data.user;
  }, []);

  const unblockUser = useCallback(async (id) => {
    const { data } = await apiUnblockUser(id);
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateUser, updateProfile, blockUser, unblockUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
