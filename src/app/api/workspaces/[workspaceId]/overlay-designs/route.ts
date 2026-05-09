import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { listWorkspaceOverlaysForUser } from "@/server/overlays/service";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const overlays = await listWorkspaceOverlaysForUser(user.id, workspaceId);

  return NextResponse.json({
    ok: true,
    overlays,
    workspaceDesigns: {
      chat: overlays.filter((overlay) => overlay.kind === "CHAT").map((overlay) => ({
        id: overlay.id,
        mode: "chat",
        name: overlay.name,
        source: "builder",
        schema: overlay.schema,
        design: {},
        createdAt: overlay.updatedAt,
        updatedAt: overlay.updatedAt
      })),
      focus: []
    },
    selectedDesignIds: {}
  });
}

export async function PATCH() {
  return NextResponse.json({
    ok: true,
    message: "Overlay aktif sudah tidak dipakai. Gunakan URL unik /overlay/[kind]/[overlayId]."
  });
}
