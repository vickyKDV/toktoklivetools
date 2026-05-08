import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseAutomationEdges,
  parseAutomationNodes,
  sanitizeAutomationEdges,
  sanitizeAutomationNodes
} from "@/lib/automation/flow";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

const saveFlowSchema = z.object({
  flowId: z.string().min(1).nullish(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullish(),
  isActive: z.boolean(),
  nodes: z.unknown(),
  edges: z.unknown()
});

const toggleFlowSchema = z.object({
  flowId: z.string().min(1),
  isActive: z.boolean()
});

const automationActionNodeTypes = new Set([
  "showAnimation",
  "show3dText",
  "showConfetti",
  "playSound",
  "replyComment"
]);

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorizeWorkspace(context);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJson(request);
  const parsed = saveFlowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Flow tidak valid."
      },
      { status: 400 }
    );
  }

  const nodes = sanitizeAutomationNodes(parseAutomationNodes(parsed.data.nodes));
  const edges = sanitizeAutomationEdges(parseAutomationEdges(parsed.data.edges));

  if (!nodes.some((node) => node.type.endsWith("Trigger"))) {
    return NextResponse.json(
      {
        ok: false,
        message: "Flow harus punya minimal satu trigger node."
      },
      { status: 400 }
    );
  }

  if (!nodes.some((node) => automationActionNodeTypes.has(node.type))) {
    return NextResponse.json(
      {
        ok: false,
        message: "Flow harus punya minimal satu action node."
      },
      { status: 400 }
    );
  }

  const data = {
    workspaceId: auth.workspaceId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    isActive: parsed.data.isActive,
    nodes: nodes as unknown as Prisma.InputJsonValue,
    edges: edges as unknown as Prisma.InputJsonValue
  };

  if (parsed.data.flowId) {
    const result = await prisma.automationFlow.updateMany({
      where: {
        id: parsed.data.flowId,
        workspaceId: auth.workspaceId
      },
      data
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Flow tidak ditemukan di workspace ini."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      flowId: parsed.data.flowId,
      message: "Flow berhasil disimpan."
    });
  }

  const flow = await prisma.automationFlow.create({
    data
  });

  return NextResponse.json({
    ok: true,
    flowId: flow.id,
    message: "Flow berhasil disimpan."
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authorizeWorkspace(context);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await readJson(request);
  const parsed = toggleFlowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Request tidak valid."
      },
      { status: 400 }
    );
  }

  const result = await prisma.automationFlow.updateMany({
    where: {
      id: parsed.data.flowId,
      workspaceId: auth.workspaceId
    },
    data: {
      isActive: parsed.data.isActive
    }
  });

  if (result.count === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Flow tidak ditemukan di workspace ini."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: parsed.data.isActive ? "Flow diaktifkan." : "Flow dinonaktifkan."
  });
}

async function authorizeWorkspace(context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    };
  }

  const { workspaceId } = await context.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "Workspace tidak valid." }, { status: 400 })
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
      response: NextResponse.json({ ok: false, message: "Workspace tidak ditemukan." }, { status: 404 })
    };
  }

  return {
    ok: true as const,
    workspaceId: workspace.id
  };
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
