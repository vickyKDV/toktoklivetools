"use client";

import OBSWebSocket from "obs-websocket-js";
import type { DesktopLocalConfig } from "./local-config";

export type DesktopObsClientResult = {
  ok: boolean;
  version?: unknown;
  error?: string;
};

export async function testDesktopObsConnection(config: DesktopLocalConfig): Promise<DesktopObsClientResult> {
  const obs = new OBSWebSocket();

  try {
    await obs.connect(config.obs.websocketUrl, config.obs.password || undefined);
    const version = await obs.call("GetVersion");
    await obs.disconnect();
    return { ok: true, version };
  } catch (error) {
    try {
      await obs.disconnect();
    } catch {
      // Ignore disconnect errors after a failed connection attempt.
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function setDesktopObsBrowserSourceUrl(
  config: DesktopLocalConfig,
  sourceName: string,
  url: string
): Promise<DesktopObsClientResult> {
  const obs = new OBSWebSocket();

  try {
    await obs.connect(config.obs.websocketUrl, config.obs.password || undefined);
    await obs.call("SetInputSettings", {
      inputName: sourceName,
      inputSettings: { url },
      overlay: true
    });
    await obs.disconnect();
    return { ok: true };
  } catch (error) {
    try {
      await obs.disconnect();
    } catch {
      // Ignore disconnect errors after a failed connection attempt.
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
