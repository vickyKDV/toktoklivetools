import "server-only";

import { notFound } from "next/navigation";
import {
  getOverlayDesignById,
  getOverlayDesignForUser,
  getPublishedOverlayById
} from "@/server/overlays/service";

export async function getOverlayDesign(overlayId: string) {
  const overlay = await getOverlayDesignById(overlayId);

  if (!overlay) {
    notFound();
  }

  return overlay;
}

export async function getWorkspaceOverlayDesign(input: {
  userId: string;
  workspaceId: string;
  overlayId: string;
}) {
  const overlay = await getOverlayDesignForUser(input);

  if (!overlay) {
    notFound();
  }

  return overlay;
}

export async function getPublishedOverlay(overlayId: string) {
  const overlay = await getPublishedOverlayById(overlayId);

  if (!overlay) {
    notFound();
  }

  return overlay;
}
