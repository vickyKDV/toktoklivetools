import { NextResponse } from "next/server";
import { getOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";

type RouteContext = {
  params: Promise<{
    designId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { designId } = await context.params;
  const design = await getOverlayDesign(designId);

  return NextResponse.json({ ok: true, design });
}
