import type { OverlayComponentSchema, OverlayRenderData } from "@/features/overlay-builder/schema/overlaySchema";
import { resolveBindings } from "@/features/overlay-builder/utils/resolveBindings";

const wrappingTextTypes = new Set(["comment", "viewer_name", "viewer_username", "viewer_badge", "created_at"]);
const containerTypes = new Set(["container", "bubble_card", "glass_card", "gradient_card"]);

export function getResolvedComponentText(component: OverlayComponentSchema, data: OverlayRenderData) {
  if (component.type === "gift_text") {
    const prefix = resolveBindings(component.props.prefix, data).trim();
    const rawTemplate = typeof component.props.text === "string" ? component.props.text : "";
    const template = resolveBindings(rawTemplate.replace(/\{\{\s*prefix\s*\}\}/g, prefix), data);
    const fallback = [prefix, `x${data.gift?.count ?? ""}`, data.gift?.name ?? ""]
      .filter(Boolean)
      .join(" ");

    return template || fallback;
  }

  return resolveBindings(component.props.text, data);
}

export function getRuntimeComponentHeight(component: OverlayComponentSchema, data: OverlayRenderData): number {
  const ownHeight = getOwnRuntimeHeight(component, data);

  if (!component.children?.length || !containerTypes.has(component.type)) {
    return ownHeight;
  }

  const childHeightDelta = component.children.reduce((delta, child) => {
    if (!child.visible) {
      return delta;
    }

    const runtimeChildHeight = getRuntimeComponentHeight(child, data);
    const originalBottomGap = Math.max(0, component.height - (child.y + child.height));
    const neededContainerHeight = child.y + runtimeChildHeight + originalBottomGap;

    return Math.max(delta, neededContainerHeight - component.height);
  }, 0);

  return Math.max(ownHeight, ownHeight + childHeightDelta);
}

export function getRuntimeComponentBounds(
  components: OverlayComponentSchema[] | undefined,
  data: OverlayRenderData,
  canvasWidth: number,
  canvasHeight: number
) {
  const bounds = collectRuntimeBounds(components ?? [], data, 0, 0, canvasWidth, canvasHeight);

  if (!bounds) {
    return { left: 0, top: 0, width: canvasWidth, height: canvasHeight };
  }

  const padding = 10;
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(canvasWidth, bounds.right + padding);
  const bottom = Math.min(canvasHeight, bounds.bottom + padding);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

export function getAutoFitFontSize(component: OverlayComponentSchema, text: string) {
  const fontSize = component.style.fontSize ?? 16;

  if (!shouldUseAutoFitFontSize(component)) {
    return fontSize;
  }

  if (component.type !== "gift_text") {
    return getWrappedAutoFitFontSize(component, text, fontSize);
  }

  const availableWidth = Math.max(1, component.width - 4);
  const estimatedWidth = estimateSingleLineWidth(text, fontSize, component.style.fontWeight);

  if (estimatedWidth <= availableWidth) {
    return fontSize;
  }

  return Math.max(8, Math.floor(fontSize * (availableWidth / estimatedWidth)));
}

function getOwnRuntimeHeight(component: OverlayComponentSchema, data: OverlayRenderData) {
  if (!shouldUseRuntimeAutoHeight(component)) {
    return component.height;
  }

  const text = getResolvedComponentText(component, data);
  const estimatedTextHeight = estimateWrappedTextHeight(
    text,
    component.width,
    component.style.fontSize ?? 16,
    component.style.fontWeight,
    component.style.lineHeight ?? 1.2
  );

  return Math.max(component.height, estimatedTextHeight);
}

function isTruncated(component: OverlayComponentSchema) {
  return component.style.textOverflow === "ellipsis";
}

function shouldUseRuntimeAutoHeight(component: OverlayComponentSchema) {
  if (!wrappingTextTypes.has(component.type) || isTruncated(component)) {
    return false;
  }

  if (component.type === "comment") {
    return true;
  }

  return component.style.autoHeight === true;
}

function shouldUseAutoFitFontSize(component: OverlayComponentSchema) {
  if (isTruncated(component)) {
    return false;
  }

  if (component.type === "comment") {
    return false;
  }

  return component.type === "gift_text" || component.style.autoFitFontSize === true;
}

function getWrappedAutoFitFontSize(component: OverlayComponentSchema, text: string, initialFontSize: number) {
  const minFontSize = Math.min(initialFontSize, 12);
  const width = Math.max(1, component.width);
  const height = Math.max(1, component.height);
  const lineHeight = component.style.lineHeight ?? 1.2;

  for (let fontSize = initialFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const estimatedHeight = estimateWrappedTextHeight(text, width, fontSize, component.style.fontWeight, lineHeight);

    if (estimatedHeight <= height) {
      return fontSize;
    }
  }

  return minFontSize;
}

function estimateWrappedTextHeight(text: string, width: number, fontSize: number, fontWeight: number | undefined, lineHeight: number) {
  const normalized = text.trim();
  const lineHeightPx = fontSize * lineHeight;

  if (!normalized) {
    return Math.ceil(lineHeightPx);
  }

  const averageCharWidth = fontSize * ((fontWeight ?? 400) >= 700 ? 0.64 : 0.58);
  const charsPerLine = Math.max(1, Math.floor(width / Math.max(1, averageCharWidth)));
  const lines = normalized.split(/\n/).reduce((count, paragraph) => {
    return count + Math.max(1, Math.ceil(paragraph.length / charsPerLine));
  }, 0);
  const verticalBuffer = Math.max(8, lineHeightPx * 0.35);

  return Math.ceil(lines * lineHeightPx + verticalBuffer);
}

function estimateSingleLineWidth(text: string, fontSize: number, fontWeight: number | undefined) {
  const weightFactor = (fontWeight ?? 400) >= 700 ? 0.62 : 0.56;

  return text.length * fontSize * weightFactor;
}

function collectRuntimeBounds(
  components: OverlayComponentSchema[],
  data: OverlayRenderData,
  parentX: number,
  parentY: number,
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number; right: number; bottom: number } | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const component of components) {
    if (!component.visible) {
      continue;
    }

    const absoluteX = parentX + component.x;
    const absoluteY = parentY + component.y;
    const runtimeHeight = getRuntimeComponentHeight(component, data);
    const blur = component.style.shadow?.enabled ? component.style.shadow.blur : 0;
    const isFullCanvasFrame = parentX === 0
      && parentY === 0
      && component.x <= 2
      && component.y <= 2
      && component.width >= canvasWidth * 0.9
      && component.height >= canvasHeight * 0.9
      && containerTypes.has(component.type);

    if (!isFullCanvasFrame) {
      left = Math.min(left, absoluteX - blur);
      top = Math.min(top, absoluteY - blur);
      right = Math.max(right, absoluteX + component.width + blur);
      bottom = Math.max(bottom, absoluteY + runtimeHeight + blur);
    }

    if (component.children?.length) {
      const childBounds = collectRuntimeBounds(component.children, data, absoluteX, absoluteY, canvasWidth, canvasHeight);

      if (childBounds) {
        left = Math.min(left, childBounds.left);
        top = Math.min(top, childBounds.top);
        right = Math.max(right, childBounds.right);
        bottom = Math.max(bottom, childBounds.bottom);
      }
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return { left, top, right, bottom };
}
