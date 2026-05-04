import { ActionOverlayClient } from "@/app/overlay-action/[overlayKey]/action-overlay-client";

export const dynamic = "force-dynamic";

type ActionOverlayPageProps = {
  params: Promise<{
    overlayKey: string;
  }>;
  searchParams?: Promise<{
    flowId?: string;
    position?: string;
  }>;
};

export default async function ActionOverlayPage({ params, searchParams }: ActionOverlayPageProps) {
  const { overlayKey } = await params;
  const query = searchParams ? await searchParams : {};

  return <ActionOverlayClient overlayKey={overlayKey} flowId={query.flowId} position={query.position ?? "center"} />;
}
