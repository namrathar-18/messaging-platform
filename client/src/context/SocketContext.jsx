import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:online_users', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on('presence:update', ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const emit = useCallback((event, data, cb) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, cb);
    }
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const isOnline = useCallback((userId) => onlineUsers.has(userId?.toString()), [onlineUsers]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on, off, isOnline, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
