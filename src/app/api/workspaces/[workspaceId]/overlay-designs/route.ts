import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/workspaces";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";

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
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const overlays = await listBuilderOverlays(workspace.id);

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
