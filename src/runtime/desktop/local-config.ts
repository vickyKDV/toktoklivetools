import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type DesktopHotkeyConfig = {
  id: string;
  label: string;
  accelerator: string;
  enabled: boolean;
  action: {
    type: "desktop-command";
    command: string;
  };
};

export type DesktopLocalConfig = {
  version: 1;
  web: {
    host: string;
    port: number;
    baseUrl: string;
  };
  realtime: {
    host: string;
    port: number;
    socketUrl: string;
    path: string;
    autoConnect: boolean;
  };
  obs: {
    websocketUrl: string;
    password: string;
    autoConnect: boolean;
    defaultSceneName: string;
    defaultBrowserSourceName: string;
  };
  overlay: {
    baseUrl: string;
    autoUpdateObsBrowserSource: boolean;
  };
  hotkeys: DesktopHotkeyConfig[];
  cloud: {
    baseUrl: string;
  };
  sqlite: {
    path: string;
  };
};

const defaultConfig: DesktopLocalConfig = {
  version: 1,
  web: {
    host: "127.0.0.1",
    port: 7050,
    baseUrl: "http://127.0.0.1:7050"
  },
  realtime: {
    host: "127.0.0.1",
    port: 7051,
    socketUrl: "http://127.0.0.1:7051",
    path: "/socket.io",
    autoConnect: true
  },
  obs: {
    websocketUrl: "ws://127.0.0.1:4455",
    password: "",
    autoConnect: false,
    defaultSceneName: "",
    defaultBrowserSourceName: "Liplo Overlay"
  },
  overlay: {
    baseUrl: "http://127.0.0.1:7050",
    autoUpdateObsBrowserSource: true
  },
  hotkeys: [
    {
      id: "toggle-overlay",
      label: "Toggle Overlay",
      accelerator: "CommandOrControl+Shift+O",
      enabled: true,
      action: {
        type: "desktop-command",
        command: "toggle_overlay"
      }
    }
  ],
  cloud: {
    baseUrl: ""
  },
  sqlite: {
    path: "storage/desktop/liplo.sqlite"
  }
};

export async function readDesktopLocalConfig(rootDir = process.cwd()): Promise<DesktopLocalConfig> {
  const filePath = getDesktopLocalConfigPath(rootDir);

  try {
    const raw = await readFile(filePath, "utf8");
    const config = normalizeDesktopLocalConfig(JSON.parse(raw));
    await writeDesktopLocalConfig(config, rootDir);
    return config;
  } catch {
    await writeDesktopLocalConfig(defaultConfig, rootDir);
    return defaultConfig;
  }
}

export async function writeDesktopLocalConfig(config: DesktopLocalConfig, rootDir = process.cwd()) {
  const filePath = getDesktopLocalConfigPath(rootDir);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(normalizeDesktopLocalConfig(config), null, 2)}\n`, "utf8");
}

export function getDesktopLocalConfigPath(rootDir = process.cwd()) {
  return path.join(rootDir, "storage", "desktop", "config.json");
}

export function normalizeDesktopLocalConfig(value: unknown): DesktopLocalConfig {
  if (!value || typeof value !== "object") {
    return defaultConfig;
  }

  const record = value as Record<string, unknown>;
  const web = getRecord(record.web);
  const realtime = getRecord(record.realtime);
  const obs = getRecord(record.obs);
  const overlay = getRecord(record.overlay);
  const cloud = getRecord(record.cloud);
  const sqlite = getRecord(record.sqlite);

  const webPort = toPort(web.port ?? record.webPort, defaultConfig.web.port);
  const realtimePort = toPort(realtime.port ?? record.realtimePort, defaultConfig.realtime.port);
  const webBaseUrl = toHttpUrl(web.baseUrl, `http://127.0.0.1:${webPort}`);
  const realtimeSocketUrl = toHttpUrl(realtime.socketUrl, `http://127.0.0.1:${realtimePort}`);

  return {
    version: 1,
    web: {
      host: toNonEmptyString(web.host, defaultConfig.web.host),
      port: webPort,
      baseUrl: webBaseUrl
    },
    realtime: {
      host: toNonEmptyString(realtime.host, defaultConfig.realtime.host),
      port: realtimePort,
      socketUrl: realtimeSocketUrl,
      path: toNonEmptyString(realtime.path, defaultConfig.realtime.path),
      autoConnect: toBoolean(realtime.autoConnect, defaultConfig.realtime.autoConnect)
    },
    obs: {
      websocketUrl: toWsUrl(obs.websocketUrl ?? obs.url, defaultConfig.obs.websocketUrl),
      password: toString(obs.password, ""),
      autoConnect: toBoolean(obs.autoConnect, defaultConfig.obs.autoConnect),
      defaultSceneName: toString(obs.defaultSceneName, defaultConfig.obs.defaultSceneName),
      defaultBrowserSourceName: toNonEmptyString(
        obs.defaultBrowserSourceName,
        defaultConfig.obs.defaultBrowserSourceName
      )
    },
    overlay: {
      baseUrl: toHttpUrl(overlay.baseUrl ?? record.overlayBaseUrl, webBaseUrl),
      autoUpdateObsBrowserSource: toBoolean(
        overlay.autoUpdateObsBrowserSource,
        defaultConfig.overlay.autoUpdateObsBrowserSource
      )
    },
    hotkeys: normalizeHotkeys(record.hotkeys),
    cloud: {
      baseUrl: toString(cloud.baseUrl ?? record.cloudBaseUrl, defaultConfig.cloud.baseUrl)
    },
    sqlite: {
      path: toNonEmptyString(sqlite.path ?? record.sqlitePath, defaultConfig.sqlite.path)
    }
  };
}

function normalizeHotkeys(value: unknown): DesktopHotkeyConfig[] {
  if (!Array.isArray(value)) {
    return defaultConfig.hotkeys;
  }

  const normalized = value
    .map((item) => {
      const record = getRecord(item);
      const action = getRecord(record.action);
      const id = toNonEmptyString(record.id, "");
      const accelerator = toNonEmptyString(record.accelerator, "");
      const command = toNonEmptyString(action.command, "");

      if (!id || !accelerator || !command) {
        return null;
      }

      return {
        id,
        label: toNonEmptyString(record.label, id),
        accelerator,
        enabled: toBoolean(record.enabled, true),
        action: {
          type: "desktop-command" as const,
          command
        }
      };
    })
    .filter((item): item is DesktopHotkeyConfig => Boolean(item));

  return normalized.length > 0 ? normalized : defaultConfig.hotkeys;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toPort(value: unknown, fallback: number) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
}

function toString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function toNonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toHttpUrl(value: unknown, fallback: string) {
  const text = toNonEmptyString(value, "");
  return text.startsWith("http://") || text.startsWith("https://") ? text : fallback;
}

function toWsUrl(value: unknown, fallback: string) {
  const text = toNonEmptyString(value, "");
  return text.startsWith("ws://") || text.startsWith("wss://") ? text : fallback;
}
