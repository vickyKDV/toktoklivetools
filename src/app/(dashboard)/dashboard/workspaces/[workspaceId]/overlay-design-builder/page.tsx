import { notFound } from "next/navigation";
import { BuilderLayout, type BuilderSavedDesign } from "@/features/overlay-builder/components/BuilderLayout";
import { getOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { moderatorStackTemplate } from "@/features/overlay-builder/registry/templateRegistry";
import { normalizeDesignSchema } from "@/features/overlay-builder/utils/normalizeDesignSchema";
import { requireUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/workspaces";

type OverlayDesignBuilderPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    overlayId?: string;
  }>;
};

export default async function OverlayDesignBuilderPage({ params, searchParams }: OverlayDesignBuilderPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const query = searchParams ? await searchParams : {};
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const mappedDesigns: BuilderSavedDesign[] = await listBuilderOverlays(workspace.id);
  const selected = query.overlayId ? await getOverlayDesign(query.overlayId) : null;
  if (selected && selected.workspaceId !== workspace.id) {
    notFound();
  }
  const active = mappedDesigns[0] ?? null;

  return (
    <BuilderLayout
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      workspaceOverlayKey={workspace.overlayKey}
      initialDesign={selected?.schema ?? active?.schema ?? normalizeDesignSchema(moderatorStackTemplate.schema)}
      initialDesignId={selected?.id ?? active?.id ?? null}
      initialDesigns={selected && !mappedDesigns.some((design) => design.id === selected.id)
        ? [
            {
              id: selected.id,
              name: selected.name,
              schema: selected.schema,
              kind: selected.kind,
              overlayType: selected.overlayType,
              isActive: selected.isActive,
              updatedAt: selected.updatedAt,
              publishedAt: selected.publishedAt
            },
            ...mappedDesigns
          ]
        : mappedDesigns}
    />
  );
}
