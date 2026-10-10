import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    socket = io(wsUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }

  return socket;
}

export function subscribeToOrgRoom(organizationId: string) {
  const s = getSocket();
  if (s) {
    s.emit('join:organization', organizationId);
  }
}

export function subscribeToProjectRoom(projectId: string) {
  const s = getSocket();
  if (s) {
    s.emit('join:project', projectId);
  }
}
