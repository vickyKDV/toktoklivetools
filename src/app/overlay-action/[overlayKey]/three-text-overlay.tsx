"use client";

import type { CSSProperties } from "react";
import type { OverlayEventPayload } from "@/types/live";

type ThreeTextOverlayProps = {
  action: OverlayEventPayload;
  title: string;
  subtitle: string;
  fit?: "viewport" | "container";
};

type TextEffect = "neon" | "gold" | "hologram" | "glitch" | "bubble" | "cyber" | "fire";

export function ThreeTextOverlay({ action, title, subtitle, fit = "viewport" }: ThreeTextOverlayProps) {
  const size = normalizeNumber(action.animationSize, 560);
  const color = normalizeColor(action.text3dColor, "#f8fafc");
  const accentColor = normalizeColor(action.text3dAccentColor, "#22d3ee");
  const effect = normalizeTextEffect(action.text3dEffect);
  const titleSize = Math.max(42, Math.min(160, size * 0.16));
  const subtitleSize = Math.max(18, Math.min(58, titleSize * 0.32));
  const glow = Math.max(8, Math.min(36, normalizeNumber(action.text3dDepth, 0.22) * 90));
  const stroke = Math.max(0, Math.min(3, normalizeNumber(action.text3dBevel, 0.035) * 38));
  const effectStyle = getEffectStyle(effect, color, accentColor);
  const motionClass = action.text3dFloat === false ? "" : " overlay-css-text-float";
  const spinClass = action.text3dSpin === false ? "" : " overlay-css-text-sway";

  return (
    <div
      className={`overlay-css-text-root overlay-css-text-${fit}${motionClass}${spinClass}`}
      style={{
        "--overlay-text-color": color,
        "--overlay-accent-color": accentColor,
        "--overlay-title-size": `${titleSize}px`,
        "--overlay-subtitle-size": `${subtitleSize}px`,
        "--overlay-text-glow": `${glow}px`,
        "--overlay-text-stroke": `${stroke}px`
      } as CSSProperties}
    >
      <div className="overlay-css-text-wrap">
        <div className={`overlay-css-text-title overlay-css-text-${effect}`} style={effectStyle.title}>
          {title}
        </div>
        {subtitle ? (
          <div className={`overlay-css-text-subtitle overlay-css-text-${effect}`} style={effectStyle.subtitle}>
            {subtitle}
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .overlay-css-text-root {
          position: relative;
          display: grid;
          place-items: center;
          overflow: visible;
          pointer-events: none;
          contain: layout paint;
        }

        .overlay-css-text-viewport {
          width: 100vw;
          height: 100vh;
        }

        .overlay-css-text-container {
          width: 100%;
          height: 100%;
        }

        .overlay-css-text-wrap {
          display: grid;
          max-width: min(92vw, 1600px);
          justify-items: center;
          gap: 0.15em;
          padding: 6vh 5vw;
          text-align: center;
          overflow: visible;
          transform: translateZ(0);
          will-change: transform, filter;
        }

        .overlay-css-text-container .overlay-css-text-wrap {
          max-width: 100%;
          padding: 18px;
        }

        .overlay-css-text-title,
        .overlay-css-text-subtitle {
          max-width: 100%;
          overflow: visible;
          overflow-wrap: anywhere;
          text-wrap: balance;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 950;
          line-height: 0.95;
          letter-spacing: 0;
          color: var(--overlay-text-color);
          -webkit-text-stroke: var(--overlay-text-stroke) rgba(255, 255, 255, 0.85);
          paint-order: stroke fill;
        }

        .overlay-css-text-title {
          font-size: var(--overlay-title-size);
          text-transform: uppercase;
        }

        .overlay-css-text-subtitle {
          font-size: var(--overlay-subtitle-size);
          font-weight: 850;
          line-height: 1.12;
          color: var(--overlay-accent-color);
          opacity: 0.98;
        }

        .overlay-css-text-neon {
          text-shadow:
            0 0 8px rgba(255, 255, 255, 0.95),
            0 0 var(--overlay-text-glow) var(--overlay-accent-color),
            0 0 calc(var(--overlay-text-glow) * 2) var(--overlay-accent-color),
            0 9px 28px rgba(0, 0, 0, 0.45);
        }

        .overlay-css-text-gold {
          text-shadow:
            0 1px 0 #7c2d12,
            0 2px 0 #92400e,
            0 3px 0 #a16207,
            0 12px 26px rgba(0, 0, 0, 0.45),
            0 0 var(--overlay-text-glow) rgba(250, 204, 21, 0.9);
        }

        .overlay-css-text-hologram,
        .overlay-css-text-cyber {
          text-shadow:
            -2px 0 0 rgba(34, 211, 238, 0.85),
            2px 0 0 rgba(244, 63, 94, 0.75),
            0 0 var(--overlay-text-glow) var(--overlay-accent-color),
            0 14px 32px rgba(0, 0, 0, 0.45);
        }

        .overlay-css-text-glitch {
          animation: overlayCssTextGlitch 1.35s steps(2, end) infinite;
          text-shadow:
            -4px 0 0 #22d3ee,
            4px 0 0 #f43f5e,
            0 0 var(--overlay-text-glow) rgba(255, 255, 255, 0.8);
        }

        .overlay-css-text-bubble {
          text-shadow:
            0 4px 0 rgba(255, 255, 255, 0.55),
            0 10px 0 rgba(0, 0, 0, 0.15),
            0 18px 34px rgba(0, 0, 0, 0.4),
            0 0 var(--overlay-text-glow) var(--overlay-accent-color);
        }

        .overlay-css-text-fire {
          text-shadow:
            0 -2px 8px rgba(255, 255, 255, 0.9),
            0 0 12px #facc15,
            0 0 var(--overlay-text-glow) #fb923c,
            0 0 calc(var(--overlay-text-glow) * 2) #ef4444,
            0 18px 34px rgba(0, 0, 0, 0.45);
        }

        .overlay-css-text-float .overlay-css-text-wrap {
          animation: overlayCssTextFloat 2.8s ease-in-out infinite;
        }

        .overlay-css-text-sway .overlay-css-text-wrap {
          transform-origin: center center;
          animation:
            overlayCssTextFloat 2.8s ease-in-out infinite,
            overlayCssTextSway 3.2s ease-in-out infinite;
        }

        @keyframes overlayCssTextFloat {
          0%,
          100% {
            translate: 0 0;
            filter: saturate(1);
          }
          50% {
            translate: 0 -14px;
            filter: saturate(1.18);
          }
        }

        @keyframes overlayCssTextSway {
          0%,
          100% {
            rotate: -1.8deg;
            scale: 1;
          }
          50% {
            rotate: 1.8deg;
            scale: 1.025;
          }
        }

        @keyframes overlayCssTextGlitch {
          0%,
          100% {
            translate: 0 0;
            filter: hue-rotate(0deg);
          }
          12% {
            translate: -3px 1px;
            filter: hue-rotate(12deg);
          }
          24% {
            translate: 3px -1px;
            filter: hue-rotate(-18deg);
          }
          36% {
            translate: 0 0;
            filter: hue-rotate(0deg);
          }
        }

        @keyframes overlayCssGradientShift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 220% 50%;
          }
        }
      `}</style>
    </div>
  );
}

function getEffectStyle(effect: TextEffect, color: string, accentColor: string) {
  if (effect === "gold") {
    const gradient = "linear-gradient(180deg, #fff7ad 0%, #facc15 38%, #f97316 72%, #7c2d12 100%)";

    return {
      title: gradientText(gradient),
      subtitle: gradientText("linear-gradient(90deg, #fef3c7, #fde68a, #fb923c)")
    };
  }

  if (effect === "hologram") {
    const gradient = `linear-gradient(100deg, ${color}, ${accentColor}, #f0abfc, #67e8f9, ${color})`;

    return {
      title: gradientText(gradient, "overlayCssGradientShift 2.6s linear infinite"),
      subtitle: gradientText(`linear-gradient(90deg, ${accentColor}, #ffffff, #f0abfc)`)
    };
  }

  if (effect === "fire") {
    return {
      title: gradientText("linear-gradient(180deg, #fff7ed, #facc15 28%, #fb923c 52%, #ef4444 78%, #7f1d1d)"),
      subtitle: gradientText("linear-gradient(90deg, #fde68a, #fb923c, #ef4444)")
    };
  }

  if (effect === "cyber") {
    return {
      title: gradientText(`linear-gradient(90deg, ${accentColor}, #f8fafc, #f43f5e)`),
      subtitle: gradientText("linear-gradient(90deg, #22d3ee, #a78bfa, #f43f5e)")
    };
  }

  return {
    title: undefined,
    subtitle: undefined
  };
}

function gradientText(backgroundImage: string, animation?: string): CSSProperties {
  return {
    backgroundImage,
    backgroundSize: "220% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    animation
  };
}

function normalizeTextEffect(value: unknown): TextEffect {
  if (
    value === "gold" ||
    value === "hologram" ||
    value === "glitch" ||
    value === "bubble" ||
    value === "cyber" ||
    value === "fire"
  ) {
    return value;
  }

  return "neon";
}

function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value;
}
