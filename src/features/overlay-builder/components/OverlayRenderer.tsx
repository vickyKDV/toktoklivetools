"use client";

import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { componentRegistry } from "@/features/overlay-builder/registry/componentRegistry";
import type {
  OverlayComponentSchema,
  OverlayDesignSchema,
  OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";

type OverlayRendererProps = {
  designJson: OverlayDesignSchema;
  data: OverlayRenderData;
  debug?: boolean;
  className?: string;
  style?: CSSProperties;
  renderEditorOverlay?: (component: OverlayComponentSchema) => React.ReactNode;
  getComponentProps?: (component: OverlayComponentSchema) => React.HTMLAttributes<HTMLDivElement>;
  renderDropIndicator?: (component: OverlayComponentSchema) => React.ReactNode;
};

export function OverlayRenderer({
  designJson,
  data,
  debug = false,
  className,
  style,
  renderEditorOverlay,
  getComponentProps,
  renderDropIndicator
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
      {renderComponents(designJson.components, data, getComponentProps, renderEditorOverlay, renderDropIndicator)}

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
  renderDropIndicator?: (component: OverlayComponentSchema) => React.ReactNode
) {
  return [...(components ?? [])]
    .filter((component) => component.visible)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((component) => {
      const registryItem = componentRegistry[component.type];
      const props = getComponentProps?.(component) ?? {};

      return (
        <div
          {...props}
          key={component.id}
          data-overlay-component-id={component.id}
          data-overlay-component-type={component.type}
          className={props.className}
          style={{
            ...props.style,
            ...getComponentStyle(component),
            position: "absolute",
            left: component.x,
            top: component.y,
            width: component.width,
            height: component.height,
            transform: `rotate(${component.rotation ?? 0}deg)`,
            transformOrigin: "center center",
            zIndex: component.zIndex,
            boxSizing: "border-box"
          }}
        >
          <Fragment key={`${component.id}-content`}>
            {registryItem.render(component, data)}
          </Fragment>
          {component.children?.length ? (
            <Fragment key={`${component.id}-children`}>
              {renderComponents(component.children, data, getComponentProps, renderEditorOverlay, renderDropIndicator)}
            </Fragment>
          ) : null}
          <Fragment key={`${component.id}-drop-indicator`}>
            {renderDropIndicator?.(component)}
          </Fragment>
          <Fragment key={`${component.id}-editor-overlay`}>
            {renderEditorOverlay?.(component)}
          </Fragment>
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

function getCanvasStyle(design: OverlayDesignSchema): CSSProperties {
  const canvas = design.canvas;

  return {
    ...getBackgroundStyle(canvas.background),
    borderRadius: canvas.radius,
    border: canvas.stroke.enabled ? `${canvas.stroke.width}px solid ${canvas.stroke.color}` : undefined,
    boxShadow: canvas.shadow.enabled
      ? `${canvas.shadow.x}px ${canvas.shadow.y}px ${canvas.shadow.blur}px ${canvas.shadow.color}`
      : undefined
  };
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
    borderRadius: style.radius,
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
