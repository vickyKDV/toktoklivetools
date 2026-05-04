import { OverlaySceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import { dummyOverlayData } from "@/features/overlay-builder/schema/overlaySchema";
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
