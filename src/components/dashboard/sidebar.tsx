import Link from "next/link";
import {
  Activity,
  Blocks,
  Cable,
  LayoutDashboard,
  ListTree,
  LogOut,
  MonitorUp,
  Palette,
  Settings,
  Sparkles,
  Workflow
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AuthUser } from "@/lib/auth";

type SidebarWorkspace = {
  id: string;
  name: string;
  tiktokUsername: string | null;
};

type DashboardSidebarProps = {
  user: AuthUser;
  workspaces: SidebarWorkspace[];
};

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    href: "/dashboard/workspaces",
    label: "Workspaces",
    icon: Blocks
  }
];

export function DashboardSidebar({ user, workspaces }: DashboardSidebarProps) {
  return (
    <aside className="border-b bg-card lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Live Automation</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Separator />

        <nav className="grid gap-1 p-3">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="justify-start">
              <Link href={item.href}>
                <item.icon />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active Projects
        </div>
        <div className="grid gap-1 px-3">
          {workspaces.slice(0, 6).map((workspace) => (
            <Button key={workspace.id} asChild variant="ghost" className="h-auto justify-start py-2">
              <Link href={`/dashboard/workspaces/${workspace.id}`}>
                <Activity />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{workspace.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {workspace.tiktokUsername ? `@${workspace.tiktokUsername}` : "No username"}
                  </span>
                </span>
              </Link>
            </Button>
          ))}
        </div>

        {workspaces[0] ? (
          <div className="mt-4 grid gap-1 px-3">
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/connection`}>
                <Cable />
                Live Connection
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/rules`}>
                <ListTree />
                Rules
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/automation-builder`}>
                <Workflow />
                Automation Builder
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/overlays`}>
                <MonitorUp />
                Overlays
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/overlay-design-builder`}>
                <Palette />
                Design Builder
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href={`/dashboard/workspaces/${workspaces[0].id}/settings`}>
                <Settings />
                Settings
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-auto p-3">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full justify-start">
              <LogOut />
              Logout
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
