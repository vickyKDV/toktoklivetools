import type { DesktopLocalConfig } from "./local-config";

export type TauriCommandName =
  | "liplo_read_config"
  | "liplo_write_config"
  | "liplo_start_sidecar"
  | "liplo_stop_sidecar"
  | "start_sidecars"
  | "stop_sidecars"
  | "restart_sidecars"
  | "get_sidecar_status"
  | "check_web_health"
  | "check_realtime_health"
  | "check_desktop_health"
  | "liplo_realtime_health"
  | "liplo_web_health"
  | "liplo_connect_obs"
  | "liplo_disconnect_obs"
  | "liplo_set_obs_browser_source"
  | "connect_obs_websocket"
  | "disconnect_obs_websocket"
  | "test_obs_websocket_connection"
  | "get_obs_status"
  | "set_obs_browser_source_url"
  | "set_obs_scene_item_transform";

export type TauriCommandBridge = {
  available: boolean;
  invoke: <TResponse>(command: TauriCommandName, args?: Record<string, unknown>) => Promise<TResponse>;
  readConfig: () => Promise<DesktopLocalConfig>;
  writeConfig: (config: DesktopLocalConfig) => Promise<void>;
  startSidecars: () => Promise<unknown>;
  stopSidecars: () => Promise<unknown>;
  restartSidecars: () => Promise<unknown>;
  getSidecarStatus: () => Promise<unknown>;
  checkDesktopHealth: () => Promise<unknown>;
};

type TauriCore = {
  invoke: <TResponse>(command: string, args?: Record<string, unknown>) => Promise<TResponse>;
};

type TauriWindow = Window & {
  __TAURI__?: {
    core?: TauriCore;
  };
};

export function createTauriCommandBridge(): TauriCommandBridge {
  const core = getTauriCore();

  async function invoke<TResponse>(command: TauriCommandName, args?: Record<string, unknown>) {
    if (!core) {
      throw new Error("Tauri command bridge is not available in this runtime.");
    }

    return core.invoke<TResponse>(command, args);
  }

  return {
    available: Boolean(core),
    invoke,
    async readConfig() {
      return invoke<DesktopLocalConfig>("liplo_read_config");
    },
    async writeConfig(config) {
      await invoke("liplo_write_config", { config });
    },
    async startSidecars() {
      return invoke("start_sidecars");
    },
    async stopSidecars() {
      return invoke("stop_sidecars");
    },
    async restartSidecars() {
      return invoke("restart_sidecars");
    },
    async getSidecarStatus() {
      return invoke("get_sidecar_status");
    },
    async checkDesktopHealth() {
      return invoke("check_desktop_health");
    }
  };
}

function getTauriCore(): TauriCore | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as TauriWindow).__TAURI__?.core;
}
