import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages } from '../api/messages';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 50;

export const useMessages = (channelId) => {
  const { user } = useAuth();
  const { on, off, emit } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: username }
  const typingTimerRef = useRef({});
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Load initial messages
  useEffect(() => {
    if (!channelId) return;
    setMessages([]);
    setHasMore(true);
    setTypingUsers({});

    setLoading(true);
    getMessages(channelId)
      .then(({ data }) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channelId]);

  // Listen for new incoming messages
  useEffect(() => {
    if (!channelId) return;

    const handleNewMessage = (msg) => {
      if (msg.channel !== channelId && msg.channel?._id !== channelId) return;
      if (msg.replyTo) return; // Ignore threaded replies in the main feed
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      emit('message:read', { channelId, messageId: msg._id });
    };

    const handleUpdateMessage = (msg) => {
      if (msg.channel !== channelId && msg.channel?._id !== channelId) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleReadReceipt = ({ messageId, userId, readAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                readBy: [
                  ...(m.readBy || []).filter((r) => r.user?._id !== userId && r.user !== userId),
                  { user: userId, readAt },
                ],
              }
            : m
        )
      );
    };

    const handleTypingUpdate = ({ channelId: cId, userId, username, isTyping }) => {
      if (cId !== channelId) return;
      if (userId === user?._id?.toString()) return;

      if (typingTimerRef.current[userId]) {
        clearTimeout(typingTimerRef.current[userId]);
      }

      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [userId]: username }));
        typingTimerRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, 4000);
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    const unsubNew = on('message:new', handleNewMessage);
    const unsubUpdate = on('message:update', handleUpdateMessage);
    const unsubReceipt = on('message:read_receipt', handleReadReceipt);
    const unsubTyping = on('typing:update', handleTypingUpdate);

    return () => {
      off('message:new', handleNewMessage);
      off('message:update', handleUpdateMessage);
      off('message:read_receipt', handleReadReceipt);
      off('typing:update', handleTypingUpdate);
      Object.values(typingTimerRef.current).forEach(clearTimeout);
      typingTimerRef.current = {};
    };
  }, [channelId, on, off, emit, user]);

  // Load more (older) messages — cursor pagination
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || messages.length === 0) return;
    const oldest = messages[0]?._id;
    setLoading(true);
    try {
      const { data } = await getMessages(channelId, oldest);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('loadMore error:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, loading, hasMore, messages]);

  // Send typing indicator with debounce
  const sendTyping = useCallback(() => {
    if (!channelId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit('typing:start', { channelId });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emit('typing:stop', { channelId });
    }, 2000);
  }, [channelId, emit]);

  // Send message via socket
  const sendMessage = useCallback(
    (content, attachments = [], poll = null) => {
      return new Promise((resolve, reject) => {
        // Stop typing
        isTypingRef.current = false;
        clearTimeout(typingTimeoutRef.current);
        emit('typing:stop', { channelId });

        emit('send:message', { channelId, content, attachments, poll }, (response) => {
          if (response?.error) reject(new Error(response.error));
          else resolve(response?.message);
        });
      });
    },
    [channelId, emit]
  );

  return { messages, loading, hasMore, loadMore, sendMessage, sendTyping, typingUsers };
};
