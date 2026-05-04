import type { AutomationFlowEdge, AutomationFlowNode, AutomationNodeType } from "@/types/automation";

const automationNodeTypes = new Set<AutomationNodeType>([
  "giftTrigger",
  "commentTrigger",
  "likeTrigger",
  "followTrigger",
  "condition",
  "showAnimation",
  "playSound",
  "replyComment"
]);

export function parseAutomationNodes(value: unknown): AutomationFlowNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAutomationFlowNode);
}

export function parseAutomationEdges(value: unknown): AutomationFlowEdge[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAutomationFlowEdge);
}

export function sanitizeAutomationNodes(nodes: AutomationFlowNode[]) {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: {
      x: Number(node.position.x) || 0,
      y: Number(node.position.y) || 0
    },
    data: {
      ...node.data
    }
  }));
}

export function sanitizeAutomationEdges(edges: AutomationFlowEdge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target
  }));
}

function isAutomationFlowNode(value: unknown): value is AutomationFlowNode {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AutomationFlowNode>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    automationNodeTypes.has(candidate.type as AutomationNodeType) &&
    isPosition(candidate.position) &&
    Boolean(candidate.data) &&
    typeof candidate.data === "object"
  );
}

function isAutomationFlowEdge(value: unknown): value is AutomationFlowEdge {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AutomationFlowEdge>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.target === "string"
  );
}

function isPosition(value: unknown): value is AutomationFlowNode["position"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as AutomationFlowNode["position"];

  return typeof candidate.x === "number" && typeof candidate.y === "number";
}
