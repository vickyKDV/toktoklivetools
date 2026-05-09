export type LiploRuntimeMode = "cloud" | "desktop-local";

export function getRuntimeMode(): LiploRuntimeMode {
  return process.env.LIPLO_RUNTIME_MODE === "desktop-local" ? "desktop-local" : "cloud";
}

export function isDesktopLocalRuntime() {
  return getRuntimeMode() === "desktop-local";
}
