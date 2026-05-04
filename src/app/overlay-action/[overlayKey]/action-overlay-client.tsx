"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
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
  const [visibleAction, setVisibleAction] = useState<VisibleAction | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerStyle = useMemo(() => getPositionStyle(position), [position]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.emit("overlay:join", overlayKey);
    socket.on("connect", () => socket.emit("overlay:join", overlayKey));
    socket.on("overlay:event", (event: OverlayEventPayload) => {
      if (flowId && event.flowId !== flowId) {
        return;
      }

      if (event.action === "PLAY_SOUND") {
        playSound(event.soundUrl, event.volume, audioRef);
        return;
      }

      if (event.action === "SHOW_ANIMATION") {
        playSound(event.soundUrl, event.volume, audioRef);
        const durationMs = normalizeNumber(event.durationMs, 3000);
        setVisibleAction({
          ...event,
          expiresAt: Date.now() + durationMs
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [flowId, overlayKey]);

  useEffect(() => {
    if (!visibleAction) {
      return;
    }

    const delay = Math.max(0, visibleAction.expiresAt - Date.now());
    const timeout = window.setTimeout(() => setVisibleAction(null), delay);

    return () => window.clearTimeout(timeout);
  }, [visibleAction]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-transparent">
      <div className="absolute" style={containerStyle}>
        {visibleAction?.animationUrl ? <ActionMedia action={visibleAction} /> : null}
      </div>
      <audio ref={audioRef} />
    </main>
  );
}

function ActionMedia({ action }: { action: VisibleAction }) {
  const size = normalizeNumber(action.animationSize, 420);
  const url = action.animationUrl ?? "";
  const isVideo = /\.(mp4|webm|mov)$/i.test(url);

  if (isVideo) {
    return (
      <video
        src={url}
        autoPlay
        muted={false}
        playsInline
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  // OBS animation assets can be workspace uploads or remote URLs, so avoid Next image optimization here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
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
