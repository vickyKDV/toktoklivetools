import { getOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";
import { OverlayOutputClient } from "@/features/overlay-builder/components/OverlayOutputClient";

export const dynamic = "force-dynamic";

type OverlayOutputPageProps = {
  params: Promise<{
    designId: string;
  }>;
  searchParams?: Promise<{
    transparent?: string;
    debug?: string;
  }>;
};

export default async function OverlayOutputPage({ params, searchParams }: OverlayOutputPageProps) {
  const { designId } = await params;
  const query = searchParams ? await searchParams : {};
  const design = await getOverlayDesign(designId);
  const transparent = query.transparent !== "false";

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: transparent ? "transparent" : undefined
      }}
    >
      <OverlayOutputClient
        designJson={design.schema}
        overlayType={design.overlayType}
        overlayKey={design.overlayKey}
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
          background: ${transparent ? "transparent" : "initial"};
          overflow: hidden;
        }
      ` }} />
    </main>
  );
}
