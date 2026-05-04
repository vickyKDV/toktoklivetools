import "server-only";

import { LiveEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LeaderboardEntry, LeaderboardMetric, LeaderboardPeriod } from "@/types/live";

export function getPeriodStart(period: LeaderboardPeriod) {
  const now = new Date();

  if (period === "realtime") {
    return null;
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const days = Number(period.replace("d", ""));
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getOverlayLeaderboard(
  overlayKey: string,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      overlayKey
    },
    select: {
      id: true
    }
  });

  if (!workspace) {
    return [];
  }

  const receivedAt = getPeriodStart(period);
  const baseWhere: Prisma.LiveEventWhereInput = {
    workspaceId: workspace.id,
    username: {
      not: null
    },
    ...(receivedAt
      ? {
          receivedAt: {
            gte: receivedAt
          }
        }
      : {})
  };

  if (metric === "gift") {
    const rows = await prisma.liveEvent.groupBy({
      by: ["username", "displayName"],
      where: {
        ...baseWhere,
        type: LiveEventType.GIFT
      },
      _sum: {
        giftCount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          giftCount: "desc"
        }
      },
      take: limit
    });

    return withLatestAvatars(
      workspace.id,
      rows.map((row) => ({
        username: row.username ?? "viewer",
        displayName: row.displayName,
        score: row._sum.giftCount ?? row._count.id,
        events: row._count.id
      }))
    );
  }

  if (metric === "like") {
    const rows = await prisma.liveEvent.groupBy({
      by: ["username", "displayName"],
      where: {
        ...baseWhere,
        type: LiveEventType.LIKE
      },
      _sum: {
        likeCount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          likeCount: "desc"
        }
      },
      take: limit
    });

    return withLatestAvatars(
      workspace.id,
      rows.map((row) => ({
        username: row.username ?? "viewer",
        displayName: row.displayName,
        score: row._sum.likeCount ?? row._count.id,
        events: row._count.id
      }))
    );
  }

  const rows = await prisma.liveEvent.groupBy({
    by: ["username", "displayName"],
    where: {
      ...baseWhere,
      type: LiveEventType.CHAT
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: "desc"
      }
    },
    take: limit
  });

  return withLatestAvatars(
    workspace.id,
    rows.map((row) => ({
      username: row.username ?? "viewer",
      displayName: row.displayName,
      score: row._count.id,
      events: row._count.id
    }))
  );
}

async function withLatestAvatars(workspaceId: string, entries: LeaderboardEntry[]) {
  if (!entries.length) {
    return entries;
  }

  const usernames = entries.map((entry) => entry.username);
  const events = await prisma.liveEvent.findMany({
    where: {
      workspaceId,
      username: {
        in: usernames
      },
      avatarUrl: {
        not: null
      }
    },
    select: {
      username: true,
      avatarUrl: true
    },
    orderBy: {
      receivedAt: "desc"
    }
  });
  const avatarByUsername = new Map<string, string>();

  for (const event of events) {
    if (event.username && event.avatarUrl && !avatarByUsername.has(event.username)) {
      avatarByUsername.set(event.username, event.avatarUrl);
    }
  }

  return entries.map((entry) => ({
    ...entry,
    avatarUrl: avatarByUsername.get(entry.username) ?? null
  }));
}
