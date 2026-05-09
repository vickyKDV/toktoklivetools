import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AutomationBuilder } from "@/components/automation/automation-builder";
import { Button } from "@/components/ui/button";
import { parseAutomationEdges, parseAutomationNodes } from "@/core/automation/flow";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getWidgetBaseUrl } from "@/lib/utils";
import { getWorkspaceForUser } from "@/server/workspaces/service";
import type { AutomationExecutionRecord, AutomationFlowRecord } from "@/types/automation";

type AutomationBuilderPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function AutomationBuilderPage({ params }: AutomationBuilderPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const workspace = await getWorkspaceForUser(user.id, workspaceId);
  const widgetBaseUrl = getWidgetBaseUrl();

  const [flows, executions] = await Promise.all([
    prisma.automationFlow.findMany({
      where: {
        workspaceId: workspace.id
      },
      orderBy: {
        updatedAt: "desc"
      }
    }),
    prisma.automationExecution.findMany({
      where: {
        workspaceId: workspace.id
      },
      include: {
        flow: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 5
    })
  ]);

  const initialFlows: AutomationFlowRecord[] = flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    description: flow.description,
    isActive: flow.isActive,
    nodes: parseAutomationNodes(flow.nodes),
    edges: parseAutomationEdges(flow.edges),
    updatedAt: flow.updatedAt.toISOString()
  }));

  const initialExecutions: AutomationExecutionRecord[] = executions.map((execution) => ({
    id: execution.id,
    flowId: execution.flowId,
    flowName: execution.flow.name,
    eventType: execution.eventType,
    status: execution.status,
    executedAt: execution.executedAt.toISOString()
  }));

  return (
    <div className="mx-auto flex max-w-[96rem] flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/dashboard/workspaces/${workspace.id}`}>
          <ArrowLeft />
          Workspace
        </Link>
      </Button>

      <AutomationBuilder
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        overlayKey={workspace.overlayKey}
        widgetBaseUrl={widgetBaseUrl}
        initialFlows={initialFlows}
        initialExecutions={initialExecutions}
      />
    </div>
  );
}
