"use client";

import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";

type ClientSocketOptions = Partial<ManagerOptions & SocketOptions>;

const defaultSocketOptions: ClientSocketOptions = {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  timeout: 8000
};

export function createRealtimeSocket(options: ClientSocketOptions = {}): Socket {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

  return io(socketUrl, {
    ...defaultSocketOptions,
    ...options
  });
}
