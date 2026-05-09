import { NextResponse } from "next/server";
import type { OverlayKind } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/session";
import {
  deleteOverlayForUser,
  listWorkspaceOverlays,
  updateOverlayForUser
} from "@/server/overlays/service";

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
  const overlay = await updateOverlayForUser({
    overlayId: overlayKey,
    userId: user.id,
    name: body.name,
    schema: body.schema,
    publish: body.publish === true,
    kind: body.kind,
    overlayType: body.overlayType ?? body.type
  });

  if (!overlay) {
    return NextResponse.json({ ok: false, message: "Overlay tidak ditemukan." }, { status: 404 });
  }

  const overlays = await listWorkspaceOverlays(overlay.workspaceId);

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
  const deleted = await deleteOverlayForUser({ overlayId: overlayKey, userId: user.id });

  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Overlay tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, message: "Overlay berhasil dihapus" });
}
