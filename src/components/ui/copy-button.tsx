"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  className?: string;
  compact?: boolean;
};

export function CopyButton({ value, className, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const el = document.createElement("textarea");

        el.value = value;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        el.style.left = "-9999px";

        document.body.appendChild(el);
        el.focus();
        el.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(el);

        if (!copied) {
          throw new Error("Clipboard API not available");
        }
      } else {
        throw new Error("Clipboard API not available");
      }

      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // keep state unchanged jika copy gagal; UI tetap functional.
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Button type="button" variant="outline" onClick={copy} className={cn(className)}>
      {copied ? <Check /> : <Copy />}
      {compact ? <span className="sr-only">{copied ? "Copied" : "Copy URL"}</span> : copied ? "Copied" : "Copy URL"}
    </Button>
  );
}
