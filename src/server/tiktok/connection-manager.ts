import type { startTikTokConnection as startLocalTikTokConnection } from "@/lib/tiktok/connection-manager";

type StartResult = Awaited<ReturnType<typeof startLocalTikTokConnection>>;
type StopResult = { status: "stopped" };

export async function startTikTokConnection(workspaceId: string): Promise<StartResult> {
  const remote = getRealtimeControlUrl();

  if (remote) {
    return callRealtimeControl<StartResult>(remote, workspaceId, "start");
  }

  const local = await import("@/lib/tiktok/connection-manager");
  return local.startTikTokConnection(workspaceId);
}

export async function stopTikTokConnection(workspaceId: string): Promise<StopResult> {
  const remote = getRealtimeControlUrl();

  if (remote) {
    return callRealtimeControl<StopResult>(remote, workspaceId, "stop");
  }

  const local = await import("@/lib/tiktok/connection-manager");
  return local.stopTikTokConnection(workspaceId);
}

function getRealtimeControlUrl() {
  const value = process.env.REALTIME_CONTROL_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

async function callRealtimeControl<T>(baseUrl: string, workspaceId: string, action: "start" | "stop"): Promise<T> {
  const response = await fetch(`${baseUrl}/internal/realtime/tiktok/${encodeURIComponent(workspaceId)}/${action}`, {
    method: "POST",
    headers: {
      ...(process.env.REALTIME_CONTROL_TOKEN
        ? { authorization: `Bearer ${process.env.REALTIME_CONTROL_TOKEN}` }
        : {})
    }
  });

  const payload = await response.json().catch(() => ({})) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Realtime control request failed");
  }

  return payload;
}
