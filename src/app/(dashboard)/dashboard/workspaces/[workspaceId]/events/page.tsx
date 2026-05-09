import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RealtimeEventFeed } from "@/components/dashboard/realtime-event-feed";
import { requireUser } from "@/server/auth/session";
import { formatDateTime } from "@/lib/utils";
import { getWorkspaceEventsForUser, getWorkspaceForUser } from "@/server/workspaces/service";

type EventsPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function EventsPage({ params }: EventsPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const [workspace, events] = await Promise.all([
    getWorkspaceForUser(user.id, workspaceId),
    getWorkspaceEventsForUser(user.id, workspaceId)
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/dashboard/workspaces/${workspace.id}`}>
          <ArrowLeft />
          Workspace
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Event Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 100 TikTok LIVE events stored for {workspace.name}.
        </p>
      </div>

      <RealtimeEventFeed workspaceId={workspace.id} />

      <Card>
        <CardHeader>
          <CardTitle>Realtime Events</CardTitle>
          <CardDescription>Data is persisted before rules and overlay actions run.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Gift</th>
                    <th className="py-2 pr-4 font-medium">Comment</th>
                    <th className="py-2 font-medium">Metric</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b align-top last:border-0">
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {formatDateTime(event.receivedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{event.type}</Badge>
                      </td>
                      <td className="py-3 pr-4">{event.username ?? event.displayName ?? "-"}</td>
                      <td className="py-3 pr-4">
                        {event.giftName
                          ? `${event.giftName}${event.giftCount ? ` x${event.giftCount}` : ""}`
                          : "-"}
                      </td>
                      <td className="max-w-xs truncate py-3 pr-4">{event.comment ?? "-"}</td>
                      <td className="py-3">
                        {event.likeCount ?? event.shareCount ?? event.viewerCount ?? event.repeatCount ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No events yet. Start the connection when the TikTok account is live.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
