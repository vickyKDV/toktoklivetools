"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { startTikTokConnection, stopTikTokConnection } from "@/server/tiktok/connection-manager";
import { getWorkspaceForUser } from "@/server/workspaces/service";

const connectionFormSchema = z.object({
  workspaceId: z.string().min(1),
  intent: z.enum(["save", "start"]).default("save"),
  tiktokUsername: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => value?.replace(/^@/, "") || null)
});

function path(workspaceId: string, message?: string, flag?: string) {
  const base = `/dashboard/workspaces/${workspaceId}/connection`;

  if (message) {
    return `${base}?error=${encodeURIComponent(message)}`;
  }

  return flag ? `${base}?${flag}=1` : base;
}

async function updateWorkspaceTikTokUsername({
  userId,
  workspaceId,
  tiktokUsername
}: {
  userId: string;
  workspaceId: string;
  tiktokUsername: string | null;
}) {
  const workspace = await getWorkspaceForUser(userId, workspaceId);

  if (workspace.connection?.status === "LIVE" && workspace.tiktokUsername !== tiktokUsername) {
    redirect(path(workspace.id, "Stop connection before changing TikTok username"));
  }

  await prisma.workspace.update({
    where: {
      id: workspace.id
    },
    data: {
      tiktokUsername,
      connection: tiktokUsername
        ? {
            upsert: {
              create: {
                tiktokUsername
              },
              update: {
                tiktokUsername,
                lastError: null
              }
            }
          }
        : undefined
    }
  });

  if (!tiktokUsername) {
    await prisma.tikTokConnection.deleteMany({
      where: {
        workspaceId: workspace.id
      }
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workspaces/${workspace.id}`);
  revalidatePath(path(workspace.id));

  return {
    workspaceId: workspace.id,
    tiktokUsername
  };
}

export async function connectionFormAction(formData: FormData) {
  const user = await requireUser();
  const parsed = connectionFormSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    intent: formData.get("intent"),
    tiktokUsername: formData.get("tiktokUsername")
  });

  if (!parsed.success) {
    redirect("/dashboard/workspaces");
  }

  const result = await updateWorkspaceTikTokUsername({
    userId: user.id,
    workspaceId: parsed.data.workspaceId,
    tiktokUsername: parsed.data.tiktokUsername
  });

  if (parsed.data.intent === "save") {
    redirect(path(result.workspaceId, undefined, "usernameUpdated"));
  }

  if (!result.tiktokUsername) {
    redirect(path(result.workspaceId, "TikTok username is required before connecting"));
  }

  const startResult = await startConnectionOrRedirect(result.workspaceId);

  revalidatePath(path(result.workspaceId));
  redirectToStartResult(result.workspaceId, startResult.status);
}

export async function startConnectionAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (!workspaceId) {
    redirect("/dashboard/workspaces");
  }

  const workspace = await getWorkspaceForUser(user.id, workspaceId);

  const startResult = await startConnectionOrRedirect(workspace.id);

  revalidatePath(path(workspace.id));
  redirectToStartResult(workspace.id, startResult.status);
}

async function startConnectionOrRedirect(workspaceId: string) {
  try {
    return await startTikTokConnection(workspaceId);
  } catch (error) {
    redirect(path(workspaceId, error instanceof Error ? error.message : "Unable to start connection"));
  }
}

function redirectToStartResult(workspaceId: string, status: Awaited<ReturnType<typeof startTikTokConnection>>["status"]) {
  if (status === "started") {
    redirect(path(workspaceId, undefined, "started"));
  }

  if (status === "already-running") {
    redirect(path(workspaceId, undefined, "alreadyRunning"));
  }

  redirect(path(workspaceId, undefined, "connecting"));
}

export async function stopConnectionAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (!workspaceId) {
    redirect("/dashboard/workspaces");
  }

  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  await stopTikTokConnection(workspace.id);

  revalidatePath(path(workspace.id));
  redirect(path(workspace.id, undefined, "stopped"));
}
