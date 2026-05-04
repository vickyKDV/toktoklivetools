import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stopTikTokConnection } from "@/lib/tiktok/connection-manager";
import { getWorkspaceForUser } from "@/lib/workspaces";

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
