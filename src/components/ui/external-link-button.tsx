"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { openExternalUrl } from "@/runtime/desktop/open-external";

type ExternalLinkButtonProps = Omit<ButtonProps, "asChild" | "onClick" | "type"> & {
  href: string;
  children: ReactNode;
};

export function ExternalLinkButton({
  href,
  children,
  disabled,
  ...props
}: ExternalLinkButtonProps) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    if (disabled || opening) {
      return;
    }

    setOpening(true);

    try {
      await openExternalUrl(href);
    } finally {
      setOpening(false);
    }
  }

  return (
    <Button type="button" disabled={disabled || opening} onClick={handleOpen} {...props}>
      {children}
    </Button>
  );
}
