export type LiploAppMode = "web" | "desktop";
export type LiploDataMode = "cloud" | "local-sqlite";
export type LiploRuntimeMode = "cloud-web" | "desktop-cloud" | "desktop-local";

export function getAppMode(): LiploAppMode {
  return process.env.LIPLO_APP_MODE === "desktop" ? "desktop" : "web";
}

export function getDataMode(): LiploDataMode {
  return process.env.LIPLO_DATA_MODE === "local-sqlite" ? "local-sqlite" : "cloud";
}

export function getRuntimeMode(): LiploRuntimeMode {
  const mode = process.env.LIPLO_RUNTIME_MODE;

  if (mode === "desktop-local") {
    return "desktop-local";
  }

  if (mode === "desktop-cloud") {
    return "desktop-cloud";
  }

  return "cloud-web";
}

export function isDesktopRuntime() {
  return getRuntimeMode() === "desktop-cloud" || getRuntimeMode() === "desktop-local";
}

export function isDesktopCloudRuntime() {
  return getRuntimeMode() === "desktop-cloud";
}

export function isOfflineSqliteEnabled() {
  return getDataMode() === "local-sqlite";
}
