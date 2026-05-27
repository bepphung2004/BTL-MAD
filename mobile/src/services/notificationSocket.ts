import { SOCKET_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';


let socket: Socket | null = null;

export function connectNotificationSocket(userId: string) {
  if (socket) return socket;
  if (!userId) return null;
  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
  });
  return socket;
}

export function getNotificationSocket() {
  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
