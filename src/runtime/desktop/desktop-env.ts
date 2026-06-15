import { DesktopLocalConfig, readDesktopLocalConfig } from "./local-config";

export type DesktopRuntimeEnv = Record<string, string>;

export function createDesktopRuntimeEnv(config: DesktopLocalConfig): DesktopRuntimeEnv {
  const env: DesktopRuntimeEnv = {
    LIPLO_APP_MODE: "desktop",
    LIPLO_DATA_MODE: "cloud",
    LIPLO_RUNTIME_MODE: "desktop-cloud",
    LIPLO_CLOUD_BASE_URL: config.cloud.baseUrl,
    PORT: String(config.web.port),
    REALTIME_PORT: String(config.realtime.port),
    REALTIME_CONTROL_URL: config.realtime.socketUrl,
    NEXT_PUBLIC_WIDGET_BASE_URL: config.web.baseUrl,
    NEXT_PUBLIC_SOCKET_URL: config.realtime.socketUrl
  };

  if (process.env.DATABASE_URL) {
    env.DATABASE_URL = process.env.DATABASE_URL;
  }

  return env;
}

export async function readDesktopRuntimeEnv(rootDir = process.cwd()) {
  return createDesktopRuntimeEnv(await readDesktopLocalConfig(rootDir));
}
