import "server-only";

import { prisma } from "@/lib/prisma";
import { mapOverlay } from "@/features/overlay-builder/actions/saveOverlayDesign";

export async function listBuilderOverlays(workspaceId: string) {
  const overlays = await prisma.overlay.findMany({
    where: {
      workspaceId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return overlays.map(mapOverlay);
}
