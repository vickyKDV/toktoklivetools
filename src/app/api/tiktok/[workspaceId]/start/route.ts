import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startTikTokConnection } from "@/lib/tiktok/connection-manager";
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

  try {
    const result = await startTikTokConnection(workspace.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start connection" },
      { status: 400 }
    );
  }
}
