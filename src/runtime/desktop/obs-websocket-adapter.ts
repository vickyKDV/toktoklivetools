import { DesktopLocalConfig, readDesktopLocalConfig } from "./local-config";
import OBSWebSocket from "obs-websocket-js";

export type ObsSceneItemTransform = {
  sceneName: string;
  sourceName: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type ObsConnectionState = {
  connected: boolean;
  url: string;
  lastError: string | null;
};

export type ObsWebSocketAdapter = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; version?: unknown; error?: string }>;
  getState: () => ObsConnectionState;
  getStatus: () => Promise<ObsConnectionState & { version?: unknown }>;
  setBrowserSourceUrl: (sourceName: string, url: string) => Promise<void>;
  setSceneItemTransform: (transform: ObsSceneItemTransform) => Promise<void>;
};

export async function createObsWebSocketAdapter(
  rootDir = process.cwd(),
  providedConfig?: DesktopLocalConfig
): Promise<ObsWebSocketAdapter> {
  const config = providedConfig ?? await readDesktopLocalConfig(rootDir);
  const obs = new OBSWebSocket();
  let connected = false;
  let lastError: string | null = null;

  async function ensureConnected() {
    if (!connected) {
      try {
        await obs.connect(config.obs.websocketUrl, config.obs.password || undefined);
        connected = true;
        lastError = null;
      } catch (error) {
        lastError = toReadableError(error);
        throw new Error(lastError);
      }
    }
  }

  return {
    async connect() {
      await ensureConnected();
    },
    async disconnect() {
      if (!connected) {
        return;
      }

      await obs.disconnect();
      connected = false;
    },
    async testConnection() {
      try {
        await ensureConnected();
        const version = await obs.call("GetVersion");
        return { ok: true, version };
      } catch (error) {
        return { ok: false, error: toReadableError(error) };
      }
    },
    getState() {
      return {
        connected,
        url: config.obs.websocketUrl,
        lastError
      };
    },
    async getStatus() {
      if (!connected) {
        return {
          connected,
          url: config.obs.websocketUrl,
          lastError
        };
      }

      try {
        const version = await obs.call("GetVersion");
        return {
          connected,
          url: config.obs.websocketUrl,
          lastError,
          version
        };
      } catch (error) {
        lastError = toReadableError(error);
        return {
          connected: false,
          url: config.obs.websocketUrl,
          lastError
        };
      }
    },
    async setBrowserSourceUrl(sourceName, url) {
      await ensureConnected();

      await obs.call("SetInputSettings", {
        inputName: sourceName,
        inputSettings: {
          url
        },
        overlay: true
      });
    },
    async setSceneItemTransform(transform) {
      await ensureConnected();

      const sceneItem = await obs.call("GetSceneItemId", {
        sceneName: transform.sceneName,
        sourceName: transform.sourceName
      });

      const sceneItemTransform: Record<string, number | string> = {};

      if (typeof transform.x === "number" && Number.isFinite(transform.x)) {
        sceneItemTransform.positionX = transform.x;
      }

      if (typeof transform.y === "number" && Number.isFinite(transform.y)) {
        sceneItemTransform.positionY = transform.y;
      }

      if (typeof transform.width === "number" && Number.isFinite(transform.width) && transform.width > 0) {
        sceneItemTransform.boundsWidth = transform.width;
        sceneItemTransform.boundsType = "OBS_BOUNDS_SCALE_INNER";
      }

      if (typeof transform.height === "number" && Number.isFinite(transform.height) && transform.height > 0) {
        sceneItemTransform.boundsHeight = transform.height;
        sceneItemTransform.boundsType = "OBS_BOUNDS_SCALE_INNER";
      }

      await obs.call("SetSceneItemTransform", {
        sceneName: transform.sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemTransform
      });
    }
  };
}

function toReadableError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
