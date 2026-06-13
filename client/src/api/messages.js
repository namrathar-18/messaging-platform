import api from './axios';

export const getMessages = (channelId, before) =>
  api.get(`/messages/${channelId}`, { params: before ? { before } : {} });

export const sendMessage = (channelId, data) => api.post(`/messages/${channelId}`, data);

export const markMessageRead = (channelId, messageId) =>
  api.patch(`/messages/${channelId}/${messageId}/read`);
