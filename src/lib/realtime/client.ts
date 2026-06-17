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
  const socketUrl = resolveRealtimeSocketUrl();

  return io(socketUrl, {
    ...defaultSocketOptions,
    ...options
  });
}

function resolveRealtimeSocketUrl() {
  const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (!configuredSocketUrl) {
    return window.location.origin;
  }

  try {
    const configuredUrl = new URL(configuredSocketUrl);
    const isLocalhostConfig = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";
    const isLocalhostPage = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isLocalhostConfig && !isLocalhostPage) {
      return window.location.origin;
    }
  } catch {
    return window.location.origin;
  }

  return configuredSocketUrl;
}
