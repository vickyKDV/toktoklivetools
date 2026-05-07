import { Palette } from "lucide-react";
import { AppThemeSelect } from "@/components/theme/app-theme-provider";
import type { AuthUser } from "@/lib/auth";

type DashboardHeaderProps = {
  user: AuthUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const initial = user.email.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center justify-end gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
          <Palette className="size-4 text-muted-foreground" />
          <AppThemeSelect />
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-3 py-1.5">
          <div className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initial}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-48 truncate text-xs font-semibold">{user.email}</p>
            <p className="text-[11px] text-muted-foreground">Logged in</p>
          </div>
        </div>
      </div>
    </header>
  );
}
