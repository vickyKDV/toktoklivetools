import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";

export const getSidebarWorkspaces = cache(async (userId: string) => {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      tiktokUsername: true,
      overlayKey: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 6
  });
});

export const getFirstUserWorkspace = cache(async (userId: string) => {
  return prisma.workspace.findFirst({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      tiktokUsername: true,
      overlayKey: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
});

export const getUserWorkspaceMetas = cache(async (userId: string) => {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      tiktokUsername: true,
      overlayKey: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
});

export const getUserWorkspaces = cache(async (userId: string) => {
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
});

export const getWorkspaceForUser = cache(async (userId: string, workspaceId: string) => {
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
});

export const getWorkspaceSummaryForUser = cache(async (userId: string, workspaceId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      overlayKey: true,
      tiktokUsername: true,
      updatedAt: true,
      connection: true,
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
});

export const getWorkspaceMetaForUser = cache(async (userId: string, workspaceId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      overlayKey: true,
      tiktokUsername: true,
      updatedAt: true,
      connection: true
    }
  });

  if (!workspace) {
    notFound();
  }

  return workspace;
});

export const getWorkspaceRulesForUser = cache(async (userId: string, workspaceId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      name: true,
      overlayKey: true,
      tiktokUsername: true,
      rules: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!workspace) {
    notFound();
  }

  return workspace;
});

export const assertWorkspaceAccess = cache(async (userId: string, workspaceId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true
    }
  });

  if (!workspace) {
    notFound();
  }

  return workspace;
});

export async function getWorkspaceEventsForUser(userId: string, workspaceId: string) {
  await assertWorkspaceAccess(userId, workspaceId);

  return listWorkspaceEvents(workspaceId);
}

export async function listWorkspaceEvents(workspaceId: string) {
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
