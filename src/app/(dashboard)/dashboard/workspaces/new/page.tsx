import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createWorkspaceAction } from "@/app/(dashboard)/dashboard/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type NewWorkspacePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewWorkspacePage({ searchParams }: NewWorkspacePageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/dashboard/workspaces">
          <ArrowLeft />
          Workspaces
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>New Workspace</CardTitle>
          <CardDescription>
            One workspace maps to one live project, one TikTok username, and its own rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {params.error}
            </div>
          ) : null}
          <form action={createWorkspaceAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" placeholder="Ramadan Flash Sale Live" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktokUsername">TikTok username</Label>
              <Input id="tiktokUsername" name="tiktokUsername" placeholder="brand_live_id" />
            </div>
            <SubmitButton pendingLabel="Creating...">Create Workspace</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
