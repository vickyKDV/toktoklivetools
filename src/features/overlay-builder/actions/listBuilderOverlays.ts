import "server-only";

import type { OverlayKind } from "@prisma/client";
import { listWorkspaceOverlays, listWorkspaceOverlaysByKind } from "@/server/overlays/service";

export async function listBuilderOverlays(workspaceId: string, kind?: OverlayKind) {
  return kind ? listWorkspaceOverlaysByKind(workspaceId, kind) : listWorkspaceOverlays(workspaceId);
}
