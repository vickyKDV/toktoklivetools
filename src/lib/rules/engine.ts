import type { LiveEvent, Rule } from "@prisma/client";
import type { RuleAction } from "@/types/live";

type EventField = keyof Pick<
  LiveEvent,
  | "username"
  | "displayName"
  | "giftName"
  | "giftCount"
  | "repeatCount"
  | "comment"
  | "likeCount"
  | "shareCount"
  | "viewerCount"
>;

export function evaluateRule(rule: Rule, event: LiveEvent) {
  if (!rule.enabled || rule.triggerType !== event.type) {
    return false;
  }

  if (!rule.conditionField || !rule.operator) {
    return true;
  }

  const field = rule.conditionField as EventField;
  const value = event[field];
  const expected = rule.conditionValue ?? "";

  switch (rule.operator) {
    case "EQUALS":
      return String(value ?? "").toLowerCase() === expected.toLowerCase();
    case "CONTAINS":
      return String(value ?? "").toLowerCase().includes(expected.toLowerCase());
    case "GREATER_THAN":
      return Number(value ?? 0) > Number(expected);
    case "LESS_THAN":
      return Number(value ?? 0) < Number(expected);
    case "EXISTS":
      return value !== null && value !== undefined && value !== "";
    default:
      return false;
  }
}

export function getRuleActions(rule: Rule): RuleAction[] {
  if (!Array.isArray(rule.actions)) {
    return [];
  }

  return rule.actions.filter(isRuleAction);
}

function isRuleAction(action: unknown): action is RuleAction {
  if (!action || typeof action !== "object") {
    return false;
  }

  const candidate = action as { type?: unknown };
  return (
    candidate.type === "SHOW_OVERLAY" ||
    candidate.type === "PLAY_SOUND" ||
    candidate.type === "WEBHOOK"
  );
}
