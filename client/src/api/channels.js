import api from './axios';

export const getChannels = () => api.get('/channels');
export const createChannel = (data) => api.post('/channels', data);
export const createDirect = (targetUserId) => api.post('/channels/direct', { targetUserId });
export const getChannel = (id) => api.get(`/channels/${id}`);
export const updateChannel = (id, data) => api.patch(`/channels/${id}`, data);
export const deleteChannel = (id) => api.delete(`/channels/${id}`);
export const getMembers = (channelId) => api.get(`/channels/${channelId}/members`);
export const inviteMember = (channelId, userId) => api.post(`/channels/${channelId}/members`, { userId });
export const updateMemberRole = (channelId, userId, role) =>
  api.patch(`/channels/${channelId}/members/${userId}/role`, { role });
export const removeMember = (channelId, userId) => api.delete(`/channels/${channelId}/members/${userId}`);
export const leaveChannel = (channelId) => api.delete(`/channels/${channelId}/leave`);
