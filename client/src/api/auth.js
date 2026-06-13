import api from './axios';

export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const googleAuth = (credential) => api.post('/auth/google', { credential });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.patch('/users/me', data);
export const updateStatus = (status) => api.patch('/users/me/status', { status });
export const blockUser = (id) => api.post(`/users/${id}/block`);
export const unblockUser = (id) => api.delete(`/users/${id}/block`);
export const searchUsers = (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`);
export const getUserById = (id) => api.get(`/users/${id}`);
