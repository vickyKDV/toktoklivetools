import { type CSSProperties, createElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Crown, Eye, Gift, Heart, MessageCircle } from "lucide-react";
import type {
  OverlayComponentSchema,
  OverlayComponentType,
  OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import { resolveBindings } from "@/features/overlay-builder/utils/resolveBindings";
import {
  getAutoFitFontSize,
  getResolvedComponentText,
  getRuntimeComponentHeight
} from "@/features/overlay-builder/utils/runtimeLayout";

export type ComponentSetting =
  | { key: string; label: string; type: "text" }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: "color" }
  | { key: string; label: string; type: "select"; options: { label: string; value: string | number }[] }
  | { key: string; label: string; type: "toggle" };

export type ComponentRegistryItem = {
  type: OverlayComponentType;
  label: string;
  defaultSize: { width: number; height: number };
  defaultProps: Record<string, unknown>;
  defaultStyle: OverlayComponentSchema["style"];
  render: (component: OverlayComponentSchema, data: OverlayRenderData) => ReactNode;
  settings: ComponentSetting[];
};

export const componentRegistry: Record<OverlayComponentType, ComponentRegistryItem> = {
  raw_card: cardItem("raw_card", "Basic White Card", { type: "solid", color: "#ffffff", opacity: 100 }, 500, 120, 18),
  speech_bubble_card: cardItem("speech_bubble_card", "Speech Bubble Card", { type: "solid", color: "#dcfce7", opacity: 100 }, 500, 120, 28),
  container: cardItem("container", "Card / Container", { type: "solid", color: "#ffffff", opacity: 90 }, 500, 120),
  bubble_card: cardItem("bubble_card", "Bubble Card", { type: "solid", color: "#ffffff", opacity: 92 }, 500, 120, 24),
  glass_card: cardItem("glass_card", "Glass Card", { type: "glass", color: "#ffffff", opacity: 22 }, 500, 120, 24, 16),
  gradient_card: cardItem("gradient_card", "Gradient Card", { type: "gradient", color: "#4d85ff", opacity: 100, from: "#4d85ff", to: "#ff9bb0", angle: 135 }, 500, 120, 24),
  profile_photo: {
    type: "profile_photo",
    label: "Foto Profil",
    defaultSize: { width: 72, height: 72 },
    defaultProps: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
    defaultStyle: { radius: 999, opacity: 100, border: { enabled: true, color: "#ffffff", width: 2 }, objectFit: "cover" },
    render: renderProfilePhoto,
    settings: baseImageSettings()
  },
  viewer_name: textItem("viewer_name", "Nama", "{{viewer.name}}", 220, 32, 20, 800),
  viewer_username: textItem("viewer_username", "Username", "{{viewer.username}}", 180, 28, 15, 700),
  viewer_badge: {
    ...textItem("viewer_badge", "Badge", "{{viewer.badge}}", 150, 30, 13, 900),
    defaultStyle: { radius: 8, opacity: 100, fontSize: 13, fontWeight: 900, color: "#ffffff", align: "center", backgroundColor: "#dc2626" }
  },
  leaderboard_rank: {
    type: "leaderboard_rank",
    label: "Rank / Icon",
    defaultSize: { width: 58, height: 52 },
    defaultProps: {
      mode: "text",
      metric: "auto",
      textPrefix: "#",
      topCrownCount: 3
    },
    defaultStyle: {
      radius: 14,
      opacity: 100,
      fontSize: 22,
      fontWeight: 900,
      color: "#020617",
      align: "center",
      backgroundColor: "#60a5fa"
    },
    render: renderLeaderboardRank,
    settings: [
      { key: "props.mode", label: "Mode", type: "select", options: [
        { label: "#1, #2, #3", value: "text" },
        { label: "Number only", value: "number" },
        { label: "Crown top ranks", value: "crown" },
        { label: "Metric icon", value: "metric_icon" }
      ] },
      { key: "props.metric", label: "Metric Icon", type: "select", options: [
        { label: "Auto", value: "auto" },
        { label: "Gift", value: "gift" },
        { label: "Like / Love", value: "like" },
        { label: "View", value: "view" },
        { label: "Comment", value: "comment" }
      ] },
      { key: "props.textPrefix", label: "Text Prefix", type: "text" },
      { key: "props.topCrownCount", label: "Crown Top Count", type: "number", min: 1, max: 10, step: 1 },
      ...textSettings()
    ]
  },
  comment: {
    ...textItem("comment", "Komentar", "{{comment.text}}", 440, 82, 24, 700),
    defaultStyle: { opacity: 100, fontSize: 24, fontWeight: 700, color: "#ffffff", align: "left", lineHeight: 1.2, autoHeight: true, autoFitFontSize: false }
  },
  created_at: textItem("created_at", "Timestamp", "{{comment.createdAt}}", 90, 24, 13, 700),
  gift_text: {
    ...textItem("gift_text", "Gift Text", "{{prefix}} x{{gift.count}} {{gift.name}}", 360, 42, 24, 900),
    defaultProps: { prefix: "Mengirim", text: "{{prefix}} x{{gift.count}} {{gift.name}}" },
    defaultStyle: { opacity: 100, fontSize: 24, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.1, autoFitFontSize: true },
    render: renderGiftText,
    settings: [
      { key: "props.prefix", label: "Prefix", type: "text" },
      { key: "props.text", label: "Format", type: "text" },
      ...textSettings()
    ]
  },
  gift_name: textItem("gift_name", "Nama Gift", "{{gift.name}}", 220, 34, 22, 800),
  gift_count: textItem("gift_count", "Jumlah Gift", "x{{gift.count}}", 90, 34, 22, 900),
  gift_image: {
    type: "gift_image",
    label: "Gambar Gift",
    defaultSize: { width: 72, height: 72 },
    defaultProps: { src: "{{gift.image}}", fallback: "" },
    defaultStyle: { radius: 12, opacity: 100, objectFit: "contain" },
    render: renderImage,
    settings: baseImageSettings()
  },
  media_switch: {
    type: "media_switch",
    label: "Media Switch",
    defaultSize: { width: 800, height: 400 },
    defaultProps: {
      items: [],
      intervalMs: 5000,
      transition: "fade",
      videoSwitchMode: "ended",
      muted: true,
      autoplay: true,
      loopSingle: true
    },
    defaultStyle: { radius: 0, opacity: 100, objectFit: "contain", overflow: "hidden", backgroundColor: "transparent" },
    render: renderMediaSwitch,
    settings: [
      { key: "props.intervalMs", label: "Switch Interval ms", type: "number", min: 500, max: 600000, step: 100 },
      { key: "props.transition", label: "Transition", type: "select", options: [
        { label: "None", value: "none" },
        { label: "Fade", value: "fade" },
        { label: "Slide", value: "slide" }
      ] },
      { key: "props.videoSwitchMode", label: "Video / Lottie Switch", type: "select", options: [
        { label: "When media ends", value: "ended" },
        { label: "By interval", value: "interval" }
      ] },
      { key: "props.muted", label: "Muted", type: "toggle" },
      { key: "props.autoplay", label: "Autoplay", type: "toggle" },
      { key: "props.loopSingle", label: "Loop Single File", type: "toggle" },
      { key: "style.objectFit", label: "Object Fit", type: "select", options: [
        { label: "Contain", value: "contain" },
        { label: "Cover", value: "cover" },
        { label: "Fill", value: "fill" }
      ] },
      { key: "style.radius", label: "Radius", type: "number", min: 0, max: 999, step: 1 },
      { key: "style.opacity", label: "Opacity", type: "number", min: 0, max: 100, step: 1 }
    ]
  },
  running_text: textItem("running_text", "Running Text", "{{viewer.name}}: {{comment.text}}", 620, 36, 20, 700)
};

export const componentLibrary = Object.values(componentRegistry);

function textItem(
  type: OverlayComponentType,
  label: string,
  text: string,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number
): ComponentRegistryItem {
  return {
    type,
    label,
    defaultSize: { width, height },
    defaultProps: { text },
    defaultStyle: { opacity: 100, fontSize, fontWeight, color: "#ffffff", align: "left", lineHeight: 1.2 },
    render: renderText,
    settings: [
      { key: "props.text", label: "Text", type: "text" },
      ...textSettings()
    ]
  };
}

function textSettings(): ComponentSetting[] {
  return [
    { key: "style.fontSize", label: "Font Size", type: "number", min: 6, max: 180, step: 1 },
    { key: "style.fontWeight", label: "Weight", type: "select", options: [
      { label: "Regular", value: 400 },
      { label: "Semi", value: 600 },
      { label: "Bold", value: 700 },
      { label: "Black", value: 900 }
    ] },
    { key: "style.color", label: "Color", type: "color" },
    { key: "style.align", label: "Align", type: "select", options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" }
    ] },
    { key: "style.lineHeight", label: "Line Height", type: "number", min: 0.7, max: 3, step: 0.05 },
    { key: "style.maxLines", label: "Max Lines", type: "number", min: 1, max: 20, step: 1 },
    { key: "style.textOverflow", label: "Text Overflow", type: "select", options: [
      { label: "Clip", value: "clip" },
      { label: "Ellipsis", value: "ellipsis" }
    ] },
    { key: "style.autoHeight", label: "Auto Height", type: "toggle" },
    { key: "style.autoFitFontSize", label: "Auto Fit Font Size", type: "toggle" },
    { key: "style.lineClamp", label: "Line Clamp", type: "number", min: 1, max: 20, step: 1 },
    { key: "style.backgroundColor", label: "Background", type: "color" },
    { key: "style.overflow", label: "Overflow", type: "select", options: [
      { label: "Visible", value: "visible" },
      { label: "Hidden", value: "hidden" }
    ] },
    { key: "style.radius", label: "Radius", type: "number", min: 0, max: 999, step: 1 },
    { key: "style.opacity", label: "Opacity", type: "number", min: 0, max: 100, step: 1 }
  ];
}

function cardItem(
  type: OverlayComponentType,
  label: string,
  background: NonNullable<OverlayComponentSchema["style"]["background"]>,
  width: number,
  height: number,
  radius = 16,
  backdropBlur = 0
): ComponentRegistryItem {
  return {
    type,
    label,
    defaultSize: { width, height },
    defaultProps: { clipContent: true, padding: 16, layout: "free" },
    defaultStyle: {
      background,
      bubbleTail: type === "speech_bubble_card" ? { enabled: true, side: "left", position: "bottom", size: 22 } : undefined,
      radius,
      opacity: 100,
      overflow: "hidden",
      border: { enabled: false, color: "#ffffff", width: 0 },
      shadow: { enabled: true, color: "#000000", opacity: 20, blur: 20, x: 0, y: 8 },
      backdropBlur
    },
    render: () => null,
    settings: [
      { key: "props.clipContent", label: "Clip Content", type: "toggle" },
      { key: "props.padding", label: "Padding", type: "number", min: 0, max: 120, step: 1 },
      { key: "props.layout", label: "Layout", type: "select", options: [{ label: "Free", value: "free" }] },
      { key: "style.background.type", label: "Background Type", type: "select", options: [
        { label: "Transparent", value: "transparent" },
        { label: "Solid", value: "solid" },
        { label: "Gradient", value: "gradient" },
        { label: "Glass", value: "glass" }
      ] },
      { key: "style.background.color", label: "Background Color", type: "color" },
      { key: "style.background.opacity", label: "Opacity", type: "number", min: 0, max: 100, step: 1 },
      { key: "style.background.from", label: "Gradient From", type: "color" },
      { key: "style.background.to", label: "Gradient To", type: "color" },
      { key: "style.background.angle", label: "Gradient Angle", type: "number", min: 0, max: 360, step: 1 },
      { key: "style.radius", label: "Radius", type: "number", min: 0, max: 999, step: 1 },
      { key: "style.backdropBlur", label: "Backdrop Blur", type: "number", min: 0, max: 80, step: 1 },
      { key: "style.blur", label: "Blur", type: "number", min: 0, max: 80, step: 1 },
      { key: "style.overflow", label: "Overflow", type: "select", options: [
        { label: "Visible", value: "visible" },
        { label: "Hidden", value: "hidden" }
      ] }
    ]
  };
}

function baseImageSettings(): ComponentSetting[] {
  return [
    { key: "props.src", label: "Source", type: "text" },
    { key: "props.fallback", label: "Fallback", type: "text" },
    { key: "style.radius", label: "Radius", type: "number", min: 0, max: 999, step: 1 },
    { key: "style.opacity", label: "Opacity", type: "number", min: 0, max: 100, step: 1 },
    { key: "style.objectFit", label: "Object Fit", type: "select", options: [
      { label: "Cover", value: "cover" },
      { label: "Contain", value: "contain" }
    ] }
  ];
}

type MediaSwitchItem = {
  id?: string;
  url: string;
  type?: "image" | "video" | "lottie";
  label?: string;
};

function renderMediaSwitch(component: OverlayComponentSchema) {
  return createElement(MediaSwitchRenderer, { component });
}

function MediaSwitchRenderer({ component }: { component: OverlayComponentSchema }) {
  const items = useMemo(() => normalizeMediaItems(component.props.items, component.props.src), [component.props.items, component.props.src]);
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalMs = clampNumber(component.props.intervalMs, 500, 600000, 5000);
  const transition = typeof component.props.transition === "string" ? component.props.transition : "fade";
  const videoSwitchMode = typeof component.props.videoSwitchMode === "string" ? component.props.videoSwitchMode : "ended";
  const item = items[activeIndex] ?? null;
  const shouldSwitchByInterval = items.length > 1 && (videoSwitchMode !== "ended" || !isEndDrivenMedia(item));
  const goNext = useCallback(() => {
    if (items.length <= 1) {
      return;
    }

    setActiveIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.some((entry) => entry.type === "lottie")) {
      void import("@lottiefiles/dotlottie-wc");
    }
  }, [items]);

  useEffect(() => {
    setActiveIndex((current) => items.length ? Math.min(current, items.length - 1) : 0);
  }, [items.length]);

  useEffect(() => {
    if (!shouldSwitchByInterval) {
      return;
    }

    const timer = window.setInterval(() => {
      goNext();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [goNext, intervalMs, shouldSwitchByInterval]);

  const fit = component.style.objectFit === "cover" || component.style.objectFit === "fill" ? component.style.objectFit : "contain";
  const mediaStyle = {
    width: "100%",
    height: "100%",
    objectFit: fit,
    display: "block",
    borderRadius: "inherit",
    imageRendering: "auto" as const,
    backfaceVisibility: "hidden" as const
  } satisfies CSSProperties;
  const wrapperStyle = {
    width: component.width,
    height: component.height,
    overflow: component.style.overflow === "visible" ? "visible" : "hidden",
    borderRadius: "inherit",
    background: component.style.backgroundColor ?? "transparent",
    opacity: (component.style.opacity ?? 100) / 100,
    transition: transition === "fade" ? "opacity 220ms ease" : transition === "slide" ? "transform 220ms ease, opacity 220ms ease" : undefined
  } satisfies CSSProperties;

  if (!item) {
    return createElement(
      "div",
      {
        style: {
          ...wrapperStyle,
          display: "grid",
          placeItems: "center",
          border: "1px dashed rgba(255,255,255,.35)",
          color: "rgba(255,255,255,.72)",
          fontSize: 14,
          fontWeight: 700
        } satisfies CSSProperties
      },
      "Tambahkan file media"
    );
  }

  if (item.type === "video") {
    return createElement(
      "div",
      { style: wrapperStyle },
      createElement("video", {
        key: item.url,
        ref: videoRef,
        src: item.url,
        autoPlay: component.props.autoplay !== false,
        muted: component.props.muted !== false,
        playsInline: true,
        loop: items.length === 1 && component.props.loopSingle !== false,
        onEnded: items.length > 1 && videoSwitchMode === "ended"
          ? goNext
          : undefined,
        style: mediaStyle
      })
    );
  }

  if (item.type === "lottie") {
    return createElement(
      "div",
      { style: wrapperStyle },
      createElement(LottieSwitchMedia, {
        key: item.url,
        item,
        component,
        loop: items.length === 1 ? component.props.loopSingle !== false : videoSwitchMode !== "ended",
        onComplete: items.length > 1 && videoSwitchMode === "ended" ? goNext : undefined
      })
    );
  }

  return createElement(
    "div",
    { style: wrapperStyle },
    createElement("img", {
      key: item.url,
      src: item.url,
      alt: item.label ?? component.name,
      referrerPolicy: "no-referrer",
      style: mediaStyle
    })
  );
}

function LottieSwitchMedia({
  item,
  component,
  loop,
  onComplete
}: {
  item: MediaSwitchItem;
  component: OverlayComponentSchema;
  loop: boolean;
  onComplete?: () => void;
}) {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (!element || !onComplete) {
      return;
    }

    const handleComplete = () => onComplete();
    const completeEvents = ["complete", "finish", "ended", "dotlottie-complete", "dotlottie:complete"];

    completeEvents.forEach((eventName) => {
      element.addEventListener(eventName, handleComplete);
    });

    return () => {
      completeEvents.forEach((eventName) => {
        element.removeEventListener(eventName, handleComplete);
      });
    };
  }, [item.url, onComplete]);

  return createElement("dotlottie-wc", {
    ref: (node: HTMLElement | null) => {
      elementRef.current = node;
    },
    src: item.url,
    autoplay: component.props.autoplay !== false,
    loop,
    style: {
      display: "block",
      width: "100%",
      height: "100%"
    } satisfies CSSProperties
  });
}

function normalizeMediaItems(rawItems: unknown, rawSrc: unknown): MediaSwitchItem[] {
  if (Array.isArray(rawItems)) {
    return rawItems
      .map((item) => normalizeMediaItem(item))
      .filter((item): item is MediaSwitchItem => Boolean(item?.url));
  }

  const src = typeof rawSrc === "string" ? rawSrc.trim() : "";

  return src ? [{ url: src, type: inferMediaType(src), label: src.split("/").pop() ?? "Media" }] : [];
}

function normalizeMediaItem(value: unknown): MediaSwitchItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";

  if (!url) {
    return null;
  }

  const type = record.type === "video" || record.type === "lottie" || record.type === "image"
    ? record.type
    : inferMediaType(url);

  return {
    id: typeof record.id === "string" ? record.id : url,
    url,
    type,
    label: typeof record.label === "string" ? record.label : typeof record.name === "string" ? record.name : url.split("/").pop()
  };
}

function inferMediaType(url: string): MediaSwitchItem["type"] {
  if (/\.(mp4|webm|mov)(?:$|[?#])/i.test(url)) {
    return "video";
  }

  if (/\.(json|lottie)(?:$|[?#])/i.test(url)) {
    return "lottie";
  }

  return "image";
}

function isEndDrivenMedia(item: MediaSwitchItem | undefined) {
  return item?.type === "video" || item?.type === "lottie";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

function renderText(component: OverlayComponentSchema, data: OverlayRenderData) {
  const maxLines = component.style.lineClamp ?? component.style.maxLines;
  const ellipsis = component.style.textOverflow === "ellipsis";
  const shouldClamp = ellipsis && maxLines != null && maxLines > 0;
  const runtimeHeight = getRuntimeComponentHeight(component, data);
  const text = getResolvedComponentText(component, data);
  const fontSize = getAutoFitFontSize(component, text);
  const textStyle: CSSProperties = {
    width: component.width,
    minHeight: component.height,
    height: runtimeHeight,
    overflow: component.style.overflow === "visible" ? "visible" : "hidden",
    overflowWrap: "anywhere",
    whiteSpace: component.type === "running_text" ? "nowrap" : "normal",
    textOverflow: ellipsis ? "ellipsis" : "clip",
    fontSize
  };

  if (shouldClamp) {
    textStyle.display = "-webkit-box";
    textStyle.WebkitLineClamp = maxLines;
    textStyle.WebkitBoxOrient = "vertical";
  }

  return createElement(
    "div",
    { style: textStyle },
    text
  );
}

function renderGiftText(component: OverlayComponentSchema, data: OverlayRenderData) {
  const text = getResolvedComponentText(component, data).replace(/\s+/g, " ").trim();
  const fontSize = getAutoFitFontSize(component, text);

  return createElement(
    "div",
    {
      style: {
        width: component.width,
        height: component.height,
        minHeight: component.height,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "clip",
        fontSize,
        lineHeight: component.style.lineHeight ?? 1.1
      } satisfies CSSProperties
    },
    text
  );
}

function renderLeaderboardRank(component: OverlayComponentSchema, data: OverlayRenderData) {
  const rank = getLeaderboardRank(data);
  const mode = typeof component.props.mode === "string" ? component.props.mode : "text";
  const metric = getLeaderboardMetricForRank(component, data);
  const topCrownCount = Number.isFinite(Number(component.props.topCrownCount))
    ? Math.max(1, Math.min(10, Number(component.props.topCrownCount)))
    : 3;
  const textPrefix = typeof component.props.textPrefix === "string" ? component.props.textPrefix : "#";
  const commonStyle = {
    display: "grid",
    width: component.width,
    height: component.height,
    placeItems: "center",
    fontSize: component.style.fontSize ?? 22,
    fontWeight: component.style.fontWeight ?? 900,
    lineHeight: component.style.lineHeight ?? 1
  } satisfies CSSProperties;

  if (mode === "metric_icon") {
    const Icon = getLeaderboardMetricIcon(metric);

    return createElement(
      "div",
      { style: commonStyle },
      createElement(Icon, {
        "aria-hidden": true,
        style: {
          width: Math.max(14, Math.min(component.width, component.height) * 0.58),
          height: Math.max(14, Math.min(component.width, component.height) * 0.58)
        } satisfies CSSProperties
      })
    );
  }

  if (mode === "crown" && rank <= topCrownCount) {
    return createElement(
      "div",
      { style: commonStyle },
      createElement(Crown, {
        "aria-hidden": true,
        style: {
          width: Math.max(18, Math.min(component.width, component.height) * 0.62),
          height: Math.max(18, Math.min(component.width, component.height) * 0.62)
        } satisfies CSSProperties
      })
    );
  }

  return createElement(
    "div",
    { style: commonStyle },
    mode === "number" ? String(rank) : `${textPrefix}${rank}`
  );
}

function getLeaderboardRank(data: OverlayRenderData) {
  const raw = data.viewer?.badge ?? "1";
  const parsed = Number(String(raw).replace(/[^\d]/g, ""));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getLeaderboardMetricForRank(component: OverlayComponentSchema, data: OverlayRenderData) {
  const propMetric = typeof component.props.metric === "string" ? component.props.metric : "auto";

  if (propMetric !== "auto") {
    return propMetric;
  }

  const dataMetric = data.gift?.name;

  if (dataMetric === "like" || dataMetric === "likes") {
    return "like";
  }

  if (dataMetric === "view" || dataMetric === "views") {
    return "view";
  }

  if (dataMetric === "comment" || dataMetric === "comments" || dataMetric === "chat") {
    return "comment";
  }

  return "gift";
}

function getLeaderboardMetricIcon(metric: string) {
  if (metric === "like") {
    return Heart;
  }

  if (metric === "view") {
    return Eye;
  }

  if (metric === "comment") {
    return MessageCircle;
  }

  return Gift;
}

function renderProfilePhoto(component: OverlayComponentSchema, data: OverlayRenderData) {
  const src = resolveBindings(component.props.src, data);
  const name = data.viewer?.name ?? "Viewer";

  if (src) {
    return renderImage(component, data);
  }

  return createElement(
    "div",
    {
      style: {
        display: "grid",
        width: component.width,
        height: component.height,
        placeItems: "center",
        background: "#fda4af",
        color: "#18181b",
        fontWeight: 900
      } satisfies CSSProperties
    },
    name.trim().charAt(0).toUpperCase() || "V"
  );
}

function renderImage(component: OverlayComponentSchema, data: OverlayRenderData) {
  const src = resolveBindings(component.props.src, data) || resolveBindings(component.props.fallback, data);

  if (!src) {
    return createElement("div", {
      style: {
        width: component.width,
        height: component.height,
        background: "rgba(255,255,255,.16)"
      } satisfies CSSProperties
    });
  }

  return createElement("img", {
    src,
    alt: component.name,
    referrerPolicy: "no-referrer",
    style: {
      width: component.width,
      height: component.height,
      objectFit: component.style.objectFit === "contain" ? "contain" : "cover",
      display: "block",
      imageRendering: "auto",
      backfaceVisibility: "hidden"
    } satisfies CSSProperties
  });
}
