import type { OverlayEventPayload } from "@/types/live";

type QueuedActionEvent = OverlayEventPayload & {
  queuedAt: number;
};

type ActionEventGlobal = typeof globalThis & {
  __tlaActionTestEvents?: Map<string, QueuedActionEvent[]>;
};

const actionEventGlobal = globalThis as ActionEventGlobal;
const maxEventsPerOverlay = 30;
const ttlMs = 2 * 60 * 1000;

function getStore() {
  if (!actionEventGlobal.__tlaActionTestEvents) {
    actionEventGlobal.__tlaActionTestEvents = new Map();
  }

  return actionEventGlobal.__tlaActionTestEvents;
}

export function enqueueActionTestEvent(overlayKey: string, event: OverlayEventPayload) {
  const now = Date.now();
  const store = getStore();
  const current = store.get(overlayKey) ?? [];
  const freshEvents = current.filter((item) => now - item.queuedAt < ttlMs);
  const queuedEvent: QueuedActionEvent = {
    ...event,
    id: event.id || `test-animation-${now}`,
    receivedAt: event.receivedAt || new Date(now).toISOString(),
    queuedAt: now
  };

  store.set(overlayKey, [...freshEvents, queuedEvent].slice(-maxEventsPerOverlay));

  return queuedEvent;
}

export function listActionTestEvents(overlayKey: string, since: number) {
  const now = Date.now();
  const store = getStore();
  const current = store.get(overlayKey) ?? [];
  const freshEvents = current.filter((item) => now - item.queuedAt < ttlMs);

  if (freshEvents.length !== current.length) {
    store.set(overlayKey, freshEvents);
  }

  return freshEvents.filter((item) => item.queuedAt > since);
}
