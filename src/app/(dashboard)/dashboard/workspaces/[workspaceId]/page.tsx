import Link from "next/link";
import { Cable, ClipboardList, ListTree, MonitorUp, Palette, Settings, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { getWorkspaceForUser } from "@/lib/workspaces";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const latestEvents = await prisma.liveEvent.findMany({
    where: {
      workspaceId
    },
    orderBy: {
      receivedAt: "desc"
    },
    take: 8
  });

  const actionLinks = [
    {
      href: `/dashboard/workspaces/${workspace.id}/connection`,
      label: "Connection",
      icon: Cable
    },
    {
      href: `/dashboard/workspaces/${workspace.id}/rules`,
      label: "Rules",
      icon: ListTree
    },
    {
      href: `/dashboard/workspaces/${workspace.id}/automation-builder`,
      label: "Automation Builder",
      icon: Workflow
    },
    {
      href: `/dashboard/workspaces/${workspace.id}/overlays`,
      label: "Overlays",
      icon: MonitorUp
    },
    {
      href: `/dashboard/workspaces/${workspace.id}/overlay-design-builder`,
      label: "Design Builder",
      icon: Palette
    },
    {
      href: `/dashboard/workspaces/${workspace.id}/events`,
      label: "Event Logs",
      icon: ClipboardList
    }
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal">{workspace.name}</h1>
            <Badge variant={workspace.connection?.status === "LIVE" ? "default" : "muted"}>
              {workspace.connection?.status ?? "IDLE"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.tiktokUsername ? `@${workspace.tiktokUsername}` : "Set TikTok username before connecting"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/workspaces/${workspace.id}/settings`}>
            <Settings />
            Settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {actionLinks.map((link) => (
          <Button key={link.href} asChild variant="outline" className="h-16 justify-start">
            <Link href={link.href}>
              <link.icon />
              {link.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{workspace._count.liveEvents}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rules</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{workspace._count.rules}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overlay Key</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="break-all rounded-md bg-muted px-2 py-1 text-xs">{workspace.overlayKey}</code>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Latest Events</CardTitle>
          <Button asChild variant="ghost">
            <Link href={`/dashboard/workspaces/${workspace.id}/events`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {latestEvents.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Payload</th>
                    <th className="py-2 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {latestEvents.map((event) => (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">{event.type}</td>
                      <td className="py-3 pr-4">{event.username ?? "-"}</td>
                      <td className="max-w-md truncate py-3 pr-4">
                        {event.giftName ?? event.comment ?? event.viewerCount ?? "-"}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDateTime(event.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Events will appear here after the live connector starts receiving activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
