import "server-only";

import { Prisma, type OverlayKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceForUser } from "@/lib/workspaces";
import { normalizeDesignSchema } from "@/features/overlay-builder/utils/normalizeDesignSchema";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

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

export function mapOverlay(overlay: {
  id: string;
  workspaceId: string;
  kind: OverlayKind;
  name: string;
  draftSchema: Prisma.JsonValue;
  publishedSchema: Prisma.JsonValue | null;
  updatedAt: Date;
  publishedAt: Date | null;
}) {
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

  if (value === "CHAT" || value === "GIFT" || value === "LEADERBOARD" || value === "DOCK" || value === "CUSTOM" || value === "STATIC") {
    return value;
  }

  return "CUSTOM";
}
