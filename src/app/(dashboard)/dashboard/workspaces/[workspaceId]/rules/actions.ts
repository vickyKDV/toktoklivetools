"use server";

import { LiveEventType, RuleOperator } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getWorkspaceForUser } from "@/server/workspaces/service";

const ruleSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  triggerType: z.nativeEnum(LiveEventType),
  conditionField: z.string().trim().optional(),
  operator: z.nativeEnum(RuleOperator).optional(),
  conditionValue: z.string().trim().optional()
});

function fail(workspaceId: string, message: string): never {
  redirect(`/dashboard/workspaces/${workspaceId}/rules?error=${encodeURIComponent(message)}`);
}

export async function createRuleAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const parsed = ruleSchema.safeParse({
    workspaceId,
    name: formData.get("name"),
    triggerType: formData.get("triggerType"),
    conditionField: formData.get("conditionField") || undefined,
    operator: formData.get("operator") || undefined,
    conditionValue: formData.get("conditionValue") || undefined
  });

  if (!parsed.success) {
    fail(workspaceId, parsed.error.issues[0]?.message ?? "Invalid rule");
  }

  const workspace = await getWorkspaceForUser(user.id, parsed.data.workspaceId);

  await prisma.rule.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      conditionField: parsed.data.conditionField || null,
      operator: parsed.data.operator ?? null,
      conditionValue: parsed.data.conditionValue || null,
      actions: [
        {
          type: "SHOW_OVERLAY",
          overlayKey: workspace.overlayKey,
          durationMs: 5000
        }
      ]
    }
  });

  revalidatePath(`/dashboard/workspaces/${workspace.id}/rules`);
  redirect(`/dashboard/workspaces/${workspace.id}/rules?created=1`);
}

export async function toggleRuleAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") !== "true";

  await getWorkspaceForUser(user.id, workspaceId);

  await prisma.rule.update({
    where: {
      id: ruleId,
      workspaceId
    },
    data: {
      enabled
    }
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/rules`);
}

export async function deleteRuleAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");

  await getWorkspaceForUser(user.id, workspaceId);

  await prisma.rule.delete({
    where: {
      id: ruleId,
      workspaceId
    }
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/rules`);
}
