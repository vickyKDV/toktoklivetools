import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuilderLayout, type BuilderSavedDesign } from "@/features/overlay-builder/components/BuilderLayout";
import { getOverlayDesign } from "@/features/overlay-builder/actions/getOverlayDesign";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { moderatorStackTemplate } from "@/features/overlay-builder/registry/templateRegistry";
import { normalizeDesignSchema } from "@/features/overlay-builder/utils/normalizeDesignSchema";
import { requireUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspaces";

type DesignBuilderPageProps = {
  searchParams?: Promise<{
    overlayId?: string;
  }>;
};

export default async function DesignBuilderPage({ searchParams }: DesignBuilderPageProps) {
  const user = await requireUser();
  const query = searchParams ? await searchParams : {};
  const workspaces = await getUserWorkspaces(user.id);
  const selected = query.overlayId ? await getOverlayDesign(query.overlayId) : null;
  const workspace = selected ? workspaces.find((item) => item.id === selected.workspaceId) : workspaces[0];

  if (!workspace) {
    if (selected) {
      notFound();
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>JSON Overlay Builder</CardTitle>
            <CardDescription>Buat workspace dulu sebelum menyusun overlay design.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/workspaces/new">Create Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const mappedDesigns: BuilderSavedDesign[] = await listBuilderOverlays(workspace.id);
  const active = mappedDesigns[0] ?? null;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground lg:p-6">
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
    </main>
  );
}
