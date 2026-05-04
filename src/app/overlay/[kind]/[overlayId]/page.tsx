import { notFound } from "next/navigation";
import { OverlayRuntimeClient } from "@/features/overlay-builder/components/OverlayRuntimeClient";
import { getPublishedOverlay } from "@/features/overlay-builder/actions/getOverlayDesign";

export const dynamic = "force-dynamic";

type OverlayRuntimePageProps = {
  params: Promise<{
    kind: string;
    overlayId: string;
  }>;
  searchParams?: Promise<{
    preview?: string;
    debug?: string;
  }>;
};

const kindMap = {
  chat: "CHAT",
  gift: "GIFT",
  leaderboard: "LEADERBOARD",
  dock: "DOCK",
  custom: "CUSTOM"
} as const;

export default async function OverlayRuntimePage({ params, searchParams }: OverlayRuntimePageProps) {
  const { kind, overlayId } = await params;
  const query = searchParams ? await searchParams : {};
  const expectedKind = kindMap[kind as keyof typeof kindMap];

  if (!expectedKind) {
    notFound();
  }

  const overlay = await getPublishedOverlay(overlayId);

  if (overlay.kind !== expectedKind) {
    notFound();
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "transparent"
      }}
    >
      <OverlayRuntimeClient
        schema={overlay.schema}
        overlayKey={overlay.overlayKey}
        preview={query.preview === "1"}
        debug={query.debug === "1"}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        html,
        body {
          margin: 0;
          padding: 0;
          background: transparent;
          overflow: hidden;
        }
      ` }} />
    </main>
  );
}
