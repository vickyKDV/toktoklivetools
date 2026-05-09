import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { stopTikTokConnection } from "@/server/tiktok/connection-manager";
import { getWorkspaceForUser } from "@/server/workspaces/service";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const result = await stopTikTokConnection(workspace.id);

  return NextResponse.json(result);
}
