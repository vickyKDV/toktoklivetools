import "server-only";

import { LiveEventType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { OverlayRenderData } from "@/core/overlay/schema";

export type GoalOverlayMetrics = NonNullable<OverlayRenderData["goal"]>;

export async function getInitialGoalOverlayMetrics(workspaceId: string): Promise<GoalOverlayMetrics> {
  const connection = await prisma.tikTokConnection.findUnique({
    where: {
      workspaceId
    },
    select: {
      startedAt: true
    }
  });
  const receivedAtFilter = connection?.startedAt
    ? {
      receivedAt: {
        gte: connection.startedAt
      }
    }
    : {};
  const baseWhere = {
    workspaceId,
    ...receivedAtFilter
  };

  const [comments, gifts, likes, shares, latestViewerCount, joinedViewers] = await Promise.all([
    prisma.liveEvent.count({
      where: {
        ...baseWhere,
        type: LiveEventType.CHAT,
        comment: {
          not: null
        }
      }
    }),
    prisma.liveEvent.aggregate({
      where: {
        ...baseWhere,
        type: LiveEventType.GIFT
      },
      _count: {
        _all: true
      },
      _sum: {
        giftCount: true
      }
    }),
    prisma.liveEvent.aggregate({
      where: {
        ...baseWhere,
        type: LiveEventType.LIKE
      },
      _count: {
        _all: true
      },
      _sum: {
        likeCount: true
      }
    }),
    prisma.liveEvent.aggregate({
      where: {
        ...baseWhere,
        type: LiveEventType.SHARE
      },
      _count: {
        _all: true
      },
      _sum: {
        shareCount: true
      }
    }),
    prisma.liveEvent.findFirst({
      where: {
        ...baseWhere,
        type: LiveEventType.VIEWER_COUNT,
        viewerCount: {
          not: null
        }
      },
      orderBy: {
        receivedAt: "desc"
      },
      select: {
        viewerCount: true
      }
    }),
    prisma.liveEvent.count({
      where: {
        ...baseWhere,
        type: LiveEventType.MEMBER
      }
    })
  ]);

  return {
    likes: aggregateTotal(likes._sum.likeCount, likes._count._all),
    gifts: aggregateTotal(gifts._sum.giftCount, gifts._count._all),
    viewers: toNonNegativeNumber(latestViewerCount?.viewerCount, joinedViewers),
    comments,
    shares: aggregateTotal(shares._sum.shareCount, shares._count._all),
    custom: 0
  };
}

function aggregateTotal(sum: number | null | undefined, count: number) {
  const safeSum = toNonNegativeNumber(sum, 0);

  return safeSum > 0 ? safeSum : count;
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
}
