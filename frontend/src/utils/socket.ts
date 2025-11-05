import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initializeSocket() {
  if (socket) return socket;

  const BACKEND_URL = import.meta.env.BACKEND_URL || 'http://localhost:8080';

  socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  // socket.on('connect', () => {
  // });

  // socket.on('disconnect', () => {
  // });

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
