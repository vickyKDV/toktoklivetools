import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

type GiftOption = {
  value: string;
  label: string;
  source: "observed" | "default";
  giftId?: string | null;
};

const defaultGiftNames = [
  "Mawar",
  "Rose",
  "TikTok",
  "Finger Heart",
  "Love You",
  "GG",
  "Perfume",
  "Ice Cream Cone",
  "Panda",
  "Doughnut",
  "Cap",
  "Hand Hearts",
  "Little Crown",
  "Mic",
  "Heart",
  "Chili",
  "Ramen",
  "Game Controller",
  "Money Gun",
  "Galaxy",
  "Lion"
];

export async function GET(_request: Request, context: RouteContext) {
  const auth = await authorizeWorkspace(context);

  if (!auth.ok) {
    return auth.response;
  }

  const events = await prisma.liveEvent.findMany({
    where: {
      workspaceId: auth.workspaceId,
      type: "GIFT",
      giftName: {
        not: null
      }
    },
    select: {
      giftName: true,
      giftId: true
    },
    orderBy: {
      receivedAt: "desc"
    },
    take: 500
  });

  const options = new Map<string, GiftOption>();

  for (const event of events) {
    if (!event.giftName) {
      continue;
    }

    const key = normalizeGiftKey(event.giftName);

    if (!options.has(key)) {
      options.set(key, {
        value: event.giftName,
        label: event.giftId ? `${event.giftName} (${event.giftId})` : event.giftName,
        source: "observed",
        giftId: event.giftId
      });
    }
  }

  for (const giftName of defaultGiftNames) {
    const key = normalizeGiftKey(giftName);

    if (!options.has(key)) {
      options.set(key, {
        value: giftName,
        label: giftName,
        source: "default"
      });
    }
  }

  return NextResponse.json({
    gifts: [...options.values()]
  });
}

async function authorizeWorkspace(context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const { workspaceId } = await context.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid workspace" }, { status: 400 })
    };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId: user.id
        }
      }
    },
    select: {
      id: true
    }
  });

  if (!workspace) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    };
  }

  return {
    ok: true as const,
    workspaceId: workspace.id
  };
}

function normalizeGiftKey(value: string) {
  return value.trim().toLowerCase();
}
