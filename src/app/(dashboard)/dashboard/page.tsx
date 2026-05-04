import Link from "next/link";
import { ArrowRight, Blocks, Cable, ListTree, MonitorUp, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  const [workspaceCount, eventCount, ruleCount, firstWorkspace] = await Promise.all([
    prisma.workspace.count({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      }
    }),
    prisma.liveEvent.count({
      where: {
        workspace: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      }
    }),
    prisma.rule.count({
      where: {
        workspace: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      }
    }),
    prisma.workspace.findFirst({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        connection: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })
  ]);

  const quickLinks = firstWorkspace
    ? [
        {
          href: `/dashboard/workspaces/${firstWorkspace.id}/connection`,
          label: "Live Connection",
          icon: Cable
        },
        {
          href: `/dashboard/workspaces/${firstWorkspace.id}/rules`,
          label: "Rules",
          icon: ListTree
        },
        {
          href: `/dashboard/workspaces/${firstWorkspace.id}/overlays`,
          label: "Overlay",
          icon: MonitorUp
        }
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage workspaces, live connections, rules, overlays, and event logs.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workspaces/new">
            <Blocks />
            New Workspace
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Blocks className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{workspaceCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Stored</CardTitle>
            <Radio className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{eventCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rules</CardTitle>
            <ListTree className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{ruleCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Realtime Pipeline</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              TikTok event to database, rule engine, and overlay broadcast.
            </p>
          </div>
          <Badge variant={firstWorkspace?.connection?.status === "LIVE" ? "default" : "muted"}>
            {firstWorkspace?.connection?.status ?? "IDLE"}
          </Badge>
        </CardHeader>
        <CardContent>
          {firstWorkspace ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <Button key={link.href} asChild variant="outline" className="justify-between">
                  <Link href={link.href}>
                    <span className="flex items-center gap-2">
                      <link.icon />
                      {link.label}
                    </span>
                    <ArrowRight />
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Create a workspace before connecting a TikTok LIVE account.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
