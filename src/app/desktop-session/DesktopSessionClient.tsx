"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const sessionCookie = "tla_session";
const desktopSessionStorageKey = "liplo:desktop-session-token";
const sessionMaxAgeSeconds = 30 * 24 * 60 * 60;

type DesktopSessionClientProps = {
  token: string;
  nextPath: string;
};

export function DesktopSessionClient({ token, nextPath }: DesktopSessionClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (token) {
      rememberDesktopSession(token);
    }

    router.replace(isSafeNextPath(nextPath) ? nextPath : "/dashboard");
  }, [nextPath, router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-sm text-muted-foreground">
      Opening dashboard...
    </main>
  );
}

export function rememberDesktopSession(token: string) {
  window.localStorage.setItem(desktopSessionStorageKey, token);
  document.cookie = `${sessionCookie}=${encodeURIComponent(token)}; Max-Age=${sessionMaxAgeSeconds}; Path=/; SameSite=Lax`;
}

export function restoreDesktopSession() {
  const token = window.localStorage.getItem(desktopSessionStorageKey);

  if (!token) {
    return false;
  }

  rememberDesktopSession(token);
  return true;
}

export function forgetDesktopSession() {
  window.localStorage.removeItem(desktopSessionStorageKey);
  document.cookie = `${sessionCookie}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function isSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}
