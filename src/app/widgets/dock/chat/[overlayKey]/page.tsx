import { LiveEventType } from "@prisma/client";
import { notFound } from "next/navigation";
import { ChatDockClient } from "@/components/overlay/chat-dock-client";
import { prisma } from "@/lib/prisma";
import type { ChatUserRole, OverlayEventPayload } from "@/types/live";

export const dynamic = "force-dynamic";

type ChatDockPageProps = {
  params: Promise<{
    overlayKey: string;
  }>;
};

export default async function ChatDockPage({ params }: ChatDockPageProps) {
  const { overlayKey } = await params;
  const workspace = await prisma.workspace.findFirst({
    where: {
      overlayKey
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!workspace) {
    notFound();
  }

  const events = await prisma.liveEvent.findMany({
    where: {
      workspaceId: workspace.id,
      type: LiveEventType.CHAT,
      comment: {
        not: null
      }
    },
    orderBy: {
      receivedAt: "desc"
    },
    take: 50,
    select: {
      id: true,
      type: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      comment: true,
      rawJson: true,
      receivedAt: true
    }
  });

  return (
    <ChatDockClient
      overlayKey={overlayKey}
      workspaceName={workspace.name}
      initialEvents={events.map((event) => ({
        id: event.id,
        type: event.type,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: event.avatarUrl,
        userRole: inferChatRole(event.rawJson),
        comment: event.comment,
        receivedAt: event.receivedAt.toISOString()
      } satisfies OverlayEventPayload))}
    />
  );
}

function inferChatRole(rawJson: unknown): ChatUserRole {
  const text = safeJsonText(rawJson);

  if (text.includes("moderator") || text.includes('"ismoderator":true') || text.includes('"ismod":true')) {
    return "moderator";
  }

  if (
    text.includes("subscriber") ||
    text.includes("superfan") ||
    text.includes("super fan") ||
    text.includes('"issubscriber":true')
  ) {
    return "subscriber";
  }

  if (text.includes("friend") || text.includes('"followrole":2')) {
    return "friend";
  }

  if (text.includes("follower") || text.includes('"followrole":1')) {
    return "follower";
  }

  return "viewer";
}

function safeJsonText(value: unknown) {
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
}
