import Link from "next/link";
import { Blocks, CalendarClock, Plus, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { formatDateTime } from "@/lib/utils";
import { getUserWorkspaces } from "@/server/workspaces/service";

export default async function WorkspacesPage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Separate every project live by TikTok username, rules, overlays, and logs.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workspaces/new">
            <Plus />
            New Workspace
          </Link>
        </Button>
      </div>

      {workspaces.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{workspace.name}</CardTitle>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {workspace.tiktokUsername ? `@${workspace.tiktokUsername}` : "TikTok username not set"}
                    </p>
                  </div>
                  <Badge variant={workspace.connection?.status === "LIVE" ? "default" : "muted"}>
                    {workspace.connection?.status ?? "IDLE"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Events</p>
                    <p className="font-semibold">{workspace._count.liveEvents}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Rules</p>
                    <p className="font-semibold">{workspace._count.rules}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Overlays</p>
                    <p className="font-semibold">{workspace._count.overlays}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-4" />
                  Updated {formatDateTime(workspace.updatedAt)}
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/workspaces/${workspace.id}`}>
                    <Radio />
                    Open Workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Blocks className="size-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">No workspaces yet</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Create one project live before connecting TikTok and routing alerts to OBS.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/workspaces/new">
                <Plus />
                New Workspace
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
