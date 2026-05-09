import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type DesktopLocalConfig = {
  version: 1;
  webPort: number;
  realtimePort: number;
  obs: {
    url: string;
    password?: string;
  };
  storageDir: string;
  sqlitePath: string;
};

const defaultConfig: DesktopLocalConfig = {
  version: 1,
  webPort: 7050,
  realtimePort: 7051,
  obs: {
    url: "ws://127.0.0.1:4455"
  },
  storageDir: "storage/uploads/overlay-assets",
  sqlitePath: "storage/liplo.sqlite"
};

export async function readDesktopLocalConfig(rootDir = process.cwd()): Promise<DesktopLocalConfig> {
  const filePath = getDesktopLocalConfigPath(rootDir);

  try {
    const raw = await readFile(filePath, "utf8");
    return normalizeDesktopLocalConfig(JSON.parse(raw));
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

function normalizeDesktopLocalConfig(value: unknown): DesktopLocalConfig {
  if (!value || typeof value !== "object") {
    return defaultConfig;
  }

  const record = value as Partial<DesktopLocalConfig>;
  const obs = record.obs && typeof record.obs === "object" ? record.obs : defaultConfig.obs;

  return {
    version: 1,
    webPort: toPort(record.webPort, defaultConfig.webPort),
    realtimePort: toPort(record.realtimePort, defaultConfig.realtimePort),
    obs: {
      url: typeof obs.url === "string" && obs.url.trim() ? obs.url.trim() : defaultConfig.obs.url,
      password: typeof obs.password === "string" && obs.password ? obs.password : undefined
    },
    storageDir: typeof record.storageDir === "string" && record.storageDir.trim()
      ? record.storageDir.trim()
      : defaultConfig.storageDir,
    sqlitePath: typeof record.sqlitePath === "string" && record.sqlitePath.trim()
      ? record.sqlitePath.trim()
      : defaultConfig.sqlitePath
  };
}

function toPort(value: unknown, fallback: number) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
}
