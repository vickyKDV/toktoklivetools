import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { getUserWorkspaces } from "@/server/workspaces/service";

export default async function AutomationBuilderEntryPage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  const workspace = workspaces[0];

  if (workspace) {
    redirect(`/dashboard/workspaces/${workspace.id}/automation-builder`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Automation Builder</CardTitle>
          <CardDescription>Buat workspace dulu sebelum menyusun automation flow.</CardDescription>
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
