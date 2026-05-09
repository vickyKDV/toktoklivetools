import { readDesktopLocalConfig } from "./local-config";

export type ObsSceneItemTransform = {
  sceneName: string;
  sourceName: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type ObsWebSocketAdapter = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setBrowserSourceUrl: (sourceName: string, url: string) => Promise<void>;
  setSceneItemTransform: (transform: ObsSceneItemTransform) => Promise<void>;
};

export async function createObsWebSocketAdapter(rootDir = process.cwd()): Promise<ObsWebSocketAdapter> {
  const config = await readDesktopLocalConfig(rootDir);

  return {
    async connect() {
      throw new Error(`OBS WebSocket adapter is not active yet. Planned endpoint: ${config.obs.url}`);
    },
    async disconnect() {
      return;
    },
    async setBrowserSourceUrl() {
      throw new Error("OBS WebSocket adapter is not active yet.");
    },
    async setSceneItemTransform() {
      throw new Error("OBS WebSocket adapter is not active yet.");
    }
  };
}
