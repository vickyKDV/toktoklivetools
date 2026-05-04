"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { workspaceSchema } from "@/lib/validation";

async function uniqueWorkspaceSlug(name: string, ignoreWorkspaceId?: string) {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let index = 1;

  while (
    await prisma.workspace.findFirst({
      where: {
        slug,
        NOT: ignoreWorkspaceId
          ? {
              id: ignoreWorkspaceId
            }
          : undefined
      },
      select: {
        id: true
      }
    })
  ) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    tiktokUsername: formData.get("tiktokUsername")
  });

  if (!parsed.success) {
    fail("/dashboard/workspaces/new", parsed.error.issues[0]?.message ?? "Invalid workspace");
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug: await uniqueWorkspaceSlug(parsed.data.name),
      tiktokUsername: parsed.data.tiktokUsername,
      overlayKey: randomUUID().replaceAll("-", ""),
      members: {
        create: {
          userId: user.id,
          role: "OWNER"
        }
      },
      connection: parsed.data.tiktokUsername
        ? {
            create: {
              tiktokUsername: parsed.data.tiktokUsername
            }
          }
        : undefined
    }
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/workspaces/${workspace.id}`);
}

export async function updateWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    tiktokUsername: formData.get("tiktokUsername")
  });

  if (!workspaceId) {
    fail("/dashboard/workspaces", "Workspace is missing");
  }

  if (!parsed.success) {
    fail(
      `/dashboard/workspaces/${workspaceId}/settings`,
      parsed.error.issues[0]?.message ?? "Invalid workspace"
    );
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspaceId
    },
    select: {
      id: true
    }
  });

  if (!membership) {
    fail("/dashboard/workspaces", "Workspace not found");
  }

  await prisma.workspace.update({
    where: {
      id: workspaceId
    },
    data: {
      name: parsed.data.name,
      slug: await uniqueWorkspaceSlug(parsed.data.name, workspaceId),
      tiktokUsername: parsed.data.tiktokUsername,
      connection: parsed.data.tiktokUsername
        ? {
            upsert: {
              create: {
                tiktokUsername: parsed.data.tiktokUsername
              },
              update: {
                tiktokUsername: parsed.data.tiktokUsername
              }
            }
          }
        : undefined
    }
  });

  if (!parsed.data.tiktokUsername) {
    await prisma.tikTokConnection.deleteMany({
      where: {
        workspaceId
      }
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  redirect(`/dashboard/workspaces/${workspaceId}/settings?updated=1`);
}

export async function deleteWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");

  if (!workspaceId) {
    fail("/dashboard/workspaces", "Workspace is missing");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspaceId,
      role: "OWNER"
    },
    select: {
      id: true
    }
  });

  if (!membership) {
    fail(`/dashboard/workspaces/${workspaceId}/settings`, "Only owners can delete a workspace");
  }

  await prisma.workspace.delete({
    where: {
      id: workspaceId
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard/workspaces");
}
