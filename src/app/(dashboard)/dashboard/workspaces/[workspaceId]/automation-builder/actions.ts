"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseAutomationEdges, parseAutomationNodes, sanitizeAutomationEdges, sanitizeAutomationNodes } from "@/lib/automation/flow";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceForUser } from "@/lib/workspaces";
import type { SaveAutomationFlowInput } from "@/types/automation";

const saveFlowSchema = z.object({
  workspaceId: z.string().min(1),
  flowId: z.string().min(1).nullish(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullish(),
  isActive: z.boolean(),
  nodes: z.unknown(),
  edges: z.unknown()
});

const automationActionNodeTypes = new Set([
  "showAnimation",
  "show3dText",
  "showConfetti",
  "playSound",
  "replyComment"
]);

export async function saveAutomationFlowAction(input: SaveAutomationFlowInput) {
  const user = await requireUser();
  const parsed = saveFlowSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Flow tidak valid"
    };
  }

  const workspace = await getWorkspaceForUser(user.id, parsed.data.workspaceId);
  const nodes = sanitizeAutomationNodes(parseAutomationNodes(parsed.data.nodes));
  const edges = sanitizeAutomationEdges(parseAutomationEdges(parsed.data.edges));

  if (!nodes.some((node) => node.type.endsWith("Trigger"))) {
    return {
      ok: false,
      message: "Flow harus punya minimal satu trigger node."
    };
  }

  if (!nodes.some((node) => automationActionNodeTypes.has(node.type))) {
    return {
      ok: false,
      message: "Flow harus punya minimal satu action node."
    };
  }

  const data = {
    workspaceId: workspace.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    isActive: parsed.data.isActive,
    nodes: nodes as unknown as Prisma.InputJsonValue,
    edges: edges as unknown as Prisma.InputJsonValue
  };

  const flow = parsed.data.flowId
    ? await prisma.automationFlow.update({
        where: {
          id: parsed.data.flowId,
          workspaceId: workspace.id
        },
        data
      })
    : await prisma.automationFlow.create({
        data
      });

  revalidatePath(`/dashboard/workspaces/${workspace.id}/automation-builder`);

  return {
    ok: true,
    flowId: flow.id,
    message: "Flow berhasil disimpan."
  };
}

export async function toggleAutomationFlowAction(
  workspaceId: string,
  flowId: string,
  isActive: boolean
) {
  const user = await requireUser();
  const workspace = await getWorkspaceForUser(user.id, workspaceId);

  await prisma.automationFlow.update({
    where: {
      id: flowId,
      workspaceId: workspace.id
    },
    data: {
      isActive
    }
  });

  revalidatePath(`/dashboard/workspaces/${workspace.id}/automation-builder`);

  return {
    ok: true,
    message: isActive ? "Flow diaktifkan." : "Flow dinonaktifkan."
  };
}
