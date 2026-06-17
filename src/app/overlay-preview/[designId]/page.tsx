import { OverlaySceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import { ChatOverlayRuntimeClient } from "@/features/overlay-runtime/chat/ChatOverlayRuntimeClient";
import { dummyOverlayData } from "@/core/overlay/schema";
import { getOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";

type OverlayPreviewPageProps = {
  params: Promise<{
    designId: string;
  }>;
  searchParams?: Promise<{
    debug?: string;
  }>;
};

export default async function OverlayPreviewPage({ params, searchParams }: OverlayPreviewPageProps) {
  const { designId } = await params;
  const query = searchParams ? await searchParams : {};
  const design = await getOverlayDesign(designId);
  const scale = 0.8;

  if (design.kind === "CHAT") {
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
        <ChatOverlayRuntimeClient
          schema={design.schema}
          overlayKey={design.overlayKey}
          preview
          debug={query.debug === "1"}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          html,
          body,
          #__next {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
          }
        ` }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-auto bg-muted/40 p-8">
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-normal">{design.name}</h1>
        <p className="text-sm text-muted-foreground">Preview membaca JSON schema yang sama dengan OBS output.</p>
      </div>
      <OverlaySceneRenderer
        schema={design.schema}
        data={dummyOverlayData}
        scale={scale}
        debug={query.debug === "1"}
      />
    </main>
  );
}
