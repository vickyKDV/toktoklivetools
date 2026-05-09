import {
  LogOut,
  Sparkles
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { DashboardSidebarNav, type SidebarWorkspace } from "@/components/dashboard/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AuthUser } from "@/core/auth/types";

type DashboardSidebarProps = {
  user: AuthUser;
  workspaces: SidebarWorkspace[];
};

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

        <DashboardSidebarNav workspaces={workspaces} />

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
