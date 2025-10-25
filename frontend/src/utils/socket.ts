import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initializeSocket() {
  if (socket) return socket;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  socket = io(API_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    console.log('Socket transport:', socket?.io.engine.transport.name);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
