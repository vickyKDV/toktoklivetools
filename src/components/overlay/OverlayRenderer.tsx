"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { overlayDesignElementKeys, overlayDesignFontStack } from "@/lib/overlay-designs";
import type { OverlayCustomDesign, OverlayDesignElement, OverlayDesignElementKey } from "@/types/live";

export type OverlayRendererCanvas = {
  width: number;
  height: number;
  background: string;
  css?: string;
};

export type OverlayRendererElement = OverlayDesignElement & {
  rotation?: number;
  zIndex?: number;
};

export type OverlayRendererSchema = {
  canvas: OverlayRendererCanvas;
  elements: Record<OverlayDesignElementKey, OverlayRendererElement>;
};

type OverlayRendererProps = {
  schema: OverlayRendererSchema;
  className?: string;
  style?: CSSProperties;
  debug?: boolean;
  elementClassName?: string | ((key: OverlayDesignElementKey, element: OverlayRendererElement) => string);
  getElementProps?: (
    key: OverlayDesignElementKey,
    element: OverlayRendererElement
  ) => HTMLAttributes<HTMLDivElement>;
  onCanvasPointerDown?: () => void;
  renderElement: (payload: {
    elementKey: OverlayDesignElementKey;
    element: OverlayRendererElement;
    elementStyle: CSSProperties;
  }) => ReactNode;
  renderElementOverlay?: (payload: {
    elementKey: OverlayDesignElementKey;
    element: OverlayRendererElement;
    elementStyle: CSSProperties;
  }) => ReactNode;
};

export function OverlayRenderer({
  schema,
  className,
  style,
  debug = false,
  elementClassName,
  getElementProps,
  onCanvasPointerDown,
  renderElement,
  renderElementOverlay
}: OverlayRendererProps) {
  const viewport = useViewportSize(debug);
  const canvasStyle = useMemo(() => parseInlineCss(schema.canvas.css ?? ""), [schema.canvas.css]);

  return (
    <div
      onPointerDown={onCanvasPointerDown}
      className={className}
      style={{
        ...canvasStyle,
        position: "relative",
        width: schema.canvas.width,
        height: schema.canvas.height,
        background: schema.canvas.background,
        fontFamily: overlayDesignFontStack,
        ...style
      }}
    >
      {overlayDesignElementKeys.map((key, index) => {
        const element = schema.elements[key];

        if (!element?.visible) {
          return null;
        }

        const elementStyle = parseInlineCss(element.css);
        const elementClass = typeof elementClassName === "function"
          ? elementClassName(key, element)
          : elementClassName;
        const extraProps = getElementProps?.(key, element) ?? {};

        return (
          <div
            {...extraProps}
            key={key}
            className={[extraProps.className, elementClass].filter(Boolean).join(" ")}
            style={{
              ...extraProps.style,
              ...elementStyle,
              position: "absolute",
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              transform: `rotate(${element.rotation ?? 0}deg)`,
              transformOrigin: "center center",
              zIndex: element.zIndex ?? index + 1,
              boxSizing: "border-box"
            }}
          >
            <Fragment key={`${key}-content`}>
              {renderElement({ elementKey: key, element, elementStyle })}
            </Fragment>
            <Fragment key={`${key}-overlay`}>
              {renderElementOverlay?.({ elementKey: key, element, elementStyle })}
            </Fragment>
          </div>
        );
      })}

      {debug ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-[9998] border border-fuchsia-500" />
          <div className="pointer-events-none absolute left-2 top-2 z-[9999] rounded bg-black/75 px-2 py-1 font-mono text-[11px] leading-tight text-white">
            <div>canvas: {schema.canvas.width}x{schema.canvas.height}</div>
            <div>viewport: {viewport.width}x{viewport.height}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function overlayCustomDesignToRendererSchema(design: OverlayCustomDesign): OverlayRendererSchema {
  const canvasDeclarations = parseCssDeclarations(design.containerCss);
  const background =
    canvasDeclarations.get("background")
    ?? canvasDeclarations.get("background-color")
    ?? "transparent";

  canvasDeclarations.delete("background");
  canvasDeclarations.delete("background-color");

  return {
    canvas: {
      width: design.width,
      height: design.height,
      background,
      css: stringifyCssDeclarations(canvasDeclarations)
    },
    elements: Object.fromEntries(
      overlayDesignElementKeys.map((key, index) => {
        const element = design.elements[key];
        const elementDeclarations = parseCssDeclarations(element.css);
        const rotation = element.rotation ?? getRotateValueFromDeclarations(elementDeclarations);

        elementDeclarations.delete("transform");

        return [
          key,
          {
            ...element,
            css: stringifyCssDeclarations(elementDeclarations),
            rotation,
            zIndex: element.zIndex ?? index + 1
          }
        ];
      })
    ) as Record<OverlayDesignElementKey, OverlayRendererElement>
  };
}

export function parseInlineCss(css: string): CSSProperties {
  return Array.from(parseCssDeclarations(css).entries()).reduce<Record<string, string>>((style, [property, value]) => {
    style[toReactStyleKey(property)] = value;
    return style;
  }, {}) as CSSProperties;
}

function parseCssDeclarations(css: string) {
  const map = new Map<string, string>();

  css
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex === -1) {
        return;
      }

      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (!property || !value) {
        return;
      }

      map.set(property, value);
    });

  return map;
}

function stringifyCssDeclarations(declarations: Map<string, string>) {
  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

function getRotateValueFromDeclarations(declarations: Map<string, string>) {
  const transform = declarations.get("transform") ?? "";
  const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/i);

  return match ? Number(match[1]) : 0;
}

function toReactStyleKey(property: string) {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function useViewportSize(enabled: boolean) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, [enabled]);

  return viewport;
}
