import "server-only";

import { listWorkspaceOverlays } from "@/server/overlays/service";

export async function listBuilderOverlays(workspaceId: string) {
  return listWorkspaceOverlays(workspaceId);
}
