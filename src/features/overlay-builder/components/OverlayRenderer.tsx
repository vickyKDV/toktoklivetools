"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { componentRegistry } from "@/features/overlay-builder/registry/componentRegistry";
import type {
  OverlayComponentSchema,
  OverlayDesignSchema,
  OverlayRenderData
} from "@/core/overlay/schema";
import { getRuntimeComponentHeight } from "@/core/overlay/runtimeLayout";

type OverlayRendererProps = {
  designJson: OverlayDesignSchema;
  data: OverlayRenderData;
  debug?: boolean;
  className?: string;
  style?: CSSProperties;
  renderEditorOverlay?: (component: OverlayComponentSchema) => React.ReactNode;
  getComponentProps?: (component: OverlayComponentSchema) => React.HTMLAttributes<HTMLDivElement>;
  renderDropIndicator?: (component: OverlayComponentSchema) => React.ReactNode;
  enableRuntimeLayout?: boolean;
};

export function OverlayRenderer({
  designJson,
  data,
  debug = false,
  className,
  style,
  renderEditorOverlay,
  getComponentProps,
  renderDropIndicator,
  enableRuntimeLayout = true
}: OverlayRendererProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: designJson.canvas.width,
        height: designJson.canvas.height,
        overflow: "visible",
        boxSizing: "border-box",
        ...getCanvasStyle(designJson),
        ...style
      }}
    >
      {renderEffectLayer(designJson.canvas.animation, getCanvasRadiusStyle(designJson), "canvas", "canvas-effect")}
      {renderComponents(designJson.components, data, getComponentProps, renderEditorOverlay, renderDropIndicator, enableRuntimeLayout, "root")}
      <style dangerouslySetInnerHTML={{ __html: overlayEffectCss }} />

      {debug ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-[9998] border border-fuchsia-500" />
          <DebugViewport width={designJson.canvas.width} height={designJson.canvas.height} />
        </>
      ) : null}
    </div>
  );
}

function renderComponents(
  components: OverlayComponentSchema[] | undefined,
  data: OverlayRenderData,
  getComponentProps?: (component: OverlayComponentSchema) => React.HTMLAttributes<HTMLDivElement>,
  renderEditorOverlay?: (component: OverlayComponentSchema) => React.ReactNode,
  renderDropIndicator?: (component: OverlayComponentSchema) => React.ReactNode,
  enableRuntimeLayout = true,
  keyPath = "root"
) {
  const occurrenceById = new Map<string, number>();

  return [...(components ?? [])]
    .filter((component) => component.visible && !component.hidden)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((component, index) => {
      const registryItem = componentRegistry[component.type];
      const props = getComponentProps?.(component) ?? {};
      const runtimeHeight = enableRuntimeLayout ? getRuntimeComponentHeight(component, data) : component.height;
      const occurrence = occurrenceById.get(component.id) ?? 0;
      occurrenceById.set(component.id, occurrence + 1);
      const renderKey = `${keyPath}-${index}-${occurrence}-${component.id}`;

      return (
        <div
          key={renderKey}
          {...props}
          data-overlay-component-id={component.id}
          data-overlay-component-type={component.type}
          className={props.className}
          style={{
            ...props.style,
            position: "absolute",
            left: component.x,
            top: component.y,
            width: component.width,
            height: runtimeHeight,
            minHeight: component.height,
            transform: `rotate(${component.rotation ?? 0}deg)`,
            transformOrigin: "center center",
            zIndex: component.zIndex,
            boxSizing: "border-box",
            overflow: "visible",
            isolation: component.style.animation?.enabled ? "isolate" : undefined
          }}
        >
          {renderEffectLayer(component.style.animation, getComponentRadiusStyle(component), "component", `${renderKey}-effect`)}
          {renderBubbleTail(component, `${renderKey}-tail`)}
          <div
            style={{
              ...getComponentStyle(component),
              position: "relative",
              width: "100%",
              height: "100%",
              minHeight: component.height,
              boxSizing: "border-box",
              zIndex: 1
            }}
          >
            {registryItem.render(component, data)}
            {component.children?.length
              ? renderComponents(component.children, data, getComponentProps, renderEditorOverlay, renderDropIndicator, enableRuntimeLayout, renderKey)
              : null}
          </div>
          {renderDropIndicator?.(component)}
          {renderEditorOverlay?.(component)}
        </div>
      );
    });
}

function DebugViewport({ width, height }: { width: number; height: number }) {
  const [viewport, setViewport] = useState("0x0");

  useEffect(() => {
    function updateViewport() {
      setViewport(`${window.innerWidth}x${window.innerHeight}`);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-[9999] rounded bg-black/75 px-2 py-1 font-mono text-[11px] leading-tight text-white">
      <div>canvas: {width}x{height}</div>
      <div>viewport: {viewport}</div>
    </div>
  );
}

function renderBubbleTail(component: OverlayComponentSchema, key: string) {
  const tail = getBubbleTail(component);

  if (!tail?.enabled) {
    return null;
  }

  return (
    <span
      key={key}
      aria-hidden="true"
      data-overlay-bubble-tail="true"
      style={getBubbleTailStyle(component, tail)}
    />
  );
}

function getBubbleTail(component: OverlayComponentSchema) {
  const tail = component.style.bubbleTail ?? component.props.bubbleTail;

  if (!tail || typeof tail !== "object") {
    return null;
  }

  const tailRecord = tail as {
    enabled?: unknown;
    side?: unknown;
    position?: unknown;
    size?: unknown;
  };
  const side = tailRecord.side === "right" ? "right" : "left";
  const position =
    tailRecord.position === "top" || tailRecord.position === "center" || tailRecord.position === "bottom"
      ? tailRecord.position
      : "bottom";
  const parsedSize = Number(tailRecord.size);

  return {
    enabled: tailRecord.enabled === true,
    side,
    position,
    size: Number.isFinite(parsedSize) ? Math.min(Math.max(parsedSize, 4), 120) : 22
  };
}

function getBubbleTailStyle(
  component: OverlayComponentSchema,
  tail: NonNullable<ReturnType<typeof getBubbleTail>>
): CSSProperties {
  const size = tail.size;
  const offset = Math.round(size * 0.54);
  const style: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    ...getBackgroundStyle(component.style.background, component.style.backgroundColor),
    opacity: component.style.opacity == null ? undefined : component.style.opacity / 100,
    pointerEvents: "none",
    zIndex: 0,
    boxSizing: "border-box"
  };

  if (tail.side === "left") {
    style.left = -offset;
    style.clipPath = "polygon(100% 0, 0 100%, 100% 100%)";
  } else {
    style.right = -offset;
    style.clipPath = "polygon(0 0, 0 100%, 100% 100%)";
  }

  if (tail.position === "top") {
    style.top = Math.max(0, Math.round(size * 0.35));
  } else if (tail.position === "center") {
    style.top = "50%";
    style.transform = "translateY(-50%)";
  } else {
    style.bottom = Math.max(0, Math.round(size * 0.2));
  }

  return style;
}

function getCanvasStyle(design: OverlayDesignSchema): CSSProperties {
  const canvas = design.canvas;

  return {
    ...getBackgroundStyle(canvas.background),
    ...getCanvasRadiusStyle(design),
    border: canvas.stroke.enabled ? `${canvas.stroke.width}px solid ${canvas.stroke.color}` : undefined,
    boxShadow: canvas.shadow.enabled
      ? `${canvas.shadow.x}px ${canvas.shadow.y}px ${canvas.shadow.blur}px ${canvas.shadow.color}`
      : undefined
  };
}

function renderEffectLayer(
  animation: OverlayComponentSchema["style"]["animation"] | OverlayDesignSchema["canvas"]["animation"] | undefined,
  radiusStyle: CSSProperties,
  scope: "canvas" | "component",
  key: string
) {
  if (!animation?.enabled || animation.type === "none") {
    return null;
  }

  return (
    <span
      key={key}
      aria-hidden="true"
      data-overlay-effect={animation.type}
      style={getEffectLayerStyle(animation, radiusStyle, scope)}
    />
  );
}

function getComponentStyle(component: OverlayComponentSchema): CSSProperties {
  const style = component.style;
  const border = style.border?.enabled ? `${style.border.width}px solid ${style.border.color}` : undefined;
  const shadowColor = style.shadow?.opacity == null ? style.shadow?.color : withOpacity(style.shadow.color, style.shadow.opacity);
  const shadow = style.shadow?.enabled ? `${style.shadow.x}px ${style.shadow.y}px ${style.shadow.blur}px ${shadowColor}` : undefined;
  const clipContent = component.props.clipContent === true;
  const overflow = clipContent ? "hidden" : style.overflow ?? "hidden";

  return {
    ...getBackgroundStyle(style.background, style.backgroundColor),
    ...getComponentRadiusStyle(component),
    opacity: style.opacity == null ? undefined : style.opacity / 100,
    border,
    boxShadow: shadow,
    filter: style.blur ? `blur(${style.blur}px)` : undefined,
    backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    textAlign: style.align,
    lineHeight: style.lineHeight,
    overflow
  };
}

function getEffectLayerStyle(
  animation: NonNullable<OverlayComponentSchema["style"]["animation"]>,
  radiusStyle: CSSProperties,
  scope: "canvas" | "component"
): CSSProperties {
  const color = animation.color ?? "#22d3ee";
  const color2 = animation.color2 ?? "#f43f5e";
  const intensity = Math.min(Math.max(animation.intensity ?? 70, 0), 100);
  const duration = `${animation.durationMs ?? 2400}ms`;
  const glow = Math.round(8 + intensity * 0.28);
  const borderWidth = Math.max(2, Math.round(1 + intensity / 30));
  const base: CSSProperties = {
    position: "absolute",
    inset: scope === "canvas" ? 0 : -borderWidth,
    ...radiusStyle,
    pointerEvents: "none",
    zIndex: 2,
    boxSizing: "border-box",
    backfaceVisibility: "hidden",
    willChange: "opacity, transform, box-shadow, filter"
  };

  if (animation.type === "rotate_neon") {
    return {
      ...base,
      "--overlay-effect-angle": "0deg",
      padding: borderWidth,
      backgroundColor: "transparent",
      backgroundImage: `conic-gradient(from var(--overlay-effect-angle), transparent 0deg, ${color} 70deg, ${color2} 150deg, transparent 260deg, ${color} 360deg)`,
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      filter: `drop-shadow(0 0 ${Math.round(glow * 0.75)}px ${color})`,
      willChange: "opacity, background-image, filter",
      animation: `overlayEffectConicSpin ${duration} linear infinite`
    } as CSSProperties;
  }

  if (animation.type === "gradient_shift") {
    return {
      ...base,
      opacity: Math.max(0.18, intensity / 180),
      backgroundColor: "transparent",
      backgroundImage: `linear-gradient(115deg, transparent 0%, ${color}55 32%, ${color2}66 50%, transparent 68%)`,
      backgroundSize: "220% 220%",
      mixBlendMode: "screen",
      animation: `overlayEffectGradient ${duration} ease-in-out infinite`
    };
  }

  const shadow = `0 0 ${glow}px ${color}, 0 0 ${glow * 2}px ${color2}`;

  if (animation.type === "pulse") {
    return {
      ...base,
      border: `${borderWidth}px solid ${color}`,
      boxShadow: shadow,
      animation: `overlayEffectPulse ${duration} ease-in-out infinite`
    };
  }

  if (animation.type === "neon") {
    return {
      ...base,
      border: `${borderWidth}px solid ${color}`,
      boxShadow: shadow,
      animation: `overlayEffectNeon ${duration} ease-in-out infinite`
    };
  }

  if (animation.type === "float") {
    return {
      ...base,
      inset: 0,
      border: `${borderWidth}px solid ${color}`,
      boxShadow: shadow,
      animation: `overlayEffectFloat ${duration} ease-in-out infinite`
    };
  }

  return {
    ...base,
    border: `${borderWidth}px solid ${color}`,
    boxShadow: shadow,
    opacity: Math.max(0.3, intensity / 100)
  };
}

function getCanvasRadiusStyle(design: OverlayDesignSchema): CSSProperties {
  const canvas = design.canvas;

  return getRadiusStyle({
    radius: canvas.radius,
    radiusTopLeft: canvas.radiusTopLeft,
    radiusTopRight: canvas.radiusTopRight,
    radiusBottomRight: canvas.radiusBottomRight,
    radiusBottomLeft: canvas.radiusBottomLeft
  });
}

function getComponentRadiusStyle(component: OverlayComponentSchema): CSSProperties {
  return getRadiusStyle(component.style);
}

function getRadiusStyle(source: {
  radius?: number;
  radiusTopLeft?: number;
  radiusTopRight?: number;
  radiusBottomRight?: number;
  radiusBottomLeft?: number;
}): CSSProperties {
  const radius = source.radius;

  return {
    borderRadius: radius,
    borderTopLeftRadius: source.radiusTopLeft ?? radius,
    borderTopRightRadius: source.radiusTopRight ?? radius,
    borderBottomRightRadius: source.radiusBottomRight ?? radius,
    borderBottomLeftRadius: source.radiusBottomLeft ?? radius
  };
}

const overlayEffectCss = `
@property --overlay-effect-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
@keyframes overlayEffectConicSpin {
  from { --overlay-effect-angle: 0deg; }
  to { --overlay-effect-angle: 360deg; }
}
@keyframes overlayEffectPulse {
  0%, 100% { opacity: .45; transform: scale(1); filter: saturate(1); }
  50% { opacity: 1; transform: scale(1.012); filter: saturate(1.45); }
}
@keyframes overlayEffectNeon {
  0%, 100% { opacity: .64; filter: brightness(1); }
  45% { opacity: 1; filter: brightness(1.4); }
  55% { opacity: .78; filter: brightness(1.1); }
}
@keyframes overlayEffectGradient {
  0%, 100% { background-position: 0% 50%; opacity: .2; }
  50% { background-position: 100% 50%; opacity: .75; }
}
@keyframes overlayEffectFloat {
  0%, 100% { transform: translate3d(0, 0, 0); opacity: .55; }
  50% { transform: translate3d(0, -4px, 0); opacity: 1; }
}
`;

function getBackgroundStyle(
  background: OverlayComponentSchema["style"]["background"] | OverlayDesignSchema["canvas"]["background"] | undefined,
  fallbackColor?: string
): CSSProperties {
  if (!background) {
    return {
      backgroundColor: fallbackColor,
      backgroundImage: "none"
    };
  }

  if (background.type === "transparent") {
    return {
      backgroundColor: "transparent",
      backgroundImage: "none"
    };
  }

  if (background.type === "gradient") {
    return {
      backgroundColor: "transparent",
      backgroundImage: `linear-gradient(${background.angle ?? 135}deg, ${withOpacity(background.from ?? background.color, background.opacity)}, ${withOpacity(background.to ?? background.color, background.opacity)})`
    };
  }

  if (background.type === "glass") {
    return {
      backgroundColor: withOpacity(background.color, background.opacity),
      backgroundImage: "none"
    };
  }

  return {
    backgroundColor: withOpacity(background.color, background.opacity),
    backgroundImage: "none"
  };
}

function withOpacity(color: string, opacity: number) {
  if (color === "transparent") {
    return "transparent";
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const alpha = Math.round((Math.min(Math.max(opacity, 0), 100) / 100) * 255).toString(16).padStart(2, "0");
    return `${color}${alpha}`;
  }

  return color;
}
