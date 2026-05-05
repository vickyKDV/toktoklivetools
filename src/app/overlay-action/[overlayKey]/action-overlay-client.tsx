"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createRealtimeSocket } from "@/lib/realtime/client";
import { ThreeTextOverlay } from "@/app/overlay-action/[overlayKey]/three-text-overlay";
import type { OverlayEventPayload } from "@/types/live";

type ActionOverlayClientProps = {
  overlayKey: string;
  flowId?: string;
  position: string;
};

type VisibleAction = OverlayEventPayload & {
  expiresAt: number;
};

export function ActionOverlayClient({ overlayKey, flowId, position }: ActionOverlayClientProps) {
  const [mediaAction, setMediaAction] = useState<VisibleAction | null>(null);
  const [textAction, setTextAction] = useState<VisibleAction | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const pollCursorRef = useRef(Date.now());
  const confettiTimersRef = useRef<number[]>([]);

  const handleActionEvent = useCallback((event: OverlayEventPayload) => {
    if (processedEventIdsRef.current.has(event.id)) {
      return;
    }

    if (flowId && event.flowId !== flowId && event.testMode !== true) {
      return;
    }

    processedEventIdsRef.current.add(event.id);

    if (event.action === "PLAY_SOUND") {
      playSound(event.soundUrl, event.volume, audioRef);
      return;
    }

    if (event.action === "SHOW_CONFETTI") {
      runConfettiAction(event, confettiTimersRef);
      return;
    }

    if (event.action === "SHOW_ANIMATION" || event.action === "SHOW_3D_TEXT") {
      playSound(event.soundUrl, event.volume, audioRef);
      const durationMs = normalizeNumber(event.durationMs, 3000);
      const visibleAction = {
        ...event,
        expiresAt: Date.now() + durationMs
      };

      if (event.action === "SHOW_3D_TEXT") {
        setTextAction(visibleAction);
        return;
      }

      setMediaAction(visibleAction);
    }
  }, [flowId]);

  useEffect(() => {
    void import("@lottiefiles/dotlottie-wc");
  }, []);

  useEffect(() => {
    const socket: Socket = createRealtimeSocket();

    socket.emit("overlay:join", overlayKey);
    socket.on("connect", () => socket.emit("overlay:join", overlayKey));
    socket.on("overlay:event", handleActionEvent);

    return () => {
      socket.disconnect();
    };
  }, [handleActionEvent, overlayKey]);

  useEffect(() => {
    let disposed = false;

    async function pollTestEvents() {
      try {
        const response = await fetch(
          `/api/action-test-events/${overlayKey}?since=${pollCursorRef.current}`,
          { cache: "no-store" }
        );
        const data = await response.json() as {
          ok?: boolean;
          cursor?: number;
          events?: OverlayEventPayload[];
        };

        if (disposed || !data.ok) {
          return;
        }

        if (typeof data.cursor === "number") {
          pollCursorRef.current = Math.max(pollCursorRef.current, data.cursor);
        }

        for (const event of data.events ?? []) {
          handleActionEvent(event);
        }
      } catch {
        // Socket is still the primary realtime path; polling only keeps local test trigger reliable.
      }
    }

    const interval = window.setInterval(() => {
      void pollTestEvents();
    }, 500);

    void pollTestEvents();

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [handleActionEvent, overlayKey]);

  useEffect(() => {
    const timersRef = confettiTimersRef;

    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-transparent">
      {textAction ? (
        <ActionLayer
          key={`text-${textAction.id}`}
          action={textAction}
          fallbackPosition={position}
          onClose={() => setTextAction(null)}
        />
      ) : null}
      {mediaAction ? (
        <ActionLayer
          key={`media-${mediaAction.id}`}
          action={mediaAction}
          fallbackPosition={position}
          onClose={() => setMediaAction(null)}
        />
      ) : null}
      <audio ref={audioRef} />
    </main>
  );
}

function ActionLayer({
  action,
  fallbackPosition,
  onClose
}: {
  action: VisibleAction;
  fallbackPosition: string;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const closingRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const containerStyle = useMemo(
    () => action.action === "SHOW_3D_TEXT" || action.mediaFrame === "fullscreen"
      ? { left: 0, top: 0, width: "100vw", height: "100vh" }
      : getPositionStyle(action.animationPosition || fallbackPosition),
    [action.action, action.animationPosition, action.mediaFrame, fallbackPosition]
  );

  const closeLayer = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    setIsVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      onClose();
    }, 520);
  }, [onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true));
    });

    return () => {
      window.cancelAnimationFrame(frame);

      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shouldWaitForVideoEnd =
      action.action === "SHOW_ANIMATION" &&
      action.useMediaDuration === true &&
      isVideoUrl(action.animationUrl);

    if (shouldWaitForVideoEnd) {
      return;
    }

    const delay = Math.max(0, action.expiresAt - Date.now());
    const timeout = window.setTimeout(closeLayer, delay);

    return () => window.clearTimeout(timeout);
  }, [action, closeLayer]);

  return (
    <div
      className="absolute transition-all duration-500 ease-out"
      style={{
        ...containerStyle,
        zIndex: getActionLayerZIndex(action),
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? "blur(0px)" : "blur(8px)",
        scale: isVisible ? "1" : "0.96",
        pointerEvents: "none"
      }}
    >
      <ActionContent action={action} onMediaEnd={closeLayer} />
    </div>
  );
}

function getActionLayerZIndex(action: OverlayEventPayload) {
  if (action.actionLayer === "back") {
    return 10;
  }

  return 30;
}

function ActionContent({ action, onMediaEnd }: { action: VisibleAction; onMediaEnd: () => void }) {
  if (action.action === "SHOW_3D_TEXT") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          transform: `translate(${normalizeNumber(action.text3dOffsetX, 0)}px, ${normalizeNumber(action.text3dOffsetY, 0)}px)`
        }}
      >
        <ThreeTextOverlay
          action={action}
          title={resolveActionText(action.text3dTemplate || "Terima kasih {{displayName}}!", action)}
          subtitle={resolveActionText(action.text3dSubtitle || "{{giftName}} x{{giftCount}}", action)}
        />
      </div>
    );
  }

  return action.animationUrl ? <ActionMedia action={action} onMediaEnd={onMediaEnd} /> : null;
}

function ActionMedia({ action, onMediaEnd }: { action: VisibleAction; onMediaEnd: () => void }) {
  const url = action.animationUrl ?? "";
  const isVideo = isVideoUrl(url);
  const isLottie = /\.(json|lottie)(?:$|[?#])/i.test(url);
  const fit = normalizeAnimationFit(action.animationFit);
  const { width, height } = getActionMediaSize(action);
  const mediaStyle = {
    width,
    height,
    objectFit: fit
  } satisfies React.CSSProperties;

  if (isVideo) {
    return (
      <video
        src={url}
        autoPlay
        muted={false}
        playsInline
        onEnded={action.useMediaDuration === true ? onMediaEnd : undefined}
        style={mediaStyle}
      />
    );
  }

  if (isLottie) {
    return createElement("dotlottie-wc", {
      src: url,
      autoplay: true,
      loop: true,
      style: {
        display: "block",
        width,
        height
      }
    });
  }

  // OBS animation assets can be workspace uploads or remote URLs, so avoid Next image optimization here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={mediaStyle} />;
}

function getActionMediaSize(action: OverlayEventPayload) {
  const fallbackSize = normalizeNumber(action.animationSize, 420);
  const frame = action.mediaFrame;

  if (frame === "fullscreen") {
    return { width: "100vw", height: "100vh" };
  }

  if (frame === "portrait") {
    return { width: 1080, height: 1920 };
  }

  if (frame === "landscape") {
    return { width: 1920, height: 1080 };
  }

  if (frame === "obsDefault") {
    return { width: 800, height: 600 };
  }

  if (frame === "custom") {
    return {
      width: normalizeNumber(action.mediaWidth, fallbackSize),
      height: normalizeNumber(action.mediaHeight, fallbackSize)
    };
  }

  return {
    width: normalizeNumber(action.mediaWidth, fallbackSize),
    height: normalizeNumber(action.mediaHeight, fallbackSize)
  };
}

function runConfettiAction(action: OverlayEventPayload, timersRef: React.MutableRefObject<number[]>) {
  void import("canvas-confetti").then(({ default: confetti }) => {
    const durationMs = normalizeNumber(action.confettiDurationMs, 4500);
    const intervalMs = normalizeNumber(action.confettiIntervalMs, 900);
    const endAt = Date.now() + durationMs;
    const presets = Array.isArray(action.confettiPresets) && action.confettiPresets.length
      ? action.confettiPresets
      : ["basicCannon"];
    const zIndex = action.confettiLayer === "back" ? 0 : 2147483647;
    const base = {
      particleCount: normalizeNumber(action.confettiParticleCount, 140),
      spread: normalizeNumber(action.confettiSpread, 85),
      startVelocity: normalizeNumber(action.confettiStartVelocity, 45),
      scalar: normalizeNumber(action.confettiScalar, 1),
      zIndex,
      origin: {
        x: 0.5,
        y: normalizeNumber(action.confettiOriginY, 0.55)
      },
      colors: ["#22d3ee", "#f8fafc", "#f43f5e", "#facc15", "#34d399"]
    };
    const runSelectedPresets = () => {
      for (const preset of presets) {
        fireConfettiPreset(confetti, preset, base, String(action.confettiEmoji ?? "🎁"));
      }
    };

    runSelectedPresets();

    if (action.confettiMode === "repeat" || action.confettiMode === "repeatUntilOverlayEnd") {
      const interval = window.setInterval(() => {
        if (Date.now() >= endAt) {
          window.clearInterval(interval);
          timersRef.current = timersRef.current.filter((timer) => timer !== interval);
          return;
        }

        runSelectedPresets();
      }, intervalMs);
      timersRef.current.push(interval);
    }
  });
}

type CanvasConfetti = typeof import("canvas-confetti");
type ConfettiOptions = NonNullable<Parameters<CanvasConfetti>[0]>;

function fireConfettiPreset(confetti: CanvasConfetti, preset: string, base: ConfettiOptions, emoji: string) {
  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  switch (preset) {
    case "randomDirection":
      void confetti({
        ...base,
        angle: randomInRange(45, 135),
        origin: { x: Math.random(), y: randomInRange(0.35, 0.75) }
      });
      return;
    case "realisticLook":
      void confetti({ ...base, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, decay: 0.92 });
      void confetti({ ...base, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, decay: 0.92 });
      return;
    case "fireworks":
      for (let index = 0; index < 4; index += 1) {
        window.setTimeout(() => {
          void confetti({
            ...base,
            particleCount: Math.max(35, Math.round(normalizeNumber(base.particleCount, 140) / 2)),
            spread: 360,
            startVelocity: randomInRange(25, 55),
            origin: { x: Math.random(), y: Math.random() * 0.45 }
          });
        }, index * 180);
      }
      return;
    case "stars":
      void confetti({ ...base, shapes: ["star"], scalar: normalizeNumber(base.scalar, 1) * 1.15 });
      return;
    case "snow":
      void confetti({
        ...base,
        particleCount: Math.max(60, Math.round(normalizeNumber(base.particleCount, 140) * 0.6)),
        startVelocity: 0,
        spread: 120,
        gravity: 0.35,
        drift: randomInRange(-0.7, 0.7),
        ticks: 260,
        scalar: normalizeNumber(base.scalar, 1) * 0.75,
        origin: { x: Math.random(), y: -0.1 },
        colors: ["#ffffff", "#dbeafe", "#bae6fd"]
      });
      return;
    case "schoolPride":
      void confetti({ ...base, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#2563eb", "#facc15"] });
      void confetti({ ...base, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#2563eb", "#facc15"] });
      return;
    case "customShapes":
      void confetti({ ...base, shapes: ["circle", "square", "star"] });
      return;
    case "emoji":
      void confetti({
        ...base,
        shapes: [confetti.shapeFromText({ text: emoji || "🎁", scalar: normalizeNumber(base.scalar, 1.8) })],
        scalar: normalizeNumber(base.scalar, 1) * 1.8
      });
      return;
    default:
      void confetti(base);
  }
}

function playSound(url: unknown, volume: unknown, audioRef: React.RefObject<HTMLAudioElement | null>) {
  if (typeof url !== "string" || !url.trim() || !audioRef.current) {
    return;
  }

  audioRef.current.src = url;
  audioRef.current.volume = Math.max(0, Math.min(1, normalizeNumber(volume, 1)));
  void audioRef.current.play().catch(() => undefined);
}

function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeAnimationFit(value: unknown): React.CSSProperties["objectFit"] {
  if (value === "cover") {
    return "cover";
  }

  if (value === "fill") {
    return "fill";
  }

  return "contain";
}

function isVideoUrl(value: unknown) {
  return typeof value === "string" && /\.(mp4|webm|mov)(?:$|[?#])/i.test(value);
}

function resolveActionText(template: string, action: OverlayEventPayload) {
  const values: Record<string, string> = {
    displayName: action.displayName || action.username || "Viewer",
    username: action.username || "viewer",
    giftName: action.giftName || "Gift",
    giftCount: String(action.giftCount ?? 1),
    comment: action.comment || ""
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

function getPositionStyle(position: string): React.CSSProperties {
  switch (position) {
    case "top":
      return { left: "50%", top: 48, transform: "translateX(-50%)" };
    case "bottom":
      return { left: "50%", bottom: 48, transform: "translateX(-50%)" };
    case "left":
      return { left: 48, top: "50%", transform: "translateY(-50%)" };
    case "right":
      return { right: 48, top: "50%", transform: "translateY(-50%)" };
    default:
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }
}
