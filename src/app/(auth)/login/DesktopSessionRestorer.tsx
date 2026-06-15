"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreDesktopSession } from "@/app/desktop-session/DesktopSessionClient";

type DesktopSessionRestorerProps = {
  returnTo?: string;
};

export function DesktopSessionRestorer({ returnTo }: DesktopSessionRestorerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!restoreDesktopSession()) {
      return;
    }

    router.replace(returnTo && isSafeReturnTo(returnTo) ? returnTo : "/dashboard");
  }, [returnTo, router]);

  return null;
}

function isSafeReturnTo(value: string | undefined) {
  return Boolean(value?.startsWith("/") && !value.startsWith("//"));
}
