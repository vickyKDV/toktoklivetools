export type AutomationTriggerType = "GIFT" | "CHAT" | "LIKE" | "FOLLOW" | "SHARE" | "SUBSCRIBE";

export type AutomationNodeType =
  | "giftTrigger"
  | "commentTrigger"
  | "likeTrigger"
  | "followTrigger"
  | "condition"
  | "showAnimation"
  | "show3dText"
  | "showConfetti"
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
  mediaFit?: "auto" | "cover" | "fill";
  mediaFrame?: "square" | "portrait" | "landscape" | "obsDefault" | "fullscreen" | "custom";
  mediaWidth?: number;
  mediaHeight?: number;
  actionLayer?: "front" | "back";
  text3dTemplate?: string;
  text3dSubtitle?: string;
  text3dEffect?: "neon" | "gold" | "hologram" | "glitch" | "bubble" | "cyber" | "fire";
  text3dColor?: string;
  text3dAccentColor?: string;
  text3dDepth?: number;
  text3dBevel?: number;
  text3dMetalness?: number;
  text3dRoughness?: number;
  text3dSpin?: boolean;
  text3dFloat?: boolean;
  text3dOffsetX?: number;
  text3dOffsetY?: number;
  confettiEnabled?: boolean;
  confettiMode?: "once" | "repeat" | "repeatUntilOverlayEnd";
  confettiPresets?: string[];
  confettiLayer?: "front" | "back";
  confettiParticleCount?: number;
  confettiSpread?: number;
  confettiStartVelocity?: number;
  confettiScalar?: number;
  confettiIntervalMs?: number;
  confettiOriginY?: number;
  confettiDurationMs?: number;
  confettiEmoji?: string;
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
