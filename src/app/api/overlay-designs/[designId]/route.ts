import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getOverlayDesignById } from "@/server/overlays/service";
import { getWorkspaceForUser } from "@/server/workspaces/service";

type RouteContext = {
  params: Promise<{
    designId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await context.params;
  const design = await getOverlayDesignById(designId);

  if (!design) {
    return NextResponse.json({ ok: false, message: "Overlay tidak ditemukan." }, { status: 404 });
  }

  await getWorkspaceForUser(user.id, design.workspaceId);

  return NextResponse.json({ ok: true, design });
}
