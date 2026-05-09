import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";

export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    include: {
      connection: true,
      _count: {
        select: {
          liveEvents: true,
          rules: true,
          overlays: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getWorkspaceForUser(userId: string, workspaceId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId
        }
      }
    },
    include: {
      connection: true,
      overlays: true,
      rules: {
        orderBy: {
          createdAt: "desc"
        }
      },
      _count: {
        select: {
          liveEvents: true,
          rules: true,
          overlays: true
        }
      }
    }
  });

  if (!workspace) {
    notFound();
  }

  return workspace;
}

export async function getWorkspaceEventsForUser(userId: string, workspaceId: string) {
  await getWorkspaceForUser(userId, workspaceId);

  return prisma.liveEvent.findMany({
    where: {
      workspaceId
    },
    orderBy: {
      receivedAt: "desc"
    },
    take: 100
  });
}
