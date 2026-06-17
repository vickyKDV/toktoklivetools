"use client";

/* eslint-disable @next/next/no-img-element */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type AnimationEvent, type CSSProperties } from "react";
import type { Socket } from "socket.io-client";
import { createRealtimeSocket } from "@/lib/realtime/client";
import type { OverlayDesignSchema } from "@/core/overlay/schema";
import type { OverlayEventPayload } from "@/types/live";
import {
  type ChatRuntimeThemeId,
  resolveChatRuntimeThemeId
} from "@/features/overlay-runtime/chat/chatOverlayRuntimeThemes";
import styles from "@/features/overlay-runtime/chat/ChatOverlayRuntimeClient.module.css";

type ChatOverlayRuntimeClientProps = {
  schema: OverlayDesignSchema;
  overlayKey: string;
  preview?: boolean;
  debug?: boolean;
};

type RuntimeChatEventType = "CHAT" | "GIFT" | "LIKE" | "SHARE" | "JOIN" | "FOLLOW" | "ABSENT";
type RuntimeMessageEventType = Exclude<RuntimeChatEventType, "CHAT">;
type RuntimeEventMessages = Record<RuntimeMessageEventType, string>;
type RuntimeMessage =
  | { kind: "chat"; text: string }
  | { kind: "gift"; giftName: string; text: string }
  | { kind: "like"; text: string }
  | { kind: "follow"; text: string }
  | { kind: "join"; text: string }
  | { kind: "share"; text: string }
  | { kind: "absent"; text: string };
type RuntimeSideAction = {
  count: number;
  iconUrl?: string;
  kind: Exclude<RuntimeChatEventType, "CHAT">;
  label: string;
  updatedAt: number;
};

type RuntimeChatItem = {
  avatarUrl: string;
  badgeText: string;
  giftImageUrl: string;
  id: string;
  instanceId: string;
  message: RuntimeMessage;
  phase: ChatItemPhase;
  sideAction?: RuntimeSideAction;
  type: RuntimeChatEventType;
  username: string;
};

type ChatItemPhase = "entering-hidden" | "entering-visible" | "active" | "leaving";

let runtimeSequence = 0;
const REPOSITION_DURATION_MS = 240;
const NEW_ITEM_REVEAL_DELAY_MS = 110;
const EXIT_START_DELAY_MS = 160;
const ENTER_DURATION_MS = 330;
const EXIT_DURATION_MS = 260;
const GIFT_MERGE_WINDOW_MS = 5000;
const LIKE_MERGE_WINDOW_MS = 3500;
const EVENT_MERGE_WINDOW_MS = 5000;
const defaultRuntimeEventMessages: RuntimeEventMessages = {
  ABSENT: "Barusan Hadir.",
  FOLLOW: "Ngikutin anda.",
  GIFT: "Ngasih GIFT {{giftName}}.",
  JOIN: "Baru masuk.",
  LIKE: "Makasih Like nya",
  SHARE: "Ngebagiin live."
};

const themeClassById: Record<ChatRuntimeThemeId, string> = {
  "chat-dynamic-island": styles.themeDynamicIsland,
  "chat-special-roblox": styles.themeSpecialRoblox,
  "chat-gaming-mood": styles.themeGamingMood,
  "chat-minimalist-glass": styles.themeMinimalistGlass,
  "chat-minimalist-white": styles.themeMinimalistWhite,
  "chat-neumorphism-light": styles.themeNeumorphismLight,
  "chat-neumorphism-dark": styles.themeNeumorphismDark,
  "chat-square-minimalist": styles.themeSquareMinimalist,
  "chat-women-style": styles.themeWomenStyle,
  "chat-girl-pink": styles.themeGirlPink,
  "chat-color-pop": styles.themeColorPop,
  "chat-glitch-cartoon": styles.themeGlitchCartoon,
  "chat-rgb-glitch-bubble": styles.themeRgbGlitchBubble,
  "chat-paper-bubble": styles.themePaperBubble
};

const enterClassByAnimation: Record<string, string> = {
  fade: styles.enterFade,
  "slide-right": styles.enterSlideRight,
  "slide-up": styles.enterSlideUp,
  scale: styles.enterScale,
  pop: styles.enterPop
};

const exitClassByAnimation: Record<string, string> = {
  fade: styles.exitFade,
  "slide-left": styles.exitSlideLeft,
  "slide-down": styles.exitSlideDown,
  scale: styles.exitScale,
  pop: styles.exitPop
};

export function ChatOverlayRuntimeClient({
  schema,
  overlayKey,
  preview = false,
  debug = false
}: ChatOverlayRuntimeClientProps) {
  const themeId = useMemo(() => resolveChatRuntimeThemeId(schema), [schema]);
  const enabledEvents = useMemo(() => getEnabledChatEvents(schema), [schema]);
  const eventMessages = useMemo(() => getRuntimeEventMessages(schema), [schema]);
  const maxItems = Math.min(10, Math.max(1, Math.round(schema.layout.maxItems || 5)));
  const durationMs = Math.min(5000, Math.max(120, Math.round(schema.layout.animationDurationMs || 320)));
  const autoCloseMs = Math.max(0, Math.round(schema.layout.autoCloseMs || 0));
  const enterClassName = enterClassByAnimation[schema.layout.enterAnimation] ?? styles.enterFade;
  const exitClassName = exitClassByAnimation[schema.layout.exitAnimation] ?? styles.exitFade;
  const enterDurationMs = ENTER_DURATION_MS;
  const exitDurationMs = EXIT_DURATION_MS;
  const flipNodesRef = useRef(new Map<string, HTMLDivElement>());
  const motionRafsRef = useRef<number[]>([]);
  const motionTimersRef = useRef<number[]>([]);
  const previousRectsRef = useRef(new Map<string, DOMRect>());
  const itemsRef = useRef<RuntimeChatItem[]>([]);
  const leavingRemovalRef = useRef(new Set<string>());
  const timersRef = useRef<number[]>([]);
  const [items, setItems] = useState<RuntimeChatItem[]>(() => preview ? createSampleItems(maxItems, themeId) : []);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(motionQuery.matches);

    handleChange();
    motionQuery.addEventListener("change", handleChange);

    return () => {
      motionQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useLayoutEffect(() => {
    animateRuntimeFlipMovement({
      nodes: flipNodesRef.current,
      previousRects: previousRectsRef.current,
      reducedMotion,
      registerRaf: (rafId) => motionRafsRef.current.push(rafId),
      registerTimer: (timerId) => motionTimersRef.current.push(timerId)
    });
    previousRectsRef.current = new Map();
  }, [items, reducedMotion]);

  const captureRects = useCallback(() => {
    const rects = new Map<string, DOMRect>();

    flipNodesRef.current.forEach((node, itemId) => {
      rects.set(itemId, node.getBoundingClientRect());
    });
    previousRectsRef.current = rects;
  }, []);

  const scheduleTimer = useCallback((callback: () => void, delayMs: number) => {
    const timerId = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((id) => id !== timerId);
      callback();
    }, delayMs);

    timersRef.current.push(timerId);
  }, []);

  const removeItem = useCallback((instanceId: string) => {
    captureRects();
    setItems((current) => current.filter((item) => item.instanceId !== instanceId));
  }, [captureRects]);

  const markItemLeaving = useCallback((instanceId: string) => {
    captureRects();
    setItems((current) => current.map((item) => (
      item.instanceId === instanceId ? { ...item, phase: "leaving" } : item
    )));
  }, [captureRects]);

  const revealItem = useCallback((instanceId: string) => {
    captureRects();
    setItems((current) => current.map((item) => (
      item.instanceId === instanceId && item.phase === "entering-hidden" ? { ...item, phase: "entering-visible" } : item
    )));
  }, [captureRects]);

  const activateItem = useCallback((instanceId: string) => {
    captureRects();
    setItems((current) => current.map((item) => (
      item.instanceId === instanceId && item.phase === "entering-visible" ? { ...item, phase: "active" } : item
    )));
  }, [captureRects]);

  const appendItem = useCallback((incoming: RuntimeChatItem) => {
    captureRects();
    const currentActiveItems = itemsRef.current.filter((item) => item.phase !== "leaving");
    const currentOldestItem = currentActiveItems[currentActiveItems.length - 1];
    const willMergeExistingItem = currentActiveItems.some((item) => canMergeRuntimeItem(item, incoming));
    const overflowExitItemId = !willMergeExistingItem && currentActiveItems.length >= maxItems
      ? currentOldestItem?.instanceId ?? null
      : null;

    setItems((current) => {
      const activeItems = current.filter((item) => item.phase !== "leaving");
      const leavingItems = current.filter((item) => item.phase === "leaving");
      const merged = mergeGiftItem(activeItems, incoming);
      const oldestItem = activeItems[activeItems.length - 1];

      if (merged) {
        return [...merged, ...leavingItems].slice(0, maxItems + 1);
      }

      if (activeItems.length >= maxItems && oldestItem) {
        return [incoming, ...activeItems, ...leavingItems].slice(0, maxItems + 1);
      }

      return [incoming, ...activeItems, ...leavingItems].slice(0, maxItems + 1);
    });

    if (overflowExitItemId) {
      scheduleTimer(() => markItemLeaving(overflowExitItemId), EXIT_START_DELAY_MS);
    }

    scheduleTimer(() => revealItem(incoming.instanceId), NEW_ITEM_REVEAL_DELAY_MS);
    scheduleTimer(() => activateItem(incoming.instanceId), NEW_ITEM_REVEAL_DELAY_MS + enterDurationMs + 40);

    if (autoCloseMs > 0) {
      scheduleTimer(() => markItemLeaving(incoming.instanceId), NEW_ITEM_REVEAL_DELAY_MS + enterDurationMs + autoCloseMs);
    }
  }, [activateItem, autoCloseMs, captureRects, enterDurationMs, markItemLeaving, maxItems, revealItem, scheduleTimer]);

  useEffect(() => {
    for (const item of items) {
      if (item.phase !== "leaving" || leavingRemovalRef.current.has(item.instanceId)) {
        continue;
      }

      leavingRemovalRef.current.add(item.instanceId);
      scheduleTimer(() => {
        leavingRemovalRef.current.delete(item.instanceId);
        removeItem(item.instanceId);
      }, exitDurationMs + 40);
    }
  }, [exitDurationMs, items, removeItem, scheduleTimer]);

  useEffect(() => {
    if (!preview) {
      return;
    }

    setItems(createSampleItems(maxItems, themeId));
  }, [maxItems, preview, themeId]);

  useEffect(() => () => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    for (const timerId of motionTimersRef.current) {
      window.clearTimeout(timerId);
    }
    for (const rafId of motionRafsRef.current) {
      window.cancelAnimationFrame(rafId);
    }

    timersRef.current = [];
    leavingRemovalRef.current.clear();
    motionRafsRef.current = [];
    motionTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (preview) {
      return;
    }

    const socket: Socket = createRealtimeSocket();
    const joinOverlayRoom = () => socket.emit("overlay:join", overlayKey);
    const handleLiveEvent = (event: OverlayEventPayload) => {
      if (!eventMatchesChatOverlay(event, enabledEvents)) {
        return;
      }

      const item = eventToRuntimeItem(event, eventMessages);

      if (debug) {
        console.log("[chat-overlay-runtime] event", item);
      }

      appendItem(item);
    };

    joinOverlayRoom();
    socket.on("connect", joinOverlayRoom);
    socket.on("overlay:live-event", handleLiveEvent);

    return () => {
      socket.off("connect", joinOverlayRoom);
      socket.off("overlay:live-event", handleLiveEvent);
      socket.disconnect();
    };
  }, [appendItem, debug, enabledEvents, eventMessages, overlayKey, preview]);

  return (
    <div
      className={`${styles.root} ${themeClassById[themeId]}`}
      data-chat-overlay-theme={themeId}
      style={{
        "--duration": `${durationMs}ms`,
        "--enter-duration": `${enterDurationMs}ms`,
        "--exit-duration": `${exitDurationMs}ms`
      } as CSSProperties}
    >
      <div className={styles.stage}>
        <ol className={styles.list} aria-live="polite" aria-atomic="false">
          {items.map((item, index) => (
            <ChatRuntimeBubble
              key={item.instanceId}
              animationClassName={item.phase === "leaving" ? exitClassName : item.phase === "entering-visible" ? enterClassName : item.phase === "entering-hidden" ? styles.enterHidden : ""}
              index={index}
              item={item}
              maxItems={maxItems}
              onExitComplete={removeItem}
              reducedMotion={reducedMotion}
              registerFlipNode={(node) => {
                if (node) {
                  flipNodesRef.current.set(item.instanceId, node);
                } else {
                  flipNodesRef.current.delete(item.instanceId);
                }
              }}
              themeId={themeId}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

const ChatRuntimeBubble = memo(function ChatRuntimeBubble({
  animationClassName,
  index,
  item,
  maxItems,
  onExitComplete,
  reducedMotion,
  registerFlipNode,
  themeId
}: {
  animationClassName: string;
  index: number;
  item: RuntimeChatItem;
  maxItems: number;
  onExitComplete: (instanceId: string) => void;
  reducedMotion: boolean;
  registerFlipNode: (node: HTMLDivElement | null) => void;
  themeId: ChatRuntimeThemeId;
}) {
  const opacity = Math.max(0.72, 1 - index * 0.035);
  const scale = 1;
  const baseY = "0px";
  const baseX = "0px";
  const density = getRuntimeBubbleDensity(maxItems);
  const initial = item.username.trim().replace(/^@+/, "").charAt(0) || "V";
  const colorStyle = themeId === "chat-color-pop" ? getColorPopRuntimeStyle(item.instanceId) : null;
  const paperStyle = themeId === "chat-paper-bubble" ? getPaperRuntimeStyle(item.instanceId, item.badgeText) : null;
  const bubbleAnimationClassName = reducedMotion && item.phase !== "active"
    ? item.phase === "leaving" ? styles.exitReduced : item.phase === "entering-visible" ? styles.enterReduced : styles.enterHidden
    : animationClassName;
  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.currentTarget !== event.target || item.phase !== "leaving") {
      return;
    }

    onExitComplete(item.instanceId);
  };

  return (
    <li
      className={styles.item}
      style={{
        "--base-x": baseX,
        "--base-y": baseY,
        "--avatar-size": `${density.avatar}px`,
        "--avatar-fallback-size": `${density.avatarFont}px`,
        "--badge-font-size": `${density.badgeFont}px`,
        "--badge-min-height": `${density.badgeMinHeight}px`,
        "--badge-padding-x": `${density.badgePaddingX}px`,
        "--badge-padding-y": `${density.badgePaddingY}px`,
        "--bubble-gap": `${density.contentGap}px`,
        "--bubble-min-height": `${density.height}px`,
        "--bubble-padding-x": `${density.paddingX}px`,
        "--bubble-padding-y": `${density.paddingY}px`,
        "--item-opacity": opacity,
        "--item-scale": scale,
        "--item-scale-in": Math.max(0.76, scale * 0.86),
        "--item-scale-out": Math.max(0.74, scale * 0.9),
        "--message-font-size": `${density.messageFont}px`,
        "--item-delay": `${Math.min(120, index * 35)}ms`,
        "--username-font-size": `${density.usernameFont}px`,
        ...colorStyle,
        ...paperStyle,
        zIndex: 100 - index
      } as CSSProperties}
    >
      <div ref={registerFlipNode} className={styles.flip}>
        <div className={`${styles.bubbleRow} ${bubbleAnimationClassName}`} onAnimationEnd={handleAnimationEnd}>
          <article className={styles.bubble}>
            {themeId === "chat-gaming-mood" ? (
              <>
                <span aria-hidden="true" className={styles.gamingFrameTop} />
                <span aria-hidden="true" className={styles.gamingFrameBottom} />
              </>
            ) : null}
            {themeId === "chat-glitch-cartoon" ? (
              <>
                <span aria-hidden="true" className={styles.glitchShardOne} />
                <span aria-hidden="true" className={styles.glitchShardTwo} />
                <span aria-hidden="true" className={styles.glitchShardThree} />
              </>
            ) : null}
            {themeId === "chat-special-roblox" ? (
              <>
                <span aria-hidden="true" className={styles.pixelFrameFront} />
                <span aria-hidden="true" className={styles.pixelFrameBack} />
              </>
            ) : null}
            <div className={styles.avatar}>
              {item.avatarUrl ? (
                <img alt="" className={styles.avatarImage} draggable={false} src={item.avatarUrl} />
              ) : (
                <span className={styles.avatarFallback}>{initial}</span>
              )}
            </div>
            <div className={styles.content}>
              <div className={styles.topline}>
                <span className={styles.badge}>{item.badgeText}</span>
                <span className={styles.username}>{item.username}</span>
              </div>
              <RuntimeMessageRenderer message={item.message} />
            </div>
            <span aria-hidden="true" className={styles.statusDot} />
          </article>
          {item.sideAction ? <RuntimeSideActionRenderer sideAction={item.sideAction} /> : null}
        </div>
      </div>
    </li>
  );
});

function RuntimeMessageRenderer({ message }: { message: RuntimeMessage }) {
  return <span className={styles.message}>{message.text}</span>;
}

function RuntimeSideActionRenderer({ sideAction }: { sideAction: RuntimeSideAction }) {
  return (
    <span className={styles.sideAction} data-side-action-kind={sideAction.kind.toLowerCase()}>
      <span className={styles.sideActionIcon}>
        {sideAction.iconUrl ? (
          <img alt={sideAction.label} className={styles.sideActionImage} draggable={false} src={sideAction.iconUrl} />
        ) : (
          <EventSideActionIcon kind={sideAction.kind} />
        )}
      </span>
      <span className={styles.sideActionCount}>x{sideAction.count}</span>
    </span>
  );
}

function EventSideActionIcon({ kind }: { kind: RuntimeSideAction["kind"] }) {
  if (kind === "LIKE") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 21s-7.2-4.35-9.45-8.7C.75 8.85 2.7 5 6.45 5c2.05 0 3.35 1.05 4.1 2.05C11.3 6.05 12.6 5 14.65 5c3.75 0 5.7 3.85 3.9 7.3C16.3 16.65 12 21 12 21Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "FOLLOW") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 1.7-6 3.8V19h9.8a6.9 6.9 0 0 1-.3-2A6.8 6.8 0 0 1 14 12.8 11 11 0 0 0 9 13Zm9 1v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "JOIN") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M11 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8v-2h8V5h-8V3Zm1.6 5.4L16.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H3v-2h9.4l-1.2-1.2 1.4-1.4Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "SHARE") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M18 16.1c-1.05 0-1.98.52-2.55 1.32L8.9 13.6a3.2 3.2 0 0 0 0-3.2l6.48-3.78A3.12 3.12 0 1 0 14.6 5L8.1 8.78a3.1 3.1 0 1 0 0 6.44l6.5 3.8A3.1 3.1 0 1 0 18 16.1Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "ABSENT") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-2.35-5.65L11 13l-2.65-2.65-1.4 1.4L11 15.8l8.05-8.05A9.96 9.96 0 0 0 12 2Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 12v8H4v-8h16Zm-9-8c1.3 0 2.12.8 2.35 1.82C13.8 5.3 14.55 5 15.5 5A2.5 2.5 0 0 1 18 7.5c0 1.2-.75 2.1-1.82 2.5H20v2H4v-2h3.82A2.65 2.65 0 0 1 6 7.5 2.5 2.5 0 0 1 8.5 5c.95 0 1.7.3 2.15.82C10.88 4.8 11.7 4 13 4h-2Z" fill="currentColor" />
    </svg>
  );
}

function getRuntimeBubbleDensity(maxItems: number) {
  if (maxItems >= 10) {
    return {
      avatar: 24,
      avatarFont: 10,
      badgeFont: 8,
      badgeMinHeight: 16,
      badgePaddingX: 6,
      badgePaddingY: 2,
      contentGap: 6,
      height: 36,
      messageFont: 10,
      paddingX: 10,
      paddingY: 5,
      usernameFont: 10
    };
  }

  if (maxItems >= 8) {
    return {
      avatar: 26,
      avatarFont: 10,
      badgeFont: 8,
      badgeMinHeight: 16,
      badgePaddingX: 6,
      badgePaddingY: 3,
      contentGap: 7,
      height: 40,
      messageFont: 10,
      paddingX: 11,
      paddingY: 5,
      usernameFont: 11
    };
  }

  if (maxItems >= 6) {
    return {
      avatar: 28,
      avatarFont: 11,
      badgeFont: 9,
      badgeMinHeight: 17,
      badgePaddingX: 6,
      badgePaddingY: 3,
      contentGap: 7,
      height: 42,
      messageFont: 11,
      paddingX: 11,
      paddingY: 6,
      usernameFont: 11
    };
  }

  return {
    avatar: 30,
    avatarFont: 12,
    badgeFont: 9,
    badgeMinHeight: 18,
    badgePaddingX: 7,
    badgePaddingY: 3,
    contentGap: 8,
    height: 46,
    messageFont: 11,
    paddingX: 12,
    paddingY: 6,
    usernameFont: 12
  };
}

function getColorPopRuntimeStyle(seed: string): CSSProperties {
  const palette = colorPopPalette[hashString(seed) % colorPopPalette.length] ?? colorPopPalette[0];

  return {
    "--bubble-bg": palette.background,
    "--bubble-border": palette.border,
    "--bubble-shadow": `0 18px 34px ${palette.shadow}`,
    "--bubble-text": palette.text,
    "--username": palette.text,
    "--badge-bg": palette.badgeBg,
    "--badge-text": palette.badgeText,
    "--avatar-bg": palette.avatarBg,
    "--avatar-border": palette.avatarBorder,
    "--status-bg": palette.status
  } as CSSProperties;
}

function getPaperRuntimeStyle(seed: string, badgeText: string): CSSProperties {
  const variant = paperRuntimeVariants[hashString(seed) % paperRuntimeVariants.length] ?? paperRuntimeVariants[0];

  return {
    "--badge-bg": getPaperBadgeBackground(badgeText),
    "--paper-rotate": variant.rotate,
    "--paper-s1x": variant.s1x,
    "--paper-s1y": variant.s1y,
    "--paper-s2x": variant.s2x,
    "--paper-s2y": variant.s2y,
    "--paper-s3x": variant.s3x,
    "--paper-s3y": variant.s3y,
    "--paper-fold1": variant.fold1,
    "--paper-fold2": variant.fold2,
    "--paper-fiber": variant.fiber,
    "--paper-w1x": variant.w1x,
    "--paper-w1y": variant.w1y,
    "--paper-w2x": variant.w2x,
    "--paper-w2y": variant.w2y,
    "--paper-wrinkle1": variant.wrinkle1,
    "--paper-wrinkle2": variant.wrinkle2
  } as CSSProperties;
}

function getPaperBadgeBackground(badgeText: string) {
  const normalized = badgeText.trim().toUpperCase();

  if (normalized === "NEW") return "#28b94f";
  if (normalized === "VIP") return "#1966df";
  if (normalized === "MOD") return "#d65a13";
  return "#8e3df5";
}

const paperRuntimeVariants = [
  {
    fiber: "8deg",
    fold1: "96deg",
    fold2: "174deg",
    rotate: "-0.7deg",
    s1x: "14%",
    s1y: "22%",
    s2x: "83%",
    s2y: "76%",
    s3x: "50%",
    s3y: "35%",
    w1x: "30%",
    w1y: "20%",
    w2x: "88%",
    w2y: "80%",
    wrinkle1: "72deg",
    wrinkle2: "158deg"
  },
  {
    fiber: "-10deg",
    fold1: "128deg",
    fold2: "38deg",
    rotate: "0.5deg",
    s1x: "76%",
    s1y: "26%",
    s2x: "22%",
    s2y: "88%",
    s3x: "64%",
    s3y: "60%",
    w1x: "58%",
    w1y: "18%",
    w2x: "18%",
    w2y: "75%",
    wrinkle1: "120deg",
    wrinkle2: "22deg"
  },
  {
    fiber: "16deg",
    fold1: "54deg",
    fold2: "165deg",
    rotate: "-0.25deg",
    s1x: "42%",
    s1y: "68%",
    s2x: "88%",
    s2y: "30%",
    s3x: "24%",
    s3y: "22%",
    w1x: "80%",
    w1y: "30%",
    w2x: "32%",
    w2y: "86%",
    wrinkle1: "62deg",
    wrinkle2: "148deg"
  }
] as const;

const colorPopPalette = [
  {
    avatarBg: "linear-gradient(135deg,#0284c7,#22d3ee)",
    avatarBorder: "#bae6fd",
    background: "#f8fafc",
    badgeBg: "#0f172a",
    badgeText: "#ffffff",
    border: "#e2e8f0",
    shadow: "rgba(148,163,184,.28)",
    status: "#38bdf8",
    text: "#111827"
  },
  {
    avatarBg: "linear-gradient(135deg,#7c2d12,#fb923c)",
    avatarBorder: "#fed7aa",
    background: "#ffedd5",
    badgeBg: "#9a3412",
    badgeText: "#ffffff",
    border: "#fdba74",
    shadow: "rgba(251,146,60,.24)",
    status: "#f97316",
    text: "#431407"
  },
  {
    avatarBg: "linear-gradient(135deg,#064e3b,#34d399)",
    avatarBorder: "#a7f3d0",
    background: "#064e3b",
    badgeBg: "#bbf7d0",
    badgeText: "#064e3b",
    border: "#10b981",
    shadow: "rgba(16,185,129,.24)",
    status: "#a7f3d0",
    text: "#ecfdf5"
  },
  {
    avatarBg: "linear-gradient(135deg,#831843,#f472b6)",
    avatarBorder: "#fbcfe8",
    background: "#fce7f3",
    badgeBg: "#be185d",
    badgeText: "#ffffff",
    border: "#f9a8d4",
    shadow: "rgba(244,114,182,.24)",
    status: "#ec4899",
    text: "#831843"
  },
  {
    avatarBg: "linear-gradient(135deg,#312e81,#818cf8)",
    avatarBorder: "#c7d2fe",
    background: "#312e81",
    badgeBg: "#e0e7ff",
    badgeText: "#312e81",
    border: "#818cf8",
    shadow: "rgba(129,140,248,.24)",
    status: "#a5b4fc",
    text: "#eef2ff"
  },
  {
    avatarBg: "linear-gradient(135deg,#713f12,#facc15)",
    avatarBorder: "#fde68a",
    background: "#fef9c3",
    badgeBg: "#854d0e",
    badgeText: "#ffffff",
    border: "#fde047",
    shadow: "rgba(250,204,21,.22)",
    status: "#eab308",
    text: "#422006"
  }
] as const;

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function getEnabledChatEvents(schema: OverlayDesignSchema): RuntimeChatEventType[] {
  const filters = schema.dataSource.filters ?? {};
  const eventTypes = filters.eventTypes;

  if (Array.isArray(eventTypes)) {
    const normalized = eventTypes
      .map((eventType) => typeof eventType === "string" ? normalizeEventTypeName(eventType) : null)
      .filter((eventType): eventType is RuntimeChatEventType => Boolean(eventType));

    return normalized.length ? normalized : ["CHAT"];
  }

  const enabled: RuntimeChatEventType[] = [];

  if (filters.chat !== false) enabled.push("CHAT");
  if (filters.gift === true) enabled.push("GIFT");
  if (filters.like === true) enabled.push("LIKE");
  if (filters.share === true) enabled.push("SHARE");
  if (filters.join === true) enabled.push("JOIN");
  if (filters.follow === true) enabled.push("FOLLOW");
  if (filters.absent === true) enabled.push("ABSENT");

  return enabled.length ? enabled : ["CHAT"];
}

function getRuntimeEventMessages(schema: OverlayDesignSchema): RuntimeEventMessages {
  const eventMessages = schema.dataSource.filters?.eventMessages;

  if (!eventMessages || typeof eventMessages !== "object" || Array.isArray(eventMessages)) {
    return defaultRuntimeEventMessages;
  }

  return (Object.keys(defaultRuntimeEventMessages) as RuntimeMessageEventType[]).reduce<RuntimeEventMessages>((messages, eventType) => {
    const value = (eventMessages as Record<string, unknown>)[eventType];

    return {
      ...messages,
      [eventType]: typeof value === "string" && value.trim() ? value : defaultRuntimeEventMessages[eventType]
    };
  }, { ...defaultRuntimeEventMessages });
}

function eventMatchesChatOverlay(event: OverlayEventPayload, enabledEvents: RuntimeChatEventType[]) {
  const type = normalizeEventTypeName(event.type);

  if (!type || !enabledEvents.includes(type)) {
    return false;
  }

  if (type === "CHAT") {
    return Boolean(event.comment);
  }

  if (type === "GIFT") {
    return Boolean(event.giftName || event.giftImageUrl);
  }

  return Boolean(event.displayName || event.username);
}

function eventToRuntimeItem(event: OverlayEventPayload, eventMessages: RuntimeEventMessages): RuntimeChatItem {
  const type = normalizeEventTypeName(event.type) ?? "CHAT";
  const username = formatUsername(event.username || event.displayName || "viewer");

  return {
    avatarUrl: event.avatarUrl ?? "",
    badgeText: eventBadge(type, event.userRole),
    giftImageUrl: type === "GIFT" ? event.giftImageUrl ?? "" : "",
    id: event.id,
    instanceId: `${event.id || "chat"}-${Date.now()}-${runtimeSequence += 1}`,
    message: eventToRuntimeMessage(event, type, eventMessages),
    phase: "entering-hidden",
    sideAction: eventToSideAction(event, type),
    type,
    username
  };
}

function createSampleItems(maxItems: number, themeId: ChatRuntimeThemeId): RuntimeChatItem[] {
  const sampleMessages = [
    themeId === "chat-special-roblox"
      ? "HELLO STREAM, PIXEL MODE ON! 🔥"
      : themeId === "chat-gaming-mood"
        ? "Jangan lupa follow ya guys, push rank malam ini sampai target tembus! 🔥"
        : "Ini cinematic overlay preview ✨🔥",
    "Overlay baru ini smooth banget",
    "Mantap, lanjut live mode!",
    "Aku baru join, halo semua",
    "Chat list masuk dari bawah",
    "OBS preview aman",
    "Jangan lupa follow ya",
    "Gift target hampir tembus",
    "Mode chat box Liplo",
    "Gas live malam ini"
  ];

  return sampleMessages.slice(0, maxItems).map((message, index) => ({
    avatarUrl: "",
    badgeText: index % 4 === 0 ? "VIP" : "LIVE",
    giftImageUrl: "",
    id: `preview-${index}`,
    instanceId: `preview-${index}`,
    message: { kind: "chat", text: message },
    phase: "active",
    type: "CHAT",
    username: index === 0 ? "@dailylife.ami" : "@viewer.live"
  }));
}

function mergeGiftItem(items: RuntimeChatItem[], incoming: RuntimeChatItem) {
  const mergeIndex = items.findIndex((item) => canMergeRuntimeItem(item, incoming));

  if (mergeIndex < 0) {
    return null;
  }

  return items.map((item, index) => index === mergeIndex
    ? mergeRuntimeItem(item, incoming)
    : item);
}

function animateRuntimeFlipMovement({
  nodes,
  previousRects,
  reducedMotion,
  registerRaf,
  registerTimer
}: {
  nodes: Map<string, HTMLDivElement>;
  previousRects: Map<string, DOMRect>;
  reducedMotion: boolean;
  registerRaf: (rafId: number) => void;
  registerTimer: (timerId: number) => void;
}) {
  if (reducedMotion || previousRects.size === 0) {
    return;
  }

  nodes.forEach((node, itemId) => {
    const previousRect = previousRects.get(itemId);

    if (!previousRect) {
      return;
    }

    const nextRect = node.getBoundingClientRect();
    const deltaY = previousRect.top - nextRect.top;

    if (Math.abs(deltaY) < 0.5) {
      return;
    }

    node.style.transition = "none";
    node.style.transform = `translate3d(0, ${deltaY}px, 0)`;
    node.style.willChange = "transform";
    node.style.backfaceVisibility = "hidden";

    const firstRaf = window.requestAnimationFrame(() => {
      const secondRaf = window.requestAnimationFrame(() => {
        node.style.transition = `transform ${REPOSITION_DURATION_MS}ms cubic-bezier(.22,1,.36,1)`;
        node.style.transform = "translate3d(0, 0, 0)";

        const timerId = window.setTimeout(() => {
          node.style.transition = "";
          node.style.willChange = "";
        }, REPOSITION_DURATION_MS + 40);
        registerTimer(timerId);
      });
      registerRaf(secondRaf);
    });
    registerRaf(firstRaf);
  });
}

function normalizeEventTypeName(value: string): RuntimeChatEventType | null {
  if (value === "MEMBER") return "JOIN";
  if (value === "ABSEN") return "ABSENT";
  if (value === "CHAT" || value === "GIFT" || value === "LIKE" || value === "SHARE" || value === "JOIN" || value === "FOLLOW" || value === "ABSENT") {
    return value;
  }

  return null;
}

function eventToRuntimeMessage(event: OverlayEventPayload, type: RuntimeChatEventType, eventMessages: RuntimeEventMessages): RuntimeMessage {
  const giftName = event.giftName ?? "Gift";

  switch (type) {
    case "GIFT":
      return { giftName, kind: "gift", text: formatRuntimeEventMessage(eventMessages.GIFT, { giftName }) };
    case "LIKE":
      return { kind: "like", text: eventMessages.LIKE };
    case "FOLLOW":
      return { kind: "follow", text: eventMessages.FOLLOW };
    case "JOIN":
      return { kind: "join", text: eventMessages.JOIN };
    case "SHARE":
      return { kind: "share", text: eventMessages.SHARE };
    case "ABSENT":
      return { kind: "absent", text: eventMessages.ABSENT };
    default:
      return { kind: "chat", text: event.comment ?? "" };
  }
}

function formatRuntimeEventMessage(template: string, values: { giftName?: string }) {
  return template
    .replaceAll("{{giftName}}", values.giftName ?? "Gift")
    .replaceAll("{giftName}", values.giftName ?? "Gift");
}

function eventToSideAction(event: OverlayEventPayload, type: RuntimeChatEventType): RuntimeSideAction | undefined {
  if (type === "CHAT") {
    return undefined;
  }

  const now = Date.now();

  if (type === "GIFT") {
    return {
      count: getPositiveCount(event.giftCount),
      iconUrl: event.giftImageUrl ?? "",
      kind: "GIFT",
      label: event.giftName ?? "Gift",
      updatedAt: now
    };
  }

  if (type === "LIKE") {
    return {
      count: getPositiveCount(event.likeCount),
      kind: "LIKE",
      label: "Like",
      updatedAt: now
    };
  }

  if (type === "FOLLOW") {
    return { count: 1, kind: "FOLLOW", label: "Follow", updatedAt: now };
  }

  if (type === "JOIN") {
    return { count: 1, kind: "JOIN", label: "Join", updatedAt: now };
  }

  if (type === "SHARE") {
    return {
      count: getPositiveCount(event.shareCount),
      kind: "SHARE",
      label: "Share",
      updatedAt: now
    };
  }

  return { count: 1, kind: "ABSENT", label: "Absent", updatedAt: now };
}

function getPositiveCount(value: number | null | undefined) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.round(count) : 1;
}

function eventBadge(type: RuntimeChatEventType, role: OverlayEventPayload["userRole"]) {
  if (type === "GIFT") return "GIFT";
  if (type === "LIKE") return "LIKE";
  if (type === "FOLLOW") return "FOLLOW";
  if (type === "JOIN") return "JOIN";
  if (type === "SHARE") return "SHARE";
  if (type === "ABSENT") return "ABSEN";
  return roleBadge(role);
}

function canMergeRuntimeItem(current: RuntimeChatItem, incoming: RuntimeChatItem) {
  if (current.phase === "leaving" || current.username !== incoming.username || current.type !== incoming.type) {
    return false;
  }

  if (!current.sideAction || !incoming.sideAction || current.sideAction.kind !== incoming.sideAction.kind) {
    return false;
  }

  const elapsedMs = Date.now() - current.sideAction.updatedAt;

  if (current.sideAction.kind === "GIFT") {
    return current.sideAction.label === incoming.sideAction.label
      && current.sideAction.iconUrl === incoming.sideAction.iconUrl
      && elapsedMs <= GIFT_MERGE_WINDOW_MS;
  }

  if (current.sideAction.kind === "LIKE") {
    return elapsedMs <= LIKE_MERGE_WINDOW_MS;
  }

  return elapsedMs <= EVENT_MERGE_WINDOW_MS;
}

function mergeRuntimeItem(current: RuntimeChatItem, incoming: RuntimeChatItem): RuntimeChatItem {
  return {
    ...current,
    avatarUrl: incoming.avatarUrl || current.avatarUrl,
    badgeText: incoming.badgeText,
    id: incoming.id,
    message: incoming.message.kind === current.message.kind ? incoming.message : current.message,
    phase: current.phase === "leaving" ? "active" : current.phase,
    sideAction: current.sideAction && incoming.sideAction
      ? {
        ...current.sideAction,
        count: current.sideAction.count + incoming.sideAction.count,
        iconUrl: incoming.sideAction.iconUrl || current.sideAction.iconUrl,
        label: incoming.sideAction.label || current.sideAction.label,
        updatedAt: Date.now()
      }
      : current.sideAction
  };
}

function roleBadge(role: OverlayEventPayload["userRole"]) {
  switch (role) {
    case "moderator":
      return "MOD";
    case "subscriber":
      return "SUB";
    case "follower":
      return "FOLLOW";
    case "friend":
      return "FRIEND";
    case "topgifter":
      return "TOP";
    default:
      return "LIVE";
  }
}

function formatUsername(value: string) {
  const normalized = value.trim() || "viewer";

  return normalized.startsWith("@") ? normalized : `@${normalized}`;
}
