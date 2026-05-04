import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { saveOverlayDesign } from "@/features/overlay-builder/actions/saveOverlayDesign";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    id?: string | null;
    workspaceId?: string;
    name?: string;
    schema?: unknown;
    makeActive?: boolean;
  };

  if (!body.workspaceId || !body.name || !body.schema) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  const design = await saveOverlayDesign({
    id: body.id,
    userId: user.id,
    workspaceId: body.workspaceId,
    name: body.name,
    schema: body.schema,
    makeActive: body.makeActive === true
  });
  const designs = await listBuilderOverlays(body.workspaceId);

  return NextResponse.json({
    ok: true,
    message: "Overlay berhasil disimpan",
    design,
    designs
  });
}
