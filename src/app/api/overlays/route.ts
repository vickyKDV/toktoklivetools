import { NextResponse } from "next/server";
import type { OverlayKind } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/session";
import {
  listWorkspaceOverlays,
  listWorkspaceOverlaysForUser,
  saveOverlayDesign
} from "@/server/overlays/service";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "workspaceId wajib diisi." }, { status: 400 });
  }

  const overlays = await listWorkspaceOverlaysForUser(user.id, workspaceId);

  return NextResponse.json({ ok: true, overlays });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    workspaceId?: string;
    name?: string;
    schema?: unknown;
    makeActive?: boolean;
    publish?: boolean;
    kind?: OverlayKind;
    overlayType?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
    type?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
  };

  if (!body.workspaceId || !body.name || !body.schema) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  const overlay = await saveOverlayDesign({
    userId: user.id,
    workspaceId: body.workspaceId,
    name: body.name,
    schema: body.schema,
    makeActive: body.makeActive === true,
    publish: body.publish === true,
    kind: body.kind,
    overlayType: body.overlayType ?? body.type ?? "CUSTOM_OVERLAY"
  });
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
