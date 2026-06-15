"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { forgetDesktopSession } from "@/app/desktop-session/DesktopSessionClient";

export function DesktopLogoutClient() {
  const router = useRouter();

  useEffect(() => {
    forgetDesktopSession();
    router.replace("/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-sm text-muted-foreground">
      Signing out...
    </main>
  );
}
