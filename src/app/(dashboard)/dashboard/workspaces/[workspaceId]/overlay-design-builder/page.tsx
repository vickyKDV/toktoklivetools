import { BuilderLayout, type BuilderSavedDesign } from "@/features/overlay-builder/components/BuilderLayout";
import { ThemeStudio, type ThemeStudioSavedDesign, type ThemeStudioTemplate } from "@/features/overlay-builder/components/ThemeStudio";
import { getWorkspaceOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { moderatorStackTemplate, overlayTemplates } from "@/features/overlay-builder/registry/templateRegistry";
import { normalizeDesignSchema } from "@/core/overlay/normalizeDesignSchema";
import { requireUser } from "@/server/auth/session";
import { getWorkspaceMetaForUser } from "@/server/workspaces/service";

type OverlayDesignBuilderPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    advanced?: string;
    kind?: string;
    overlayId?: string;
  }>;
};

const themeStudioKinds = ["CHAT", "GIFT", "LEADERBOARD", "STATIC", "GOAL"] as const;

export default async function OverlayDesignBuilderPage({ params, searchParams }: OverlayDesignBuilderPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const query = searchParams ? await searchParams : {};
  const workspace = await getWorkspaceMetaForUser(user.id, workspaceId);
  const mappedDesigns: BuilderSavedDesign[] = await listBuilderOverlays(workspace.id);
  const selected = query.overlayId
    ? await getWorkspaceOverlayDesign({ userId: user.id, workspaceId: workspace.id, overlayId: query.overlayId })
    : null;
  const active = mappedDesigns[0] ?? null;
  const initialKind = themeStudioKinds.find((kind) => kind === query.kind) ?? "CHAT";

  if (query.advanced !== "1") {
    return (
      <ThemeStudio
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        initialKind={initialKind}
        initialDesignId={selected?.id ?? null}
        initialDesigns={mappedDesigns.map((design): ThemeStudioSavedDesign => ({
          id: design.id,
          name: design.name,
          schema: design.schema,
          kind: design.kind,
          publishedAt: design.publishedAt
        }))}
        templates={overlayTemplates.map((template): ThemeStudioTemplate => {
          const schema = normalizeDesignSchema(template.schema);

          return {
            id: template.id,
            name: template.name,
            description: template.description,
            kind: schema.kind,
            schema
          };
        })}
      />
    );
  }

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
