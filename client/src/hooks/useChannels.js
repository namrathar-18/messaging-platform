import { useState, useEffect, useCallback } from 'react';
import { getChannels, createChannel, createDirect, leaveChannel, deleteChannel } from '../api/channels';
import { useSocket } from '../context/SocketContext';

export const useChannels = () => {
  const { on, off, emit } = useSocket();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const { data } = await getChannels();
      setChannels(data.channels);
    } catch (err) {
      console.error('fetchChannels error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Update last message preview when a new message arrives for a channel we're in
  useEffect(() => {
    const handleNewMessage = (msg) => {
      const channelId = msg.channel?._id || msg.channel;
      setChannels((prev) =>
        prev.map((ch) =>
          ch._id === channelId
            ? { ...ch, lastMessage: msg, lastActivity: msg.createdAt }
            : ch
        ).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      );
    };
    const unsub = on('message:new', handleNewMessage);
    return () => off('message:new', handleNewMessage);
  }, [on, off]);

  const addGroupChannel = useCallback(async (name, description, memberIds) => {
    const { data } = await createChannel({ name, description, memberIds });
    setChannels((prev) => [data.channel, ...prev]);
    emit('channel:join', { channelId: data.channel._id });
    return data.channel;
  }, [emit]);

  const addDirectChannel = useCallback(async (targetUserId) => {
    const { data } = await createDirect(targetUserId);
    setChannels((prev) => {
      if (prev.find((c) => c._id === data.channel._id)) return prev;
      return [data.channel, ...prev];
    });
    emit('channel:join', { channelId: data.channel._id });
    return data.channel;
  }, [emit]);

  const removeChannel = useCallback(async (channelId) => {
    await deleteChannel(channelId);
    setChannels((prev) => prev.filter((c) => c._id !== channelId));
    emit('channel:leave', { channelId });
  }, [emit]);

  const leave = useCallback(async (channelId) => {
    await leaveChannel(channelId);
    setChannels((prev) => prev.filter((c) => c._id !== channelId));
    emit('channel:leave', { channelId });
  }, [emit]);

  const updateChannelInList = useCallback((channelId, updates) => {
    setChannels((prev) => prev.map((c) => c._id === channelId ? { ...c, ...updates } : c));
  }, []);

  return { channels, loading, fetchChannels, addGroupChannel, addDirectChannel, removeChannel, leave, updateChannelInList };
};
