import "server-only";

import { Prisma, type OverlayKind } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getWorkspaceForUser } from "@/server/workspaces/service";
import { normalizeDesignSchema } from "@/core/overlay/normalizeDesignSchema";
import type { OverlayDesignSchema } from "@/core/overlay/schema";

export type SaveOverlayDesignInput = {
  id?: string | null;
  userId: string;
  workspaceId: string;
  name: string;
  schema: unknown;
  makeActive?: boolean;
  publish?: boolean;
  overlayType?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
  kind?: OverlayKind;
};

export type OverlayRecordForMap = {
  id: string;
  workspaceId: string;
  kind: OverlayKind;
  name: string;
  draftSchema: Prisma.JsonValue;
  publishedSchema: Prisma.JsonValue | null;
  updatedAt: Date;
  publishedAt: Date | null;
};

export async function listWorkspaceOverlaysForUser(userId: string, workspaceId: string) {
  const workspace = await getWorkspaceForUser(userId, workspaceId);
  return listWorkspaceOverlays(workspace.id);
}

export async function listWorkspaceOverlays(workspaceId: string) {
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

export async function getOverlayDesignForUser(input: {
  userId: string;
  workspaceId: string;
  overlayId: string;
}) {
  const workspace = await getWorkspaceForUser(input.userId, input.workspaceId);
  const overlay = await prisma.overlay.findFirst({
    where: {
      id: input.overlayId,
      workspaceId: workspace.id
    },
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

  return overlay ? mapOverlayWithWorkspace(overlay) : null;
}

export async function getOverlayDesignById(overlayId: string) {
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

  return overlay ? mapOverlayWithWorkspace(overlay) : null;
}

export async function getPublishedOverlayById(overlayId: string) {
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
    return null;
  }

  const mapped = mapOverlay(overlay);

  return {
    ...mapped,
    schema: mapped.publishedSchema ?? mapped.schema,
    workspaceName: overlay.workspace.name,
    overlayKey: overlay.workspace.overlayKey
  };
}

export async function saveOverlayDesign(input: SaveOverlayDesignInput) {
  const workspace = await getWorkspaceForUser(input.userId, input.workspaceId);
  const kind = resolveKind(input);
  const schema = normalizeDesignSchema({
    ...(input.schema as Partial<OverlayDesignSchema>),
    version: 2,
    kind,
    name: input.name
  });
  const existing = input.id
    ? await prisma.overlay.findFirst({
        where: {
          id: input.id,
          workspaceId: workspace.id
        }
      })
    : null;
  const data = {
    workspaceId: workspace.id,
    kind,
    name: schema.name,
    draftSchema: schema as unknown as Prisma.InputJsonValue,
    publishedSchema: input.publish ? schema as unknown as Prisma.InputJsonValue : undefined,
    publishedAt: input.publish ? new Date() : undefined
  };
  const overlay = existing
    ? await prisma.overlay.update({
        where: { id: existing.id },
        data: {
          kind,
          name: schema.name,
          draftSchema: data.draftSchema,
          ...(input.publish ? { publishedSchema: data.publishedSchema, publishedAt: data.publishedAt } : {})
        }
      })
    : await prisma.overlay.create({
        data
      });

  return mapOverlay(overlay);
}

export async function publishOverlayDesign(input: { id: string; userId: string; workspaceId: string }) {
  const workspace = await getWorkspaceForUser(input.userId, input.workspaceId);
  const overlay = await prisma.overlay.findFirst({
    where: {
      id: input.id,
      workspaceId: workspace.id
    }
  });

  if (!overlay) {
    return null;
  }

  const updated = await prisma.overlay.update({
    where: { id: overlay.id },
    data: {
      publishedSchema: overlay.draftSchema as Prisma.InputJsonValue,
      publishedAt: new Date()
    }
  });

  return mapOverlay(updated);
}

export async function updateOverlayForUser(input: {
  overlayId: string;
  userId: string;
  name?: string;
  schema?: unknown;
  publish?: boolean;
  kind?: OverlayKind;
  overlayType?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
}) {
  const existing = await prisma.overlay.findUnique({
    where: { id: input.overlayId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      kind: true,
      draftSchema: true
    }
  });

  if (!existing) {
    return null;
  }

  await getWorkspaceForUser(input.userId, existing.workspaceId);

  return saveOverlayDesign({
    id: existing.id,
    userId: input.userId,
    workspaceId: existing.workspaceId,
    name: input.name ?? existing.name,
    schema: input.schema ?? existing.draftSchema,
    publish: input.publish === true,
    kind: input.kind ?? existing.kind,
    overlayType: input.overlayType ?? (existing.kind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY")
  });
}

export async function deleteOverlayForUser(input: { overlayId: string; userId: string }) {
  const existing = await prisma.overlay.findUnique({
    where: { id: input.overlayId },
    select: {
      id: true,
      workspaceId: true
    }
  });

  if (!existing) {
    return false;
  }

  await getWorkspaceForUser(input.userId, existing.workspaceId);
  await prisma.overlay.delete({
    where: { id: existing.id }
  });

  return true;
}

export function mapOverlay(overlay: OverlayRecordForMap) {
  return {
    id: overlay.id,
    workspaceId: overlay.workspaceId,
    name: overlay.name,
    schema: normalizeDesignSchema(overlay.draftSchema),
    publishedSchema: overlay.publishedSchema ? normalizeDesignSchema(overlay.publishedSchema) : null,
    kind: overlay.kind,
    overlayType: overlay.kind === "CHAT" ? "CHAT_STYLE" as const : "CUSTOM_OVERLAY" as const,
    isActive: Boolean(overlay.publishedAt),
    updatedAt: overlay.updatedAt.toISOString(),
    publishedAt: overlay.publishedAt?.toISOString() ?? null
  };
}

function mapOverlayWithWorkspace(overlay: OverlayRecordForMap & {
  workspace: {
    name: string;
    overlayKey: string;
  };
}) {
  return {
    ...mapOverlay(overlay),
    workspaceId: overlay.workspaceId,
    workspaceName: overlay.workspace.name,
    overlayKey: overlay.workspace.overlayKey
  };
}

function resolveKind(input: SaveOverlayDesignInput): OverlayKind {
  if (input.kind) {
    return input.kind;
  }

  if (input.overlayType === "CHAT_STYLE") {
    return "CHAT";
  }

  const value = input.schema && typeof input.schema === "object" && "kind" in input.schema
    ? (input.schema as { kind?: unknown }).kind
    : null;

  if (value === "CHAT" || value === "GIFT" || value === "LEADERBOARD" || value === "DOCK" || value === "CUSTOM" || value === "STATIC" || value === "GOAL") {
    return value;
  }

  return "CUSTOM";
}
