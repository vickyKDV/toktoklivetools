"use client";

type TauriRuntimeWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

export async function openExternalUrl(href: string) {
  const url = resolveExternalUrl(href);

  if (isLocalAppUrl(url)) {
    window.location.assign(url);
    return;
  }

  if (isTauriRuntime()) {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return;
    } catch (error) {
      console.error("Unable to open external URL through Tauri shell", error);
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");

  if (!opened) {
    window.location.assign(url);
  }
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

function isLocalAppUrl(url: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const parsed = new URL(url);
    const current = new URL(window.location.href);

    return parsed.origin === current.origin;
  } catch {
    return false;
  }
}
