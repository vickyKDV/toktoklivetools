import Link from "next/link";
import { ArrowLeft, ExternalLink, Monitor, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { requireUser } from "@/lib/auth";
import { getWidgetBaseUrl } from "@/lib/utils";
import { getWorkspaceForUser } from "@/lib/workspaces";

type OverlaysPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function OverlaysPage({ params }: OverlaysPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const widgetBaseUrl = getWidgetBaseUrl();
  const overlays = await listBuilderOverlays(workspace.id);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/dashboard/workspaces/${workspace.id}`}>
          <ArrowLeft />
          Workspace
        </Link>
      </Button>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Overlays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua overlay sekarang resource JSON mandiri dengan URL OBS unik per overlay id.
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder`}>
            <Palette />
            New Overlay
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-4" />
            JSON Overlay Runtime
          </CardTitle>
          <CardDescription>
            Draft bisa diedit tanpa mengubah OBS. Klik Publish di builder untuk memperbarui published schema pada URL yang sama.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {overlays.length ? overlays.map((overlay) => {
            const outputUrl = `${widgetBaseUrl}/overlay/${overlay.kind.toLowerCase()}/${overlay.id}`;

            return (
              <div key={overlay.id} className="grid gap-3 rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{overlay.name}</p>
                      <span className="rounded-md border px-2 py-1 text-xs font-semibold text-muted-foreground">{overlay.kind}</span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {overlay.publishedAt ? "Published" : "Draft only"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {overlay.schema.canvas.width}x{overlay.schema.canvas.height} · Updated {new Date(overlay.updatedAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder?overlayId=${overlay.id}`}>
                        <Palette />
                        Edit
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/overlay-preview/${overlay.id}`} target="_blank">
                        <ExternalLink />
                        Preview
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={outputUrl} target="_blank">
                        <Monitor />
                        OBS
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input readOnly value={outputUrl} />
                  <CopyButton value={outputUrl} />
                </div>
              </div>
            );
          }) : (
            <div className="grid gap-3 rounded-lg border border-dashed p-4">
              <p className="text-sm text-muted-foreground">Belum ada overlay. Buat overlay JSON pertama dari builder.</p>
              <Button asChild className="w-fit">
                <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder`}>
                  <Palette />
                  Buka Overlay Builder
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
