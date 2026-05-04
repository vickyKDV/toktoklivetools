import "server-only";

import type { OverlayKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getOverlayRuntimeUrlForWorkspaceKey(overlayKey: string, kind: OverlayKind) {
  const workspace = await prisma.workspace.findUnique({
    where: { overlayKey },
    select: {
      overlays: {
        where: { kind },
        orderBy: [
          { publishedAt: "desc" },
          { updatedAt: "desc" }
        ],
        take: 1,
        select: {
          id: true,
          kind: true
        }
      }
    }
  });
  const overlay = workspace?.overlays[0];

  return overlay ? `/overlay/${overlay.kind.toLowerCase()}/${overlay.id}` : null;
}
