"use client";

type TauriRuntimeWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

export async function openExternalUrl(href: string) {
  const url = resolveExternalUrl(href);

  if (isTauriRuntime()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return;
    } catch (error) {
      console.error("Unable to open external URL through Tauri shell", error);
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function resolveExternalUrl(href: string) {
  if (typeof window === "undefined") {
    return href;
  }

  try {
    return new URL(href, window.location.origin).toString();
  } catch {
    return href;
  }
}

function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const currentWindow = window as TauriRuntimeWindow;
  return Boolean(currentWindow.__TAURI__ || currentWindow.__TAURI_INTERNALS__);
}
