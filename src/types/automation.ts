export type AutomationTriggerType = "GIFT" | "CHAT" | "LIKE" | "FOLLOW" | "SHARE" | "SUBSCRIBE";

export type AutomationNodeType =
  | "giftTrigger"
  | "commentTrigger"
  | "likeTrigger"
  | "followTrigger"
  | "condition"
  | "showAnimation"
  | "playSound"
  | "replyComment";

export type AutomationConditionOperator =
  | "equals"
  | "contains"
  | "greaterThan"
  | "lessThan"
  | "exists";

export type AutomationNodeData = Record<string, unknown> & {
  label?: string;
  description?: string;
  eventType?: AutomationTriggerType;
  field?: string;
  operator?: AutomationConditionOperator;
  value?: string;
  animationUrl?: string;
  durationMs?: number;
  useMediaDuration?: boolean;
  position?: string;
  size?: number;
  soundUrl?: string;
  volume?: number;
  message?: string;
};

export type AutomationFlowNode = {
  id: string;
  type: AutomationNodeType;
  position: {
    x: number;
    y: number;
  };
  data: AutomationNodeData;
};

export type AutomationFlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type AutomationFlowRecord = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  nodes: AutomationFlowNode[];
  edges: AutomationFlowEdge[];
  updatedAt: string;
};

export type AutomationExecutionRecord = {
  id: string;
  flowId: string;
  flowName: string;
  eventType: string;
  status: string;
  executedAt: string;
};

export type SaveAutomationFlowInput = {
  workspaceId: string;
  flowId?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  nodes: AutomationFlowNode[];
  edges: AutomationFlowEdge[];
};
