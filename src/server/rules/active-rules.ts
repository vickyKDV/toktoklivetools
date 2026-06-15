import type { LiveEventType, Rule } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type RuleCacheEntry = {
  expiresAt: number;
  rules: Rule[];
};

type RuleCacheGlobal = typeof globalThis & {
  __liploActiveRuleCache?: Map<string, RuleCacheEntry>;
};

const activeRuleCacheTtlMs = 3_000;
const ruleCacheGlobal = globalThis as RuleCacheGlobal;
const activeRuleCache = ruleCacheGlobal.__liploActiveRuleCache ?? new Map<string, RuleCacheEntry>();
ruleCacheGlobal.__liploActiveRuleCache = activeRuleCache;

export async function getActiveRules(workspaceId: string, triggerType: LiveEventType) {
  const key = getRuleCacheKey(workspaceId, triggerType);
  const cached = activeRuleCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rules;
  }

  const rules = await prisma.rule.findMany({
    where: {
      workspaceId,
      triggerType,
      enabled: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  activeRuleCache.set(key, {
    expiresAt: Date.now() + activeRuleCacheTtlMs,
    rules
  });

  return rules;
}

export function invalidateActiveRuleCache(workspaceId?: string) {
  if (!workspaceId) {
    activeRuleCache.clear();
    return;
  }

  for (const key of activeRuleCache.keys()) {
    if (key.startsWith(`${workspaceId}:`)) {
      activeRuleCache.delete(key);
    }
  }
}

function getRuleCacheKey(workspaceId: string, triggerType: LiveEventType) {
  return `${workspaceId}:${triggerType}`;
}
