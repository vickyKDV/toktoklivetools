import { NextResponse } from "next/server";
import type { OverlayKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceForUser } from "@/lib/workspaces";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { saveOverlayDesign } from "@/features/overlay-builder/actions/saveOverlayDesign";

type OverlayRouteProps = {
  params: Promise<{
    overlayKey: string;
  }>;
};

export async function PATCH(request: Request, { params }: OverlayRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { overlayKey } = await params;
  const body = await request.json() as {
    workspaceId?: string;
    name?: string;
    schema?: unknown;
    makeActive?: boolean;
    isActive?: boolean;
    publish?: boolean;
    kind?: OverlayKind;
    overlayType?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
    type?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
  };
  const existing = await prisma.overlay.findUnique({
    where: { id: overlayKey },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      kind: true,
      draftSchema: true
    }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Overlay tidak ditemukan." }, { status: 404 });
  }

  const workspace = await getWorkspaceForUser(user.id, existing.workspaceId);
  const overlay = await saveOverlayDesign({
    id: existing.id,
    userId: user.id,
    workspaceId: workspace.id,
    name: body.name ?? existing.name,
    schema: body.schema ?? existing.draftSchema,
    makeActive: body.makeActive ?? body.isActive ?? false,
    publish: body.publish === true,
    kind: body.kind ?? existing.kind,
    overlayType: body.overlayType ?? body.type ?? (existing.kind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY")
  });
  const overlays = await listBuilderOverlays(workspace.id);

  return NextResponse.json({
    ok: true,
    message: "Overlay berhasil disimpan",
    design: overlay,
    overlay,
    overlays,
    designs: overlays
  });
}

export async function DELETE(_request: Request, { params }: OverlayRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { overlayKey } = await params;
  const existing = await prisma.overlay.findUnique({
    where: { id: overlayKey },
    select: {
      id: true,
      workspaceId: true,
      kind: true
    }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Overlay tidak ditemukan." }, { status: 404 });
  }

  await getWorkspaceForUser(user.id, existing.workspaceId);
  await prisma.overlay.delete({
    where: { id: existing.id }
  });

  return NextResponse.json({ ok: true, message: "Overlay berhasil dihapus" });
}
