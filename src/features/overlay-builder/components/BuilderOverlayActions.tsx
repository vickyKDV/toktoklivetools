"use client";

import { useRouter } from "next/navigation";
import { Copy, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

type BuilderOverlayActionsProps = {
  overlayId: string;
  workspaceId: string;
  name: string;
  schema: OverlayDesignSchema;
  overlayType: "CUSTOM_OVERLAY" | "CHAT_STYLE";
  isActive: boolean;
};

export function BuilderOverlayActions({ overlayId, workspaceId, name, schema, overlayType, isActive }: BuilderOverlayActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateActive() {
    setBusy(true);
    await fetch(`/api/overlays/${overlayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name,
        schema,
        overlayType,
        makeActive: !isActive
      })
    });
    setBusy(false);
    router.refresh();
  }

  async function duplicateOverlay() {
    setBusy(true);
    await fetch("/api/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: `${name} Copy`,
        schema: {
          ...schema,
          name: `${name} Copy`
        },
        overlayType,
        makeActive: false
      })
    });
    setBusy(false);
    router.refresh();
  }

  async function deleteOverlay() {
    if (!window.confirm("Hapus overlay builder ini?")) {
      return;
    }

    setBusy(true);
    await fetch(`/api/overlays/${overlayId}`, {
      method: "DELETE"
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={isActive ? "default" : "outline"} size="sm" onClick={updateActive} disabled={busy}>
        <Power />
        {isActive ? "Active" : "Set Active"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={duplicateOverlay} disabled={busy}>
        <Copy />
        Duplicate
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={deleteOverlay} disabled={busy}>
        <Trash2 />
        Delete
      </Button>
    </div>
  );
}
