"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  Blocks,
  Box,
  Cable,
  Gift,
  LayoutDashboard,
  ListTree,
  MessageSquareText,
  MonitorUp,
  PanelBottom,
  Palette,
  Settings,
  Trophy,
  Workflow
} from "lucide-react";
import type { ComponentType, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarWorkspace = {
  id: string;
  name: string;
  tiktokUsername: string | null;
  overlayKey: string;
};

type DashboardSidebarNavProps = {
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

const overlaySubItems = [
  {
    hrefSuffix: "CHAT",
    label: "Chat",
    icon: MessageSquareText
  },
  {
    hrefSuffix: "LEADERBOARD",
    label: "Leaderboard",
    icon: Trophy
  },
  {
    hrefSuffix: "GIFT",
    label: "Gift",
    icon: Gift
  },
  {
    hrefSuffix: "DOCK",
    label: "Dock",
    icon: PanelBottom
  },
  {
    hrefSuffix: "CUSTOM",
    label: "Custom",
    icon: Box
  }
];

export function DashboardSidebarNav({ workspaces }: DashboardSidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const currentUrl = `${pathname}${searchString ? `?${searchString}` : ""}`;
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activeWorkspaceId = getWorkspaceIdFromPathname(pathname);
  const workspace = useMemo(
    () => workspaces.find((item) => item.id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [activeWorkspaceId, workspaces]
  );

  useEffect(() => {
    setPendingHref(null);
  }, [currentUrl]);

  useEffect(() => {
    if (!pendingHref) {
      return;
    }

    const timeout = window.setTimeout(() => setPendingHref(null), 8000);

    return () => window.clearTimeout(timeout);
  }, [pendingHref]);

  function handleNavigate(href: string, event?: MouseEvent<HTMLAnchorElement>) {
    if (event && shouldIgnoreNavigationPending(event)) {
      return;
    }

    if (isSameUrl(currentUrl, href)) {
      setPendingHref(null);
      return;
    }

    setPendingHref(href);
  }

  return (
    <>
      {pendingHref ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/10">
          <div className="h-full w-1/2 animate-[route-progress_1.1s_ease-in-out_infinite] bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
        </div>
      ) : null}

      <nav className="grid gap-1 p-3">
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActiveRoute(currentUrl, item.href)}
            pending={pendingHref === item.href}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>

      <div className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Active Projects
      </div>
      <div className="grid gap-1 px-3">
        {workspaces.slice(0, 6).map((item) => {
          const href = `/dashboard/workspaces/${item.id}`;

          return (
            <Button
              key={item.id}
              asChild
              variant="ghost"
              className={getNavClassName(isActiveRoute(currentUrl, href), pendingHref === href, "h-auto justify-start py-2")}
            >
              <Link href={href} onClick={(event) => handleNavigate(href, event)}>
                <Activity className={cn((isActiveRoute(currentUrl, href) || pendingHref === href) && "text-primary")} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{item.name}</span>
                  <span className={cn(
                    "block truncate text-xs font-normal",
                    isActiveRoute(currentUrl, href) || pendingHref === href ? "text-foreground/75" : "text-muted-foreground"
                  )}>
                    {item.tiktokUsername ? `@${item.tiktokUsername}` : "No username"}
                  </span>
                </span>
              </Link>
            </Button>
          );
        })}
      </div>

      {workspace ? (
        <div className="mt-4 grid gap-1 px-3">
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/connection`}
            icon={Cable}
            label="Live Connection"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/connection`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/connection`}
            onNavigate={handleNavigate}
          />
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/rules`}
            icon={ListTree}
            label="Rules"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/rules`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/rules`}
            onNavigate={handleNavigate}
          />
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/automation-builder`}
            icon={Workflow}
            label="Automation Builder"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/automation-builder`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/automation-builder`}
            onNavigate={handleNavigate}
          />
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/overlays`}
            icon={MonitorUp}
            label="Overlays"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/overlays`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/overlays`}
            onNavigate={handleNavigate}
          />
          <div className="ml-6 grid gap-1 border-l pl-2">
            {overlaySubItems.map((item) => {
              const href = `/dashboard/workspaces/${workspace.id}/overlays?kind=${item.hrefSuffix}`;

              return (
                <SidebarLink
                  key={item.hrefSuffix}
                  href={href}
                  icon={item.icon}
                  label={item.label}
                  active={isActiveRoute(currentUrl, href)}
                  pending={pendingHref === href}
                  onNavigate={handleNavigate}
                  size="sm"
                />
              );
            })}
          </div>
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/overlay-design-builder`}
            icon={Palette}
            label="Design Builder"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/overlay-design-builder`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/overlay-design-builder`}
            onNavigate={handleNavigate}
          />
          <SidebarLink
            href={`/dashboard/workspaces/${workspace.id}/settings`}
            icon={Settings}
            label="Settings"
            active={isActiveRoute(currentUrl, `/dashboard/workspaces/${workspace.id}/settings`)}
            pending={pendingHref === `/dashboard/workspaces/${workspace.id}/settings`}
            onNavigate={handleNavigate}
          />
        </div>
      ) : null}
    </>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  pending,
  onNavigate,
  size = "default"
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  pending: boolean;
  onNavigate: (href: string, event?: MouseEvent<HTMLAnchorElement>) => void;
  size?: "default" | "sm";
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size={size === "sm" ? "sm" : "default"}
      className={getNavClassName(active, pending, size === "sm" ? "h-8 justify-start px-2 text-xs" : "justify-start")}
    >
      <Link href={href} onClick={(event) => onNavigate(href, event)}>
        <Icon className={cn(size === "sm" && "size-3.5", (active || pending) && "text-primary")} />
        {label}
        {pending ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
      </Link>
    </Button>
  );
}

function getNavClassName(active: boolean, pending: boolean, className?: string) {
  return cn(
    "relative justify-start transition-colors duration-150",
    "before:absolute before:left-0 before:top-1.5 before:h-[calc(100%-0.75rem)] before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity",
    active && "bg-primary/[0.12] font-semibold text-foreground before:opacity-100 hover:bg-primary/[0.16]",
    pending && "bg-primary/[0.18] text-foreground before:opacity-100",
    !active && !pending && "text-muted-foreground hover:bg-muted hover:text-foreground",
    className
  );
}

function shouldIgnoreNavigationPending(event: MouseEvent<HTMLAnchorElement>) {
  return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function isActiveRoute(currentUrl: string, href: string) {
  const current = parseRoute(currentUrl);
  const target = parseRoute(href);

  if (!current || !target) {
    return false;
  }

  if (!isPathMatch(current.pathname, target.pathname)) {
    return false;
  }

  for (const [key, value] of target.searchParams.entries()) {
    if (current.searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function isSameUrl(currentUrl: string, href: string) {
  const current = parseRoute(currentUrl);
  const target = parseRoute(href);

  if (!current || !target) {
    return false;
  }

  return current.pathname === target.pathname && current.searchParams.toString() === target.searchParams.toString();
}

function isPathMatch(pathname: string, hrefPathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedHref = normalizePathname(hrefPathname);

  if (normalizedHref === "/dashboard") {
    return normalizedPathname === "/dashboard";
  }

  return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
}

function parseRoute(value: string) {
  try {
    const url = new URL(value, "http://local");

    return {
      pathname: normalizePathname(url.pathname),
      searchParams: url.searchParams
    };
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function getWorkspaceIdFromPathname(pathname: string) {
  return pathname.match(/^\/dashboard\/workspaces\/([^/]+)/)?.[1] ?? null;
}
