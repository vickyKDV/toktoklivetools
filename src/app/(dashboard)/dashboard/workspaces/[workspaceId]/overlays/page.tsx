import Link from "next/link";
import { ArrowLeft, ExternalLink, Monitor, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLinkButton } from "@/components/ui/external-link-button";
import { Input } from "@/components/ui/input";
import { listBuilderOverlays } from "@/features/overlay-builder/actions/listBuilderOverlays";
import { OverlayThumbnail } from "@/features/overlay-builder/components/OverlayThumbnail";
import { requireUser } from "@/server/auth/session";
import { getWidgetBaseUrl } from "@/lib/utils";
import { getWorkspaceOverlayKindCounts } from "@/server/overlays/service";
import { getWorkspaceMetaForUser } from "@/server/workspaces/service";

type OverlaysPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    kind?: string;
  }>;
};

const overlayKindTabs = [
  { kind: "CHAT", label: "Chat" },
  { kind: "LEADERBOARD", label: "Leaderboard" },
  { kind: "GIFT", label: "Gift" },
  { kind: "DOCK", label: "Dock" },
  { kind: "STATIC", label: "Static" },
  { kind: "GOAL", label: "Goal" },
  { kind: "CUSTOM", label: "Custom" }
] as const;

export default async function OverlaysPage({ params, searchParams }: OverlaysPageProps) {
  const resolvedSearchParams = searchParams ?? Promise.resolve({} as { kind?: string });
  const [user, { workspaceId }, query] = await Promise.all([
    requireUser(),
    params,
    resolvedSearchParams
  ]);
  const widgetBaseUrl = getWidgetBaseUrl();
  const requestedKind = overlayKindTabs.find((tab) => tab.kind === query?.kind)?.kind;
  const selectedKind = requestedKind ?? "CHAT";
  const [workspace, kindCounts, selectedOverlays] = await Promise.all([
    getWorkspaceMetaForUser(user.id, workspaceId),
    getWorkspaceOverlayKindCounts(workspaceId),
    listBuilderOverlays(workspaceId, selectedKind)
  ]);
  const countByKind = new Map(kindCounts.map((item) => [item.kind, item.count]));
  const selectedTab = overlayKindTabs.find((tab) => tab.kind === selectedKind) ?? overlayKindTabs[0];
  const dockUrl = `${widgetBaseUrl}/widgets/dock/chat/${workspace.overlayKey}`;
  const isDockView = selectedKind === "DOCK";

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
            Pilih theme siap pakai, atur animasi show/hide, lalu pakai URL OBS unik per overlay.
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder?kind=${selectedKind}`}>
            <Palette />
            Choose Theme
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
            Theme bisa dipublish ulang tanpa mengubah URL OBS yang sudah dipasang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5">
            <section className="grid min-w-0 gap-4">
              <div className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold">{selectedTab.label} Overlays</p>
                  <p className="text-xs text-muted-foreground">
                    {countByKind.get(selectedKind) ?? 0} overlay dalam type {selectedKind}.
                  </p>
                </div>
                {isDockView ? null : (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder?kind=${selectedKind}`}>
                      <Palette />
                      New {selectedTab.label} Theme
                    </Link>
                  </Button>
                )}
              </div>

              {isDockView ? (
                <article className="grid min-w-0 gap-4 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/30 md:max-w-xl">
                  <DockThumbnail />
                  <div className="grid min-w-0 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-semibold">System Comment Dock</p>
                      <span className="rounded-md border px-2 py-1 text-xs font-semibold text-muted-foreground">DOCK</span>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">System</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dock komentar untuk memilih comment dan mengirim focus ke overlay single custom.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Input readOnly value={dockUrl} className="text-xs" />
                    <CopyButton value={dockUrl} />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ExternalLinkButton href={dockUrl} variant="outline" size="sm">
                      <ExternalLink />
                      Open Dock
                    </ExternalLinkButton>
                  </div>
                </article>
              ) : selectedOverlays.length ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {selectedOverlays.map((overlay) => {
                    const outputUrl = `${widgetBaseUrl}/overlay/${overlay.kind.toLowerCase()}/${overlay.id}`;

                    return (
                      <article key={overlay.id} className="grid min-w-0 gap-4 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/30">
                        <OverlayThumbnail schema={overlay.schema} />
                        <div className="grid min-w-0 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 truncate font-semibold">{overlay.name}</p>
                            <span className="rounded-md border px-2 py-1 text-xs font-semibold text-muted-foreground">{overlay.kind}</span>
                            <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {overlay.publishedAt ? "Published" : "Draft only"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {overlay.schema.canvas.width}x{overlay.schema.canvas.height} · Updated {new Date(overlay.updatedAt).toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Input readOnly value={outputUrl} className="text-xs" />
                          <CopyButton value={outputUrl} />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder?overlayId=${overlay.id}`}>
                              <Palette />
                              Setup
                            </Link>
                          </Button>
                          <ExternalLinkButton href={`/overlay-preview/${overlay.id}`} variant="outline" size="sm">
                            <ExternalLink />
                            Preview
                          </ExternalLinkButton>
                          <ExternalLinkButton href={outputUrl} variant="outline" size="sm">
                            <Monitor />
                            OBS
                          </ExternalLinkButton>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3 rounded-lg border border-dashed p-5">
                  <p className="text-sm text-muted-foreground">Belum ada overlay type {selectedKind}. Pilih theme preset untuk membuat overlay baru.</p>
                  <Button asChild className="w-fit">
                    <Link href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder?kind=${selectedKind}`}>
                      <Palette />
                      Buka Theme Studio
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DockThumbnail() {
  return (
    <div className="grid h-40 gap-2 overflow-hidden rounded-md border bg-zinc-950 p-4 text-zinc-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Overlay Dock</p>
          <p className="text-xs text-zinc-500">comment focus</p>
        </div>
        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">Realtime</span>
      </div>
      <div className="grid gap-2">
        <div className="rounded-lg border border-sky-400/50 bg-sky-500/20 p-2">
          <p className="text-xs font-semibold">Dina Jac</p>
          <p className="mt-1 truncate text-xs text-zinc-200">Ini komentar yang dikirim ke overlay.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <p className="text-xs font-semibold">Viewer</p>
          <p className="mt-1 truncate text-xs text-zinc-400">Klik komentar untuk focus.</p>
        </div>
      </div>
    </div>
  );
}
