import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { mapOverlay } from "@/features/overlay-builder/actions/saveOverlayDesign";

export async function getOverlayDesign(overlayId: string) {
  const overlay = await prisma.overlay.findUnique({
    where: { id: overlayId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          overlayKey: true
        }
      }
    }
  });

  if (!overlay) {
    notFound();
  }

  return {
    ...mapOverlay(overlay),
    workspaceId: overlay.workspaceId,
    workspaceName: overlay.workspace.name,
    overlayKey: overlay.workspace.overlayKey
  };
}

export async function getPublishedOverlay(overlayId: string) {
  const overlay = await prisma.overlay.findUnique({
    where: { id: overlayId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          overlayKey: true
        }
      }
    }
  });

  if (!overlay) {
    notFound();
  }

  const mapped = mapOverlay(overlay);

  return {
    ...mapped,
    schema: mapped.publishedSchema ?? mapped.schema,
    workspaceName: overlay.workspace.name,
    overlayKey: overlay.workspace.overlayKey
  };
}
