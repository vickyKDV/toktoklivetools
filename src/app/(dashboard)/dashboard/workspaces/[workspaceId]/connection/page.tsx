import Link from "next/link";
import { ArrowLeft, Cable, CircleStop, Play, Save } from "lucide-react";
import {
  connectionFormAction,
  stopConnectionAction
} from "@/app/(dashboard)/dashboard/workspaces/[workspaceId]/connection/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/server/auth/session";
import { formatDateTime } from "@/lib/utils";
import { getWorkspaceForUser } from "@/server/workspaces/service";

type ConnectionPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    started?: string;
    connecting?: string;
    alreadyRunning?: string;
    stopped?: string;
    usernameUpdated?: string;
  }>;
};

export default async function ConnectionPage({ params, searchParams }: ConnectionPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const query = searchParams ? await searchParams : {};
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const status = workspace.connection?.status ?? "IDLE";
  const isBusy = status === "LIVE" || status === "CONNECTING";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/dashboard/workspaces/${workspace.id}`}>
          <ArrowLeft />
          Workspace
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Live Connection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set TikTok username dan connect ke live dari satu tempat.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Cable className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>TikTok Connection</CardTitle>
              <CardDescription>
                {workspace.tiktokUsername ? `@${workspace.tiktokUsername}` : "Masukkan username TikTok tanpa @"}
              </CardDescription>
            </div>
          </div>
          <Badge variant={status === "LIVE" ? "default" : status === "ERROR" ? "destructive" : "muted"}>
            {status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {query.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {query.error}
            </div>
          ) : null}
          {query.started ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              Connection live.
            </div>
          ) : null}
          {query.connecting ? (
            <div className="rounded-md border border-amber-300/50 bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Connection request sent. Waiting for TikTok LIVE handshake.
            </div>
          ) : null}
          {query.alreadyRunning ? (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Connection process is already running.
            </div>
          ) : null}
          {query.stopped ? (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Connection stopped.
            </div>
          ) : null}
          {query.usernameUpdated ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              TikTok username updated.
            </div>
          ) : null}

          <form action={connectionFormAction} className="rounded-lg border bg-muted/30 p-4">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="tiktokUsername">TikTok username</Label>
                <Input
                  id="tiktokUsername"
                  name="tiktokUsername"
                  defaultValue={workspace.tiktokUsername ?? ""}
                  placeholder="contoh: ronnialdinii"
                  disabled={status === "LIVE"}
                />
                <p className="text-xs text-muted-foreground">
                  Masukkan username tanpa tanda @. Stop connection dulu kalau ingin mengganti username.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SubmitButton
                  name="intent"
                  value="save"
                  variant="outline"
                  disabled={isBusy}
                  pendingLabel="Saving..."
                >
                  <Save />
                  Save
                </SubmitButton>
                <SubmitButton
                  name="intent"
                  value="start"
                  disabled={isBusy}
                  pendingLabel="Connecting..."
                >
                  <Play />
                  Connect to Live
                </SubmitButton>
              </div>
            </div>
          </form>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Started</p>
              <p className="mt-1 font-medium">
                {workspace.connection?.startedAt ? formatDateTime(workspace.connection.startedAt) : "-"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Stopped</p>
              <p className="mt-1 font-medium">
                {workspace.connection?.stoppedAt ? formatDateTime(workspace.connection.stoppedAt) : "-"}
              </p>
            </div>
          </div>

          {workspace.connection?.lastError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {workspace.connection.lastError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <form action={stopConnectionAction}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <SubmitButton variant="outline" disabled={status !== "LIVE" && status !== "CONNECTING"} pendingLabel="Stopping...">
                <CircleStop />
                Stop Connection
              </SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
