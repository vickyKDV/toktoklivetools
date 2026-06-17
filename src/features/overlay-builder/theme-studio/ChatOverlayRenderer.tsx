"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties } from "react";
import {
  resolvePreviewAnimationName,
  resolvePreviewExitAnimationName
} from "@/features/overlay-builder/theme-studio/overlayAnimations";
import type { ChatOverlayTheme } from "@/features/overlay-builder/theme-studio/overlayThemes";

type ChatOverlayRendererProps = {
  theme: ChatOverlayTheme;
  variant: "thumbnail" | "preview";
  className?: string;
  durationMs?: number;
  enterAnimation?: string;
  exitAnimation?: string;
  eventMessages?: PreviewEventMessages;
  eventTypes?: PreviewEventType[];
  itemCount?: number;
};

type PreviewChatItem = {
  badge: string;
  colorIndex: number;
  id: string;
  initial: string;
  message: PreviewMessage;
  phase: ChatItemPhase;
  sideAction?: PreviewSideAction;
  username: string;
};

type ChatItemPhase = "entering-hidden" | "entering-visible" | "active" | "leaving";
type PreviewEventType = "CHAT" | "GIFT" | "LIKE" | "FOLLOW" | "JOIN" | "SHARE" | "ABSENT";
type PreviewMessageEventType = Exclude<PreviewEventType, "CHAT">;
type PreviewEventMessages = Record<PreviewMessageEventType, string>;
type PreviewMessage =
  | { kind: "chat"; text: string }
  | { giftName: string; kind: "gift"; text: string }
  | { kind: "like"; text: string }
  | { kind: "follow"; text: string }
  | { kind: "join"; text: string }
  | { kind: "share"; text: string }
  | { kind: "absent"; text: string };
type PreviewSideAction = {
  count: number;
  iconUrl?: string;
  kind: Exclude<PreviewEventType, "CHAT">;
  label: string;
};

const previewListGapPx = 12;
const previewGlowSafePaddingPx = 48;
const REPOSITION_DURATION_MS = 240;
const NEW_ITEM_REVEAL_DELAY_MS = 110;
const EXIT_START_DELAY_MS = 160;
const ENTER_DURATION_MS = 330;
const EXIT_DURATION_MS = 260;
const previewDelayPatternMs = [1000, 2000, 3000, 2000, 1000, 5000] as const;
const defaultPreviewEventMessages: PreviewEventMessages = {
  ABSENT: "Barusan Hadir.",
  FOLLOW: "Ngikutin anda.",
  GIFT: "Ngasih GIFT {{giftName}}.",
  JOIN: "Baru masuk.",
  LIKE: "Makasih Like nya",
  SHARE: "Ngebagiin live."
};
const paperContentLayerStyle: CSSProperties = {
  position: "relative",
  zIndex: 2
};

export const ChatOverlayRenderer = memo(function ChatOverlayRenderer({
  theme,
  variant,
  className,
  durationMs = 320,
  enterAnimation = "slide-right",
  exitAnimation = "fade",
  eventMessages = defaultPreviewEventMessages,
  eventTypes = ["CHAT"],
  itemCount = 1
}: ChatOverlayRendererProps) {
  const isPreview = variant === "preview";
  const maxPreviewItems = Math.min(10, Math.max(1, Math.round(itemCount)));
  const [previewItems, setPreviewItems] = useState<PreviewChatItem[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const flipNodesRef = useRef(new Map<string, HTMLDivElement>());
  const motionRafsRef = useRef<number[]>([]);
  const motionTimersRef = useRef<number[]>([]);
  const previousRectsRef = useRef(new Map<string, DOMRect>());
  const previewItemsRef = useRef<PreviewChatItem[]>([]);
  const sequenceRef = useRef(0);

  const capturePreviewRects = useCallback(() => {
    const rects = new Map<string, DOMRect>();

    flipNodesRef.current.forEach((node, itemId) => {
      rects.set(itemId, node.getBoundingClientRect());
    });
    previousRectsRef.current = rects;
  }, []);

  const commitPreviewItems = useCallback((nextItems: PreviewChatItem[]) => {
    capturePreviewRects();
    previewItemsRef.current = nextItems;
    setPreviewItems(nextItems);
  }, [capturePreviewRects]);

  const removePreviewItem = useCallback((itemId: string) => {
    commitPreviewItems(previewItemsRef.current.filter((item) => item.id !== itemId));
  }, [commitPreviewItems]);

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
    if (!isPreview) {
      return;
    }

    animateFlipMovement({
      nodes: flipNodesRef.current,
      previousRects: previousRectsRef.current,
      reducedMotion,
      registerRaf: (rafId) => motionRafsRef.current.push(rafId),
      registerTimer: (timerId) => motionTimersRef.current.push(timerId)
    });
    previousRectsRef.current = new Map();
  }, [isPreview, previewItems, reducedMotion]);

  useEffect(() => () => {
    for (const timerId of motionTimersRef.current) {
      window.clearTimeout(timerId);
    }
    for (const rafId of motionRafsRef.current) {
      window.cancelAnimationFrame(rafId);
    }

    motionRafsRef.current = [];
    motionTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (!isPreview) {
      return;
    }

    const timers: number[] = [];
    const removeDelayMs = EXIT_DURATION_MS + 40;
    const shuffledDelays: number[] = [];
    let disposed = false;
    let delayCursor = 0;
    let previewTimerId: number | null = null;
    let pausedByVisibility = false;

    const updateItems = (nextItems: PreviewChatItem[]) => {
      commitPreviewItems(nextItems);
    };

    const removeItem = (itemId: string) => {
      removePreviewItem(itemId);
    };

    const revealItem = (itemId: string) => {
      const nextItems = previewItemsRef.current.map((item) => (
        item.id === itemId && item.phase === "entering-hidden" ? { ...item, phase: "entering-visible" as const } : item
      ));
      updateItems(nextItems);
    };

    const activateItem = (itemId: string) => {
      const nextItems = previewItemsRef.current.map((item) => (
        item.id === itemId && item.phase === "entering-visible" ? { ...item, phase: "active" as const } : item
      ));
      updateItems(nextItems);
    };

    const markItemLeaving = (itemId: string) => {
      const nextItems = previewItemsRef.current.map((item) => (
        item.id === itemId ? { ...item, phase: "leaving" as const } : item
      ));
      updateItems(nextItems);
    };

    const scheduleExit = (itemId: string) => {
      const exitTimerId = window.setTimeout(() => {
        markItemLeaving(itemId);
      }, EXIT_START_DELAY_MS);
      const removeTimerId = window.setTimeout(() => {
        removeItem(itemId);
      }, EXIT_START_DELAY_MS + removeDelayMs);
      timers.push(exitTimerId, removeTimerId);
    };

    const scheduleReveal = (itemId: string) => {
      const revealTimerId = window.setTimeout(() => {
        revealItem(itemId);
      }, NEW_ITEM_REVEAL_DELAY_MS);
      const activeTimerId = window.setTimeout(() => {
        activateItem(itemId);
      }, NEW_ITEM_REVEAL_DELAY_MS + ENTER_DURATION_MS + 40);
      timers.push(revealTimerId, activeTimerId);
    };

    const getNextDelay = () => {
      if (delayCursor < previewDelayPatternMs.length) {
        const delay = previewDelayPatternMs[delayCursor];
        delayCursor += 1;
        return delay;
      }

      if (shuffledDelays.length === 0) {
        shuffledDelays.push(...shufflePreviewDelays([...previewDelayPatternMs]));
      }

      return shuffledDelays.shift() ?? previewDelayPatternMs[0];
    };

    const clearPreviewTimer = () => {
      if (previewTimerId !== null) {
        window.clearTimeout(previewTimerId);
        previewTimerId = null;
      }
    };

    const scheduleNextPreviewMessage = (delayMs: number) => {
      if (disposed) {
        return;
      }

      clearPreviewTimer();

      if (document.hidden) {
        pausedByVisibility = true;
        return;
      }

      previewTimerId = window.setTimeout(() => {
        previewTimerId = null;
        addItem();
        scheduleNextPreviewMessage(getNextDelay());
      }, delayMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearPreviewTimer();
        pausedByVisibility = true;
        return;
      }

      if (pausedByVisibility && !disposed) {
        pausedByVisibility = false;
        scheduleNextPreviewMessage(120);
      }
    };

    const addItem = () => {
      if (disposed) {
        return;
      }

      const activeItems = previewItemsRef.current.filter((item) => item.phase !== "leaving");
      const leavingItems = previewItemsRef.current.filter((item) => item.phase === "leaving");
      const nextItem = createPreviewItem(sequenceRef.current, eventTypes, eventMessages);
      sequenceRef.current += 1;

      if (activeItems.length >= maxPreviewItems) {
        const oldestItem = activeItems[activeItems.length - 1];

        updateItems([nextItem, ...activeItems, ...leavingItems].slice(0, maxPreviewItems + 1));
        scheduleReveal(nextItem.id);
        scheduleExit(oldestItem.id);
      } else {
        updateItems([nextItem, ...activeItems, ...leavingItems].slice(0, maxPreviewItems + 1));
        scheduleReveal(nextItem.id);
      }

    };

    previewItemsRef.current = [];
    setPreviewItems([]);
    sequenceRef.current = 0;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNextPreviewMessage(80);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearPreviewTimer();
      for (const timerId of timers) {
        window.clearTimeout(timerId);
      }
      previewItemsRef.current = [];
    };
  }, [commitPreviewItems, durationMs, enterAnimation, eventMessages, eventTypes, exitAnimation, isPreview, maxPreviewItems, removePreviewItem, theme.id]);

  return (
    <div
      className={className}
      style={getStageStyle(theme, isPreview)}
      data-chat-theme-frame={theme.frame}
      data-chat-theme-renderer={variant}
    >
      <div className={isPreview ? "theme-preview-grid" : "theme-thumbnail-grid"} />
      <div style={getBubbleLayerStyle(isPreview)}>
        {isPreview ? (
          <ol style={getPreviewListStyle(maxPreviewItems)}>
            {previewItems.map((item, index) => (
              <li
                key={item.id}
                data-chat-theme-list-item="true"
                data-chat-theme-list-state={item.phase}
                style={getPreviewListItemStyle(index)}
              >
                <div
                  ref={(node) => {
                    if (node) {
                      flipNodesRef.current.set(item.id, node);
                    } else {
                      flipNodesRef.current.delete(item.id);
                    }
                  }}
                  style={getPreviewFlipWrapperStyle()}
                >
                  <ChatThemeBubble
                    animationStyle={getPreviewBubbleAnimationStyle(item, {
                      enterAnimation,
                      exitAnimation,
                      reducedMotion
                    })}
                    badge={item.badge}
                    colorIndex={item.colorIndex}
                    initial={item.initial}
                    isPreview={isPreview}
                    maxItems={maxPreviewItems}
                    message={item.message}
                    onAnimationEnd={item.phase === "leaving" ? (event) => {
                      if (event.currentTarget === event.target) {
                        removePreviewItem(item.id);
                      }
                    } : undefined}
                    sideAction={item.sideAction}
                    theme={theme}
                    username={item.username}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <ChatThemeBubble
            badge={getBadgeText(theme)}
            colorIndex={0}
            initial="V"
            isPreview={isPreview}
            message={{ kind: "chat", text: getSampleMessage(theme) }}
            theme={theme}
            username="@dailylife.ami"
          />
        )}
      </div>
    </div>
  );
});

function ChatThemeBubble({
  animationStyle,
  badge,
  colorIndex = 0,
  initial,
  isPreview,
  maxItems = 1,
  message,
  onAnimationEnd,
  sideAction,
  theme,
  username
}: {
  animationStyle?: CSSProperties;
  badge: string;
  colorIndex?: number;
  initial: string;
  isPreview: boolean;
  maxItems?: number;
  message: PreviewMessage;
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void;
  sideAction?: PreviewSideAction;
  theme: ChatOverlayTheme;
  username: string;
}) {
  return (
    <div style={{ ...getBubbleRowStyle(isPreview, maxItems), ...animationStyle }} onAnimationEnd={onAnimationEnd}>
      <div data-chat-theme-bubble="true" style={getCardStyle(theme, isPreview, maxItems, colorIndex)}>
        {theme.frame === "gaming" ? <GamingFrameDecoration theme={theme} /> : null}
        {theme.frame === "glitch" ? <GlitchFrameDecoration theme={theme} /> : null}
        {theme.frame === "rgb-glitch" ? <RgbGlitchFrameDecoration theme={theme} /> : null}
        {theme.frame === "pixel" ? <PixelCornerDecoration theme={theme} /> : null}
        {theme.frame === "pink" ? <span aria-hidden="true" style={getBubbleTailStyle(theme)} /> : null}
        <div style={getAvatarStyle(theme, isPreview, maxItems, colorIndex)}>
          <span style={getAvatarInnerStyle(theme, isPreview, maxItems, colorIndex)}>{initial}</span>
        </div>
        <div style={getContentStyle(theme, isPreview, maxItems, colorIndex)}>
          {theme.frame === "paper" ? <PaperTextureDecoration colorIndex={colorIndex} theme={theme} /> : null}
          <div className="flex min-w-0 items-center gap-2" style={theme.frame === "paper" ? paperContentLayerStyle : undefined}>
            <span style={getBadgeStyle(theme, isPreview, maxItems, colorIndex, badge)}>{badge}</span>
            <span style={getUsernameStyle(theme, isPreview, maxItems, colorIndex)}>{username}</span>
            <span aria-hidden="true" style={getStatusDotStyle(theme, isPreview, colorIndex)} />
          </div>
          <p style={getMessageStyle(theme, isPreview, maxItems, colorIndex)}>
            <PreviewMessageRenderer message={message} />
          </p>
        </div>
      </div>
      {sideAction ? <PreviewSideActionRenderer isPreview={isPreview} maxItems={maxItems} sideAction={sideAction} theme={theme} /> : null}
    </div>
  );
}

function PreviewMessageRenderer({ message }: { message: PreviewMessage }) {
  return <>{message.text}</>;
}

function PreviewSideActionRenderer({
  isPreview,
  maxItems,
  sideAction,
  theme
}: {
  isPreview: boolean;
  maxItems: number;
  sideAction: PreviewSideAction;
  theme: ChatOverlayTheme;
}) {
  return (
    <span style={getPreviewSideActionStyle(theme, isPreview, maxItems, sideAction.kind)}>
      <span style={getPreviewSideActionIconStyle(isPreview, maxItems)}>
        {sideAction.iconUrl ? (
          <span aria-label={sideAction.label} role="img" style={getPreviewSideActionImageStyle(sideAction.iconUrl)} />
        ) : (
          <PreviewSideActionIcon kind={sideAction.kind} />
        )}
      </span>
      <span style={getPreviewSideActionCountStyle(isPreview, maxItems)}>x{sideAction.count}</span>
    </span>
  );
}

function PreviewSideActionIcon({ kind }: { kind: PreviewSideAction["kind"] }) {
  const pathByKind: Record<PreviewSideAction["kind"], string> = {
    ABSENT: "M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-2.35-5.65L11 13l-2.65-2.65-1.4 1.4L11 15.8l8.05-8.05A9.96 9.96 0 0 0 12 2Z",
    FOLLOW: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 1.7-6 3.8V19h9.8a6.9 6.9 0 0 1-.3-2A6.8 6.8 0 0 1 14 12.8 11 11 0 0 0 9 13Zm9 1v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z",
    GIFT: "M20 12v8H4v-8h16Zm-9-8c1.3 0 2.12.8 2.35 1.82C13.8 5.3 14.55 5 15.5 5A2.5 2.5 0 0 1 18 7.5c0 1.2-.75 2.1-1.82 2.5H20v2H4v-2h3.82A2.65 2.65 0 0 1 6 7.5 2.5 2.5 0 0 1 8.5 5c.95 0 1.7.3 2.15.82C10.88 4.8 11.7 4 13 4h-2Z",
    JOIN: "M11 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8v-2h8V5h-8V3Zm1.6 5.4L16.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H3v-2h9.4l-1.2-1.2 1.4-1.4Z",
    LIKE: "M12 21s-7.2-4.35-9.45-8.7C.75 8.85 2.7 5 6.45 5c2.05 0 3.35 1.05 4.1 2.05C11.3 6.05 12.6 5 14.65 5c3.75 0 5.7 3.85 3.9 7.3C16.3 16.65 12 21 12 21Z",
    SHARE: "M18 16.1c-1.05 0-1.98.52-2.55 1.32L8.9 13.6a3.2 3.2 0 0 0 0-3.2l6.48-3.78A3.12 3.12 0 1 0 14.6 5L8.1 8.78a3.1 3.1 0 1 0 0 6.44l6.5 3.8A3.1 3.1 0 1 0 18 16.1Z"
  };

  return (
    <svg aria-hidden="true" style={{ display: "block", height: "76%", width: "76%" }} viewBox="0 0 24 24">
      <path d={pathByKind[kind]} fill="currentColor" />
    </svg>
  );
}

function getStageStyle(theme: ChatOverlayTheme, isPreview: boolean): CSSProperties {
  const gridColor = theme.preview.darkText ? "rgba(15,23,42,.1)" : "rgba(148,163,184,.1)";

  return {
    background:
      isPreview
        ? `radial-gradient(circle at 48% 34%, ${withAlpha(theme.preview.glow, 0.22)}, transparent 32%), radial-gradient(circle at 50% 100%, ${withAlpha(theme.preview.accent, 0.16)}, transparent 34%), linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px), ${theme.preview.background}`
        : `radial-gradient(circle at 50% 42%, ${withAlpha(theme.preview.glow, 0.15)}, transparent 42%), ${theme.preview.background}`,
    backgroundSize: isPreview ? "auto, auto, 56px 56px, 56px 56px, auto" : "auto",
    height: "100%",
    overflow: "hidden",
    position: "relative",
    width: "100%"
  };
}

function getBubbleLayerStyle(isPreview: boolean): CSSProperties {
  return {
    alignItems: "flex-end",
    display: "flex",
    inset: 0,
    justifyContent: "flex-start",
    padding: isPreview ? 0 : "clamp(18px, 4vw, 40px)",
    position: "absolute",
    zIndex: 1
  };
}

function getPreviewListStyle(maxItems: number): CSSProperties {
  const listScale = getPreviewListScale(maxItems);
  const topSafePadding = maxItems >= 10 ? 58 : previewGlowSafePaddingPx;
  const bottomSafePadding = maxItems >= 10 ? 34 : previewGlowSafePaddingPx;

  return {
    alignItems: "flex-start",
    bottom: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column-reverse",
    gap: previewListGapPx,
    height: "100%",
    justifyContent: "flex-start",
    left: 0,
    listStyle: "none",
    margin: 0,
    maxWidth: "none",
    overflow: "visible",
    padding: `${topSafePadding}px ${previewGlowSafePaddingPx}px ${bottomSafePadding}px ${previewGlowSafePaddingPx}px`,
    position: "absolute",
    transform: `scale(${listScale})`,
    transformOrigin: "bottom left",
    width: "100%"
  };
}

function getPreviewListScale(maxItems: number) {
  if (maxItems >= 10) return 0.76;
  if (maxItems >= 8) return 0.85;
  if (maxItems >= 6) return 0.92;
  return 1;
}

function getPreviewListItemStyle(index: number): CSSProperties {
  return {
    backfaceVisibility: "hidden",
    flexShrink: 0,
    maxWidth: "100%",
    position: "relative",
    transformOrigin: "bottom left",
    transition: "none",
    width: "fit-content",
    zIndex: 100 - index
  };
}

function getPreviewFlipWrapperStyle(): CSSProperties {
  return {
    backfaceVisibility: "hidden",
    maxWidth: "100%",
    transform: "translate3d(0,0,0)",
    width: "fit-content"
  };
}

function getPreviewBubbleAnimationStyle(
  item: PreviewChatItem,
  animation: {
    enterAnimation: string;
    exitAnimation: string;
    reducedMotion: boolean;
  }
): CSSProperties {
  if (item.phase === "active") {
    return {
      opacity: 1,
      transform: "translate3d(0, 0, 0) scale(1)"
    };
  }

  if (item.phase === "entering-hidden") {
    return {
      opacity: 0,
      pointerEvents: "none",
      transform: "translate3d(0, 16px, 0) scale(.96)"
    };
  }

  const durationMs = animation.reducedMotion
    ? 120
    : item.phase === "leaving"
      ? EXIT_DURATION_MS
      : ENTER_DURATION_MS;
  const animationName = animation.reducedMotion
    ? (item.phase === "leaving" ? "themePreviewFadeOut" : "themePreviewFade")
    : item.phase === "leaving"
      ? resolvePreviewExitAnimationName(animation.exitAnimation)
      : resolvePreviewAnimationName(animation.enterAnimation);

  return {
    animation: `${animationName} ${durationMs}ms cubic-bezier(.22,1,.36,1) both`,
    backfaceVisibility: "hidden",
    transform: "translateZ(0)",
    willChange: "opacity, transform"
  };
}

function getCardStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  const density = getPreviewBubbleDensity(maxItems);

  return {
    ...getCardShellStyle(theme, isPreview, colorIndex),
    alignItems: "center",
    boxSizing: "border-box",
    display: "flex",
    gap: isPreview ? density.contentGap : 7,
    maxWidth: isPreview ? "min(450px, 100%)" : undefined,
    minHeight: isPreview ? getPreviewMinHeight(maxItems) : 40,
    padding: theme.frame === "paper" ? 0 : (isPreview ? getPreviewPadding(maxItems) : "8px 11px"),
    position: "relative",
    isolation: "isolate",
    width: isPreview ? "fit-content" : "78%"
  };
}

function getBubbleRowStyle(isPreview: boolean, maxItems: number): CSSProperties {
  const density = getPreviewBubbleDensity(maxItems);

  return {
    alignItems: "center",
    display: "inline-flex",
    gap: isPreview ? Math.max(7, density.contentGap + 4) : 7,
    maxWidth: "100%",
    transform: "translateZ(0)",
    width: "fit-content"
  };
}

function getPreviewSideActionStyle(
  theme: ChatOverlayTheme,
  isPreview: boolean,
  maxItems: number,
  kind: PreviewSideAction["kind"]
): CSSProperties {
  const density = getPreviewBubbleDensity(maxItems);
  const color = getSideActionColor(kind);

  return {
    alignItems: "center",
    background: "transparent",
    border: 0,
    borderRadius: 0,
    boxShadow: "none",
    color,
    display: "inline-flex",
    flex: "0 0 auto",
    fontSize: isPreview ? Math.max(11, density.badgeFont + 5) : 9,
    fontWeight: 900,
    gap: isPreview ? 4 : 3,
    lineHeight: 1,
    minHeight: 0,
    padding: 0,
    whiteSpace: "nowrap"
  };
}

function getPreviewSideActionIconStyle(isPreview: boolean, maxItems: number): CSSProperties {
  const density = getPreviewBubbleDensity(maxItems);
  const size = isPreview ? Math.max(16, density.avatar * 0.72) : 14;

  return {
    alignItems: "center",
    background: "transparent",
    borderRadius: 0,
    display: "inline-flex",
    height: size,
    justifyContent: "center",
    overflow: "hidden",
    width: size
  };
}

function getPreviewSideActionImageStyle(iconUrl: string): CSSProperties {
  return {
    backgroundImage: `url("${iconUrl}")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    display: "block",
    height: "100%",
    width: "100%"
  };
}

function getPreviewSideActionCountStyle(isPreview: boolean, maxItems: number): CSSProperties {
  return {
    fontSize: isPreview ? Math.max(12, getPreviewBubbleDensity(maxItems).badgeFont + 6) : 10,
    fontWeight: 900,
    letterSpacing: ".01em",
    lineHeight: 1,
    textShadow: "0 2px 8px rgba(0,0,0,.32)"
  };
}

function getSideActionColor(kind: PreviewSideAction["kind"]) {
  if (kind === "GIFT") return "#facc15";
  if (kind === "LIKE") return "#fb7185";
  if (kind === "FOLLOW") return "#38bdf8";
  if (kind === "JOIN") return "#34d399";
  if (kind === "SHARE") return "#a78bfa";
  return "#f97316";
}

function getCardShellStyle(theme: ChatOverlayTheme, isPreview: boolean, colorIndex: number): CSSProperties {
  const clipPath = getClipPath(theme);
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;

  return {
    backdropFilter: theme.frame === "glass" || theme.frame === "dynamic" ? "blur(12px)" : undefined,
    background: theme.frame === "paper" ? "transparent" : colorPop?.background ?? getPanelBackground(theme),
    borderColor: colorPop?.border ?? theme.preview.border,
    borderRadius: clipPath ? 0 : theme.preview.radius,
    borderStyle: "solid",
    borderWidth: theme.frame === "gaming" || theme.frame === "glitch" || theme.frame === "rgb-glitch" || theme.frame === "paper" ? 0 : getBorderWidth(theme, isPreview),
    boxShadow: theme.frame === "paper" ? "none" : colorPop ? `0 16px 28px ${colorPop.shadow}` : getBoxShadow(theme, isPreview),
    clipPath,
    color: colorPop?.text ?? theme.preview.text,
    overflow: "visible"
  };
}

function getPanelBackground(theme: ChatOverlayTheme) {
  if (theme.frame === "gaming" || theme.frame === "women") {
    return `linear-gradient(135deg, ${theme.preview.panel}, ${theme.preview.panelSoft})`;
  }

  if (theme.frame === "glass" || theme.frame === "dynamic") {
    return `linear-gradient(135deg, ${withAlpha("#ffffff", 0.14)}, ${withAlpha(theme.preview.panelSoft, 0.28)})`;
  }

  if (theme.frame === "pink") {
    return `linear-gradient(135deg, ${theme.preview.panel}, ${theme.preview.panelSoft})`;
  }

  return theme.preview.panel;
}

function getBoxShadow(theme: ChatOverlayTheme, isPreview: boolean) {
  if (theme.frame === "pixel") {
    return `${isPreview ? 8 : 4}px ${isPreview ? 8 : 4}px 0 ${withAlpha("#111827", 0.92)}, 0 18px ${isPreview ? 38 : 14}px ${withAlpha("#000000", 0.22)}`;
  }

  if (theme.frame === "neumorph-light") {
    return `-12px -12px 26px ${withAlpha("#ffffff", 0.55)}, 14px 14px 30px ${withAlpha("#94a3b8", 0.42)}`;
  }

  if (theme.frame === "neumorph-dark") {
    return `-10px -10px 24px ${withAlpha("#263244", 0.32)}, 16px 16px 34px ${withAlpha("#000000", 0.42)}`;
  }

  if (theme.frame === "square") {
    return `0 18px 34px ${withAlpha("#000000", 0.24)}`;
  }

  if (theme.frame === "rgb-glitch") {
    return `0 0 ${isPreview ? 20 : 10}px ${withAlpha(theme.preview.border, 0.2)}, 0 0 ${isPreview ? 18 : 9}px ${withAlpha(theme.preview.accent, 0.14)}, ${isPreview ? 4 : 2}px ${isPreview ? 4 : 2}px 0 ${withAlpha(theme.preview.accent, 0.2)}, ${isPreview ? -4 : -2}px ${isPreview ? -3 : -1}px 0 ${withAlpha(theme.preview.border, 0.16)}, 0 18px ${isPreview ? 42 : 16}px ${withAlpha("#000000", 0.34)}`;
  }

  return `0 0 ${isPreview ? 34 : 16}px ${withAlpha(theme.preview.glow, isPreview ? 0.28 : 0.2)}, 0 22px ${isPreview ? 56 : 18}px ${withAlpha(theme.preview.glow, isPreview ? 0.14 : 0.09)}`;
}

function getBorderWidth(theme: ChatOverlayTheme, isPreview: boolean) {
  if (theme.frame === "gaming" || theme.frame === "women") return isPreview ? 1 : 1;
  if (theme.frame === "pixel") return isPreview ? 3 : 2;
  if (theme.frame === "square") return isPreview ? 2 : 1;
  return isPreview ? 1 : 1;
}

function getPreviewMinHeight(maxItems: number) {
  return getPreviewBubbleDensity(maxItems).height;
}

function getPreviewPadding(maxItems: number) {
  const density = getPreviewBubbleDensity(maxItems);

  return `${density.paddingY}px ${density.paddingX}px`;
}

function getAvatarStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  const size = isPreview ? getPreviewBubbleDensity(maxItems).avatar : 27;
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;
  const paperAvatar = theme.frame === "paper";

  return {
    alignItems: "center",
    background: paperAvatar ? `linear-gradient(135deg, ${theme.preview.avatarBg}, #1a6bd6)` : colorPop?.avatarBg ?? `linear-gradient(135deg, ${theme.preview.avatarBg}, ${withAlpha(theme.preview.accent, 0.7)})`,
    border: paperAvatar ? "1px solid rgba(255,255,255,.08)" : `${theme.frame === "pixel" || theme.frame === "square" ? 2 : 1}px solid ${colorPop?.avatarBorder ?? theme.preview.border}`,
    borderRadius: getAvatarRadius(theme, isPreview),
    boxShadow: paperAvatar ? "0 10px 26px rgba(0,0,0,.35)" : theme.frame === "white" || theme.frame === "neumorph-light" || theme.frame === "square" ? "none" : `0 0 ${isPreview ? 20 : 8}px ${withAlpha(theme.preview.glow, 0.34)}`,
    color: theme.preview.badgeText,
    display: "grid",
    flexShrink: 0,
    height: size,
    opacity: 1,
    placeItems: "center",
    position: "relative",
    width: size,
    zIndex: 2
  };
}

function getAvatarRadius(theme: ChatOverlayTheme, isPreview: boolean) {
  if (theme.frame === "pixel" || theme.frame === "square") return isPreview ? 10 : 4;
  return 999;
}

function getAvatarInnerStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;

  return {
    color: theme.frame === "paper" ? "#ffffff" : colorPop?.avatarText ?? (theme.preview.darkText ? "#111827" : "#ffffff"),
    fontSize: isPreview ? getPreviewBubbleDensity(maxItems).avatarFont : 10,
    fontWeight: 900,
    lineHeight: 1
  };
}

function getBadgeStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number, badgeText = ""): CSSProperties {
  const density = getPreviewBubbleDensity(maxItems);
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;
  const paperBadgeBackground = theme.frame === "paper" ? getPaperBadgeBackground(badgeText) : null;

  return {
    background: paperBadgeBackground ?? colorPop?.badgeBg ?? theme.preview.badgeBg,
    borderRadius: theme.frame === "pixel" || theme.frame === "square" || theme.frame === "colorful" || theme.frame === "paper" ? 4 : 999,
    color: colorPop?.badgeText ?? theme.preview.badgeText,
    flexShrink: 0,
    fontSize: isPreview ? density.badgeFont : 6,
    fontWeight: 900,
    lineHeight: 1,
    padding: isPreview ? `${density.badgePaddingY}px ${density.badgePaddingX}px` : "3px 5px"
  };
}

function getUsernameStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;

  return {
    color: colorPop?.text ?? theme.preview.username,
    display: "block",
    fontFamily: theme.frame === "pixel" || theme.frame === "paper" ? "Inter, ui-sans-serif, system-ui, sans-serif" : undefined,
    fontSize: isPreview ? getPreviewBubbleDensity(maxItems).usernameFont : 8,
    fontWeight: 900,
    lineHeight: 1.05,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };
}

function getMessageStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;

  return {
    color: colorPop?.text ?? theme.preview.text,
    display: isPreview ? "-webkit-box" : "block",
    fontFamily: theme.frame === "paper" ? "\"Courier New\", Courier, monospace" : theme.frame === "pixel" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
    fontSize: isPreview ? getPreviewBubbleDensity(maxItems).messageFont : 7,
    fontWeight: isPreview ? 720 : 700,
    lineHeight: 1.16,
    margin: isPreview ? "2px 0 0" : "4px 0 0",
    overflow: "hidden",
    textOverflow: isPreview ? undefined : "ellipsis",
    whiteSpace: isPreview ? "normal" : "nowrap",
    wordBreak: "break-word",
    WebkitBoxOrient: isPreview ? "vertical" : undefined,
    position: theme.frame === "paper" ? "relative" : undefined,
    WebkitLineClamp: isPreview ? 3 : undefined,
    zIndex: theme.frame === "paper" ? 2 : undefined
  };
}

function getPreviewBubbleDensity(maxItems: number) {
  if (maxItems >= 10) {
    return {
      avatar: 18,
      avatarFont: 8,
      badgeFont: 6,
      badgePaddingX: 5,
      badgePaddingY: 2,
      contentGap: 5,
      height: 30,
      messageFont: 7,
      paddingX: 7,
      paddingY: 4,
      usernameFont: 8
    };
  }

  if (maxItems >= 8) {
    return {
      avatar: 20,
      avatarFont: 9,
      badgeFont: 6,
      badgePaddingX: 5,
      badgePaddingY: 2,
      contentGap: 6,
      height: 34,
      messageFont: 8,
      paddingX: 8,
      paddingY: 4,
      usernameFont: 9
    };
  }

  if (maxItems >= 6) {
    return {
      avatar: 22,
      avatarFont: 9,
      badgeFont: 7,
      badgePaddingX: 5,
      badgePaddingY: 3,
      contentGap: 6,
      height: 36,
      messageFont: 8,
      paddingX: 8,
      paddingY: 5,
      usernameFont: 9
    };
  }

  return {
    avatar: 24,
    avatarFont: 10,
    badgeFont: 7,
    badgePaddingX: 6,
    badgePaddingY: 3,
    contentGap: 7,
    height: 40,
    messageFont: 9,
    paddingX: 9,
    paddingY: 5,
    usernameFont: 10
  };
}

function getColorPopPreviewPalette(index: number) {
  return colorPopPreviewPalette[index % colorPopPreviewPalette.length] ?? colorPopPreviewPalette[0];
}

const colorPopPreviewPalette = [
  {
    avatarBg: "linear-gradient(135deg,#0284c7,#22d3ee)",
    avatarBorder: "#bae6fd",
    avatarText: "#ffffff",
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
    avatarText: "#ffffff",
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
    avatarText: "#ffffff",
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
    avatarText: "#ffffff",
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
    avatarText: "#ffffff",
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
    avatarText: "#ffffff",
    background: "#fef9c3",
    badgeBg: "#854d0e",
    badgeText: "#ffffff",
    border: "#fde047",
    shadow: "rgba(250,204,21,.22)",
    status: "#eab308",
    text: "#422006"
  }
] as const;

const paperPreviewVariants = [
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

type PaperPreviewVariant = (typeof paperPreviewVariants)[number];

function animateFlipMovement({
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

function getStatusDotStyle(theme: ChatOverlayTheme, isPreview: boolean, colorIndex: number): CSSProperties {
  const size = isPreview ? 4 : 4;
  const colorPop = theme.frame === "colorful" ? getColorPopPreviewPalette(colorIndex) : null;

  return {
    background: theme.frame === "paper" ? "rgba(32,21,13,.42)" : colorPop?.status ?? theme.preview.accent2,
    borderRadius: 999,
    boxShadow: theme.frame === "paper" ? "none" : `0 0 ${isPreview ? 12 : 4}px ${colorPop ? colorPop.shadow : withAlpha(theme.preview.accent2, 0.48)}`,
    flexShrink: 0,
    height: size,
    marginLeft: "auto",
    opacity: 1,
    position: "relative",
    width: size,
    zIndex: 2
  };
}

function getContentStyle(theme: ChatOverlayTheme, isPreview: boolean, maxItems: number, colorIndex: number): CSSProperties {
  if (theme.frame === "paper") {
    const variant = paperPreviewVariants[colorIndex % paperPreviewVariants.length] ?? paperPreviewVariants[0];
    const density = getPreviewBubbleDensity(maxItems);
    const compactPaper = maxItems >= 8;
    const paperPaddingY = isPreview ? Math.max(3, density.paddingY - 1) : 6;
    const paperPaddingX = isPreview ? Math.max(7, density.paddingX + 3) : 8;

    return {
      backgroundColor: theme.preview.panel,
      backgroundImage: getPaperBackgroundImage(variant),
      border: `2px solid ${theme.preview.border}`,
      borderRadius: theme.preview.radius,
      boxShadow: compactPaper
        ? "2px 3px 0 rgba(52,27,9,.32), 0 10px 18px rgba(0,0,0,.24), inset 0 0 0 1px rgba(255,255,255,.22), inset 0 -10px 18px rgba(98,54,20,.1)"
        : "4px 6px 0 rgba(52,27,9,.35), 0 18px 30px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.24), inset 0 -18px 28px rgba(98,54,20,.12)",
      color: theme.preview.text,
      flex: "0 1 auto",
      maxWidth: isPreview ? "min(450px, 52vw)" : "min(240px, 100%)",
      minWidth: 0,
      opacity: 1,
      overflow: "visible",
      padding: `${paperPaddingY}px ${paperPaddingX}px`,
      position: "relative",
      transform: `rotate(${variant.rotate})`,
      width: "fit-content",
      zIndex: 2
    };
  }

  return {
    flex: "0 1 auto",
    maxWidth: isPreview ? "min(330px, 54vw)" : undefined,
    minWidth: 0,
    opacity: 1,
    position: "relative",
    width: isPreview ? "max-content" : undefined,
    zIndex: 2
  };
}

function PaperTextureDecoration({ colorIndex, theme }: { colorIndex: number; theme: ChatOverlayTheme }) {
  const variant = paperPreviewVariants[colorIndex % paperPreviewVariants.length] ?? paperPreviewVariants[0];
  void theme;

  return (
    <span aria-hidden="true" style={getPaperWrinkleOverlayStyle(variant)} />
  );
}

function getPaperBackgroundImage(variant: PaperPreviewVariant) {
  return [
    `radial-gradient(circle at ${variant.s1x} ${variant.s1y}, rgba(103,56,19,.16) 0 1px, transparent 18px)`,
    `radial-gradient(circle at ${variant.s2x} ${variant.s2y}, rgba(103,56,19,.13) 0 1px, transparent 24px)`,
    `radial-gradient(circle at ${variant.s3x} ${variant.s3y}, rgba(255,255,255,.18) 0 1px, transparent 22px)`,
    `linear-gradient(${variant.fold1}, transparent 0 47%, rgba(85,48,18,.13) 48%, rgba(255,255,255,.18) 49%, transparent 51%)`,
    `linear-gradient(${variant.fold2}, transparent 0 58%, rgba(85,48,18,.10) 59%, rgba(255,255,255,.13) 60%, transparent 62%)`,
    `repeating-linear-gradient(${variant.fiber}, rgba(80,45,18,.045) 0 1px, transparent 1px 7px)`,
    "linear-gradient(135deg, rgba(255,255,255,.24), transparent 35%)",
    "radial-gradient(ellipse at 80% 90%, rgba(103,56,19,.16), transparent 45%)"
  ].join(", ");
}

function getPaperWrinkleOverlayStyle(variant: PaperPreviewVariant): CSSProperties {
  return {
    background: [
      `radial-gradient(ellipse at ${variant.w1x} ${variant.w1y}, rgba(255,255,255,.20), transparent 32%)`,
      `radial-gradient(ellipse at ${variant.w2x} ${variant.w2y}, rgba(77,42,13,.13), transparent 34%)`,
      `linear-gradient(${variant.wrinkle1}, transparent 0 42%, rgba(60,35,12,.10) 43%, transparent 45%)`,
      `linear-gradient(${variant.wrinkle2}, transparent 0 52%, rgba(255,255,255,.16) 53%, transparent 55%)`
    ].join(", "),
    borderRadius: "inherit",
    inset: 0,
    mixBlendMode: "multiply",
    opacity: 0.85,
    pointerEvents: "none",
    position: "absolute",
    zIndex: 0
  };
}

function getPaperBadgeBackground(badgeText: string) {
  const normalized = badgeText.trim().toUpperCase();

  if (normalized === "NEW") return "#28b94f";
  if (normalized === "VIP") return "#1966df";
  if (normalized === "MOD") return "#d65a13";
  return "#8e3df5";
}

function getBubbleTailStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background: theme.preview.panel,
    bottom: 15,
    clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
    height: 24,
    left: -10,
    position: "absolute",
    width: 24
  };
}

function getClipPath(_theme: ChatOverlayTheme) {
  void _theme;

  return undefined;
}

function getBadgeText(theme: ChatOverlayTheme) {
  if (theme.frame === "pixel") return "💎 7";
  if (theme.frame === "women") return "VIP";
  return "LIVE";
}

function getSampleMessage(theme: ChatOverlayTheme) {
  if (theme.frame === "pixel") {
    return "HELLO STREAM, PIXEL MODE ON!";
  }

  if (theme.frame === "gaming") {
    return "Jangan lupa follow ya guys, push rank malam ini sampai target tembus!";
  }

  return "Ini cinematic overlay preview";
}

function createPreviewItem(sequence: number, eventTypes: PreviewEventType[], eventMessages: PreviewEventMessages): PreviewChatItem {
  const messages = [
    "Gas",
    "Mantap!",
    "Halo kak, baru join live nih",
    "Overlay-nya smooth banget 🔥",
    "Mantap, tampilannya udah masuk!",
    "Gas live malam ini",
    "Jangan lupa follow ya",
    "Chat box-nya enak dilihat",
    "Gift target hampir tembus",
    "Aku suka theme yang ini",
    "OBS preview aman banget",
    "Mode Liplo chat box",
    "Ini contoh chat TikTok panjang sekitar seratus lima puluh karakter untuk ngetes wrap tiga baris, tetap rapi, readable, dan tidak bikin bubble terlalu lebar."
  ];
  const usernames = [
    "@ali",
    "@bima",
    "@sri",
    "@dailylife.ami",
    "@viewer.live",
    "@amik.stream",
    "@liplo.user",
    "@guest.chat",
    "@raffi.live",
    "@naya.watch",
    "@bima.join"
  ];
  const badges = ["LIVE", "VIP", "MOD", "NEW"];
  const username = randomFrom(usernames);
  const availableEventTypes: PreviewEventType[] = eventTypes.length ? eventTypes : ["CHAT"];
  const eventType = randomFrom(availableEventTypes);

  return {
    badge: getPreviewBadgeForEvent(eventType, badges),
    colorIndex: sequence,
    id: `preview-chat-${sequence}`,
    initial: createInitialFromUsername(username),
    message: createPreviewMessage(eventType, messages, sequence, eventMessages),
    phase: "entering-hidden",
    sideAction: createPreviewSideAction(eventType, sequence),
    username
  };
}

function createPreviewMessage(eventType: PreviewEventType, messages: string[], sequence: number, eventMessages: PreviewEventMessages): PreviewMessage {
  const giftName = sequence % 2 === 0 ? "Mawar" : "Bear";

  switch (eventType) {
    case "GIFT":
      return { giftName, kind: "gift", text: formatEventMessage(eventMessages.GIFT, { giftName }) };
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
      return { kind: "chat", text: randomFrom(messages) };
  }
}

function formatEventMessage(template: string, values: { giftName?: string }) {
  return template
    .replaceAll("{{giftName}}", values.giftName ?? "Gift")
    .replaceAll("{giftName}", values.giftName ?? "Gift");
}

function createPreviewSideAction(eventType: PreviewEventType, sequence: number): PreviewSideAction | undefined {
  if (eventType === "CHAT") {
    return undefined;
  }

  if (eventType === "GIFT") {
    const label = sequence % 2 === 0 ? "Mawar" : "Bear";

    return {
      count: ((sequence % 5) + 1) * 5,
      iconUrl: getPreviewGiftIcon(sequence),
      kind: "GIFT",
      label
    };
  }

  if (eventType === "LIKE") {
    return { count: ((sequence % 8) + 1) * 10, kind: "LIKE", label: "Like" };
  }

  if (eventType === "FOLLOW") {
    return { count: 1, kind: "FOLLOW", label: "Follow" };
  }

  if (eventType === "JOIN") {
    return { count: 1, kind: "JOIN", label: "Join" };
  }

  if (eventType === "SHARE") {
    return { count: ((sequence % 4) + 1) * 2, kind: "SHARE", label: "Share" };
  }

  return { count: 1, kind: "ABSENT", label: "Absent" };
}

function getPreviewBadgeForEvent(eventType: PreviewEventType, badges: string[]) {
  if (eventType === "GIFT") return "GIFT";
  if (eventType === "LIKE") return "LIKE";
  if (eventType === "FOLLOW") return "FOLLOW";
  if (eventType === "JOIN") return "JOIN";
  if (eventType === "SHARE") return "SHARE";
  if (eventType === "ABSENT") return "ABSEN";
  return randomFrom(badges);
}

function getPreviewGiftIcon(sequence: number) {
  const icons = [
    "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/802a21ae29f9fae5abe3693de9f874bd.png~tplv-obj.image",
    "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a0d9208a140d8f4a82e6472f6f32.png~tplv-obj.image"
  ];

  return icons[sequence % icons.length] ?? icons[0];
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function createInitialFromUsername(username: string) {
  return username.replace(/^@+/, "").trim().charAt(0).toUpperCase() || "L";
}

function shufflePreviewDelays(delays: number[]) {
  for (let index = delays.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [delays[index], delays[swapIndex]] = [delays[swapIndex], delays[index]];
  }

  return delays;
}

function GamingFrameDecoration({ theme }: { theme: ChatOverlayTheme }) {
  return (
    <>
      <span aria-hidden="true" style={getGamingGlowStyle(theme)} />
      <span aria-hidden="true" style={getGamingBorderStyle(theme)} />
    </>
  );
}

function getGamingBorderStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    animation: "themeGamingNeonBorder 3.8s linear infinite",
    background: `linear-gradient(90deg, ${theme.preview.accent2}, ${theme.preview.accent}, #facc15, #38bdf8, ${theme.preview.accent2})`,
    backgroundSize: "260% 100%",
    borderRadius: theme.preview.radius + 3,
    inset: -2,
    opacity: 0.98,
    padding: 2,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -1,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude"
  };
}

function getGamingGlowStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background: `linear-gradient(90deg, ${withAlpha(theme.preview.accent2, 0.34)}, ${withAlpha(theme.preview.accent, 0.32)}, rgba(250,204,21,.22))`,
    borderRadius: theme.preview.radius + 10,
    filter: "blur(14px)",
    inset: -8,
    opacity: 0.72,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -2
  };
}

function GlitchFrameDecoration({ theme }: { theme: ChatOverlayTheme }) {
  return (
    <>
      <span aria-hidden="true" style={getGlitchOuterStyle(theme)} />
      <span aria-hidden="true" style={getGlitchCrashStyle(theme)} />
      <span aria-hidden="true" style={getGlitchShardStyle(theme, "one")} />
      <span aria-hidden="true" style={getGlitchShardStyle(theme, "two")} />
      <span aria-hidden="true" style={getGlitchShardStyle(theme, "three")} />
    </>
  );
}

function getGlitchOuterStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background:
      `linear-gradient(90deg, ${theme.preview.glow} 0 18%, transparent 18% 23%, ${theme.preview.accent} 23% 42%, transparent 42% 48%, ${theme.preview.accent2} 48% 66%, transparent 66% 70%, #ffe600 70% 84%, transparent 84% 88%, ${theme.preview.glow} 88%), repeating-linear-gradient(135deg, transparent 0 7px, rgba(255,255,255,.95) 7px 9px, transparent 9px 15px)`,
    backgroundBlendMode: "screen",
    borderRadius: theme.preview.radius + 7,
    clipPath: "polygon(0 16%, 6% 8%, 10% 0, 18% 10%, 25% 0, 34% 12%, 43% 2%, 51% 15%, 62% 0, 70% 11%, 82% 2%, 92% 13%, 100% 8%, 94% 28%, 100% 42%, 92% 54%, 100% 70%, 88% 84%, 94% 100%, 76% 92%, 66% 100%, 54% 88%, 43% 100%, 30% 90%, 18% 100%, 10% 86%, 0 92%, 7% 70%, 0 58%, 8% 43%, 0 31%)",
    inset: -7,
    opacity: 0.98,
    padding: 5,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -1,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude"
  };
}

function getGlitchCrashStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background:
      `linear-gradient(90deg, ${withAlpha(theme.preview.glow, 0.7)}, transparent 24%), linear-gradient(270deg, ${withAlpha(theme.preview.accent, 0.68)}, transparent 30%), linear-gradient(135deg, transparent 18%, ${withAlpha(theme.preview.accent2, 0.7)} 18% 24%, transparent 24% 56%, rgba(255,230,0,.72) 56% 61%, transparent 61%)`,
    borderRadius: theme.preview.radius + 12,
    clipPath: "polygon(0 8%, 100% 0, 96% 42%, 6% 34%, 0 100%, 100% 78%, 100% 100%, 0 100%)",
    filter: "blur(.2px)",
    inset: -13,
    opacity: 0.78,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -2
  };
}

function getGlitchShardStyle(theme: ChatOverlayTheme, shard: "one" | "two" | "three"): CSSProperties {
  const shared: CSSProperties = {
    borderRadius: 2,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -1
  };

  if (shard === "one") {
    return {
      ...shared,
      background: theme.preview.glow,
      boxShadow: `72px 38px 0 ${theme.preview.accent}, 154px -7px 0 ${theme.preview.accent2}`,
      height: 5,
      left: -18,
      top: 7,
      width: 52
    };
  }

  if (shard === "two") {
    return {
      ...shared,
      background: theme.preview.accent,
      bottom: 8,
      boxShadow: `92px -42px 0 #ffe600, 182px 2px 0 ${theme.preview.glow}`,
      height: 6,
      right: -20,
      width: 62
    };
  }

  return {
    ...shared,
    background: theme.preview.accent2,
    bottom: -12,
    boxShadow: `108px -58px 0 ${theme.preview.glow}, 236px -21px 0 ${theme.preview.accent}`,
    height: 4,
    left: 18,
    width: 78
  };
}

function RgbGlitchFrameDecoration({ theme }: { theme: ChatOverlayTheme }) {
  return (
    <>
      <span aria-hidden="true" style={getRgbGlitchBorderStyle(theme)} />
      <span aria-hidden="true" style={getRgbGlitchGlowStyle(theme)} />
    </>
  );
}

function getRgbGlitchBorderStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background: `linear-gradient(90deg, ${theme.preview.border} 0 20%, ${theme.preview.accent} 34% 58%, ${theme.preview.accent2} 78% 100%)`,
    borderRadius: theme.preview.radius + 2,
    inset: -2,
    opacity: 0.98,
    padding: 1.5,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -1,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude"
  };
}

function getRgbGlitchGlowStyle(theme: ChatOverlayTheme): CSSProperties {
  return {
    background:
      `linear-gradient(90deg, ${theme.preview.border}, ${theme.preview.border}), linear-gradient(90deg, ${theme.preview.accent}, ${theme.preview.accent}), linear-gradient(90deg, ${theme.preview.accent2}, ${theme.preview.accent2}), linear-gradient(90deg, ${withAlpha(theme.preview.border, 0.16)}, transparent 42%), linear-gradient(270deg, ${withAlpha(theme.preview.accent, 0.14)}, transparent 40%)`,
    backgroundPosition: "14px 0, calc(100% - 82px) 0, calc(100% - 18px) calc(100% - 2px), 0 0, 100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundSize: "42px 2px, 56px 2px, 36px 2px, 120px 100%, 120px 100%",
    borderRadius: theme.preview.radius + 8,
    inset: -6,
    opacity: 0.72,
    pointerEvents: "none",
    position: "absolute",
    zIndex: -2
  };
}

function PixelCornerDecoration({ theme }: { theme: ChatOverlayTheme }) {
  return (
    <>
      <span aria-hidden="true" style={getPixelShadowStyle(theme, "back")} />
      <span aria-hidden="true" style={getPixelShadowStyle(theme, "front")} />
    </>
  );
}

function getPixelShadowStyle(theme: ChatOverlayTheme, layer: "back" | "front"): CSSProperties {
  return {
    border: `2px solid ${layer === "front" ? theme.preview.border : "#ffffff"}`,
    inset: layer === "front" ? -5 : 5,
    opacity: layer === "front" ? 0.9 : 0.5,
    pointerEvents: "none",
    position: "absolute",
    zIndex: layer === "front" ? 1 : 0
  };
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) {
    return color;
  }

  if (color === "transparent") {
    return `rgba(255,255,255,${alpha})`;
  }

  const normalized = color.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized.slice(0, 6);

  if (!/^[\da-f]{6}$/i.test(value)) {
    return color;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}
