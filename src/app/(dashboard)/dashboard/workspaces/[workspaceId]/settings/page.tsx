import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  deleteWorkspaceAction,
  updateWorkspaceAction
} from "@/app/(dashboard)/dashboard/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/workspaces";

type WorkspaceSettingsPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function WorkspaceSettingsPage({
  params,
  searchParams
}: WorkspaceSettingsPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const query = searchParams ? await searchParams : {};
  const workspace = await getWorkspaceForUser(user.id, workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href={`/dashboard/workspaces/${workspace.id}`}>
          <ArrowLeft />
          Workspace
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>Update project name. TikTok LIVE username sekarang diatur dari menu Live Connection.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {query.error}
            </div>
          ) : null}
          {query.updated ? (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              Workspace updated.
            </div>
          ) : null}
          <form action={updateWorkspaceAction} className="space-y-4">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <input type="hidden" name="tiktokUsername" value={workspace.tiktokUsername ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" defaultValue={workspace.name} required />
            </div>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              TikTok username:{" "}
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/dashboard/workspaces/${workspace.id}/connection`}>
                {workspace.tiktokUsername ? `@${workspace.tiktokUsername}` : "atur di Live Connection"}
              </Link>
            </p>
            <SubmitButton>Save Changes</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Deleting a workspace removes rules, overlays, logs, and sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteWorkspaceAction}>
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <SubmitButton variant="destructive" pendingLabel="Deleting...">
              <Trash2 />
              Delete Workspace
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
