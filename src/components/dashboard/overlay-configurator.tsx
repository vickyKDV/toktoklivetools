"use client";

import Link from "next/link";
import { ExternalLink, Gift, Heart, LayoutTemplate, MessageCircle, RotateCcw, Settings, Trophy, Volume2, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OverlayRenderer,
  overlayCustomDesignToRendererSchema
} from "@/components/overlay/OverlayRenderer";
import { ChatStyleRenderer, getSampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import {
  overlayDesignFontStack,
  type OverlayDesignMode,
  type SavedOverlayDesign
} from "@/lib/overlay-designs";
import type {
  ChatOverlayStyle,
  ChatUserRole,
  FocusChatStyle,
  GiftOverlayStyle,
  OverlayCustomDesign,
  OverlayDesignElement,
  OverlayDesignElementKey
} from "@/types/live";

type OverlayMode = "gift" | "chat" | "leaderboard";
type ChatFeatureTab = "chat" | "focus";

type CustomDesignPreviewSample = {
  displayName: string;
  username: string;
  role: ChatUserRole;
  message: string;
  timestamp: string;
  initial: string;
};

type OverlayConfiguratorProps = {
  workspaceId: string;
  widgetBaseUrl: string;
  overlayKey: string;
  workspaceName: string;
  tiktokUsername: string | null;
};

type OverlayBuilderState = {
  mode: OverlayMode;
  giftTheme: string;
  chatTheme: string;
  focusChatTheme: string;
  leaderboardTheme: string;
  position: string;
  duration: number;
  allowed: string;
  metric: string;
  period: string;
  limit: number;
  chatStyle: ChatOverlayStyle;
  focusChatStyle: FocusChatStyle;
  giftStyle: GiftOverlayStyle;
  chatSoundUrl: string;
  giftSoundUrl: string;
  activeChatDesignId?: string;
  activeFocusDesignId?: string;
};

type OverlayDesignsResponse = {
  workspaceDesigns?: Record<OverlayDesignMode, SavedOverlayDesign[]>;
  selectedDesignIds?: Partial<Record<OverlayDesignMode, string>>;
};

const giftThemes = [
  { value: "glass", label: "Glass Alert" },
  { value: "neon", label: "Neon Pulse" },
  { value: "combo", label: "Combo Meter" },
  { value: "spotlight", label: "Spotlight Burst" },
  { value: "badge", label: "Gift Badge" },
  { value: "history", label: "Gift History" },
  { value: "ticker", label: "Running Text" }
];

const chatThemes = [
  { value: "hud", label: "HUD" },
  { value: "scroll", label: "Auto Scroll Stack" },
  { value: "manga", label: "Manga" },
  { value: "arcade", label: "Arcade" },
  { value: "aura", label: "Aura" },
  { value: "cyber", label: "Cyber Panel" },
  { value: "bubble", label: "Soft Bubble" },
  { value: "ticker", label: "Chat Running Text" },
  { value: "minimal", label: "Minimal Stack" }
];

const focusChatThemes = [
  { value: "spotlight", label: "Spotlight Card" },
  { value: "neon", label: "Neon Focus" },
  { value: "broadcast", label: "Broadcast Bar" },
  { value: "lower-third", label: "Lower Third" },
  { value: "bubble", label: "Bubble Pop" },
  { value: "flip-card", label: "Flip Card" },
  { value: "minimal", label: "Minimal Focus" }
];

const leaderboardThemes = [
  { value: "crown", label: "Crown List" },
  { value: "compact", label: "Compact" },
  { value: "ticker", label: "Running Text" }
];

const positions = [
  { value: "top-center", label: "Top Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "center", label: "Center" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" }
];

const animationInOptions = [
  { value: "fade-in", label: "Fade In" },
  { value: "slide-left-in", label: "Slide In Left" },
  { value: "slide-right-in", label: "Slide In Right" },
  { value: "slide-up-in", label: "Slide In Up" },
  { value: "drop-in", label: "Drop In" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "flip-in", label: "Card Flip In" },
  { value: "bounce-in", label: "Bounce In" },
  { value: "scroll-up", label: "Slide In Up" },
  { value: "pop-in", label: "Pop In" },
  { value: "none", label: "Tanpa Animasi" }
];

const animationOutOptions = [
  { value: "fade-out", label: "Fade Out" },
  { value: "slide-left-out", label: "Slide Out Left" },
  { value: "slide-right-out", label: "Slide Out Right" },
  { value: "slide-up-out", label: "Slide Out Up" },
  { value: "slide-down-out", label: "Slide Out Down" },
  { value: "zoom-out", label: "Zoom Out" },
  { value: "flip-out", label: "Card Flip Out" },
  { value: "pop-out", label: "Pop Out" },
  { value: "none", label: "Tanpa Animasi" }
];

const soundOptions = [
  { value: "", label: "Tanpa Sound" },
  { value: "/api/assets/sounds/message_sound_alert.mp3", label: "Message Alert 1" },
  { value: "/api/assets/sounds/message_sound_alert_2.mp3", label: "Message Alert 2" },
  { value: "/api/assets/sounds/message_sound_alert_3.mp3", label: "Message Alert 3" }
];

const designElementOptions: { value: OverlayDesignElementKey; label: string }[] = [
  { value: "profile", label: "Foto Profil" },
  { value: "name", label: "Nama" },
  { value: "username", label: "Username" },
  { value: "badge", label: "Badge" },
  { value: "message", label: "Komentar" },
  { value: "timestamp", label: "Timestamp" }
];

const defaultChatStyle: ChatOverlayStyle = {
  font: "Outfit",
  fontSize: 18,
  lineGap: 32,
  letterSpacing: 0,
  fontColor: "#ffffff",
  backgroundColor: "#111827cc",
  moderatorColor: "#dc2626",
  subscriberColor: "#ea580c",
  followerColor: "#65a30d",
  friendColor: "#06b6d4",
  animation: "scroll-up",
  animationIn: "scroll-up",
  animationOut: "fade-out",
  hideAfterMs: 0,
  maxMessages: 5,
  alignRight: false,
  showProfile: true,
  showBadge: true,
  showJoinEvents: false,
  showShareEvents: false,
  shadowEnabled: true,
  shadowColor: "#00000055",
  shadowBlur: 24,
  shadowOffsetX: 0,
  shadowOffsetY: 12,
  strokeEnabled: false,
  strokeColor: "#ffffff55",
  strokeWidth: 1,
  customDesignEnabled: false,
  customDesign: createDefaultChatDesign()
};

const defaultFocusChatStyle: FocusChatStyle = {
  font: "Outfit",
  nameSize: 22,
  messageSize: 34,
  fontColor: "#ffffff",
  nameColor: "#f43f5e",
  backgroundColor: "#111827e6",
  borderColor: "#ffffff55",
  accentColor: "#22d3ee",
  shadowColor: "#00000088",
  width: 760,
  radius: 28,
  padding: 28,
  animationIn: "zoom-in",
  animationOut: "zoom-out",
  durationMs: 7000,
  showProfile: true,
  showBadge: true,
  showUsername: true,
  showTimestamp: false,
  showQuoteIcon: true,
  shadowEnabled: true,
  shadowBlur: 70,
  shadowOffsetX: 0,
  shadowOffsetY: 22,
  strokeEnabled: true,
  strokeColor: "#ffffff55",
  strokeWidth: 1,
  customDesignEnabled: false,
  customDesign: createDefaultFocusDesign()
};

const defaultGiftStyle: GiftOverlayStyle = {
  font: "Outfit",
  fontSize: 24,
  fontColor: "#ffffff",
  backgroundColor: "#111827cc",
  accentColor: "#fb7185",
  animationIn: "pop-in",
  animationOut: "fade-out",
  maxItems: 5,
  showProfile: true,
  showGiftIcon: true,
  showCoin: true,
  showSparkles: true
};

function createDefaultChatDesign(): OverlayCustomDesign {
  return {
    width: 640,
    height: 168,
    containerCss: "background: rgba(17,24,39,.86); border-radius: 28px; padding: 0;",
    elements: {
      profile: {
        x: 22,
        y: 42,
        width: 72,
        height: 72,
        visible: true,
        css: "border-radius: 999px; border: 3px solid rgba(255,255,255,.75);"
      },
      name: {
        x: 120,
        y: 34,
        width: 240,
        height: 34,
        visible: true,
        css: "font-weight: 800; color: #ef4444; font-size: 24px; line-height: 1.1; overflow-wrap: anywhere;"
      },
      username: {
        x: 365,
        y: 38,
        width: 120,
        height: 26,
        visible: false,
        css: "font-weight: 700; color: rgba(255,255,255,.72); font-size: 14px;"
      },
      badge: {
        x: 402,
        y: 35,
        width: 138,
        height: 28,
        visible: true,
        css: "background: #dc2626; color: #ffffff; border-radius: 8px; font-size: 13px; font-weight: 900; text-transform: uppercase;"
      },
      message: {
        x: 120,
        y: 78,
        width: 470,
        height: 62,
        visible: true,
        css: "font-size: 30px; font-weight: 800; color: #ffffff; line-height: 1.15; overflow-wrap: anywhere;"
      },
      timestamp: {
        x: 520,
        y: 18,
        width: 80,
        height: 24,
        visible: false,
        css: "font-size: 13px; font-weight: 700; color: rgba(255,255,255,.62); text-align: right;"
      }
    }
  };
}

function createDefaultFocusDesign(): OverlayCustomDesign {
  return {
    width: 820,
    height: 260,
    containerCss: "background: rgba(17,24,39,.90); border-radius: 34px; padding: 0;",
    elements: {
      profile: {
        x: 36,
        y: 52,
        width: 96,
        height: 96,
        visible: true,
        css: "border-radius: 999px; border: 4px solid rgba(255,255,255,.72);"
      },
      name: {
        x: 158,
        y: 44,
        width: 320,
        height: 38,
        visible: true,
        css: "font-weight: 900; color: #f43f5e; font-size: 28px; line-height: 1.05; overflow-wrap: anywhere;"
      },
      username: {
        x: 490,
        y: 50,
        width: 160,
        height: 28,
        visible: true,
        css: "font-weight: 700; color: rgba(255,255,255,.70); font-size: 16px;"
      },
      badge: {
        x: 158,
        y: 92,
        width: 155,
        height: 32,
        visible: true,
        css: "background: #dc2626; color: #ffffff; border-radius: 10px; font-size: 14px; font-weight: 900; text-transform: uppercase;"
      },
      message: {
        x: 158,
        y: 138,
        width: 610,
        height: 84,
        visible: true,
        css: "font-size: 42px; font-weight: 900; color: #ffffff; line-height: 1.05; overflow-wrap: anywhere;"
      },
      timestamp: {
        x: 682,
        y: 48,
        width: 86,
        height: 24,
        visible: false,
        css: "font-size: 14px; font-weight: 700; color: rgba(255,255,255,.62); text-align: right;"
      }
    }
  };
}

function addPreviewFlag(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}preview=1`;
}

function buildChatOverlayParams({
  allowed,
  position,
  chatStyle,
  soundUrl
}: {
  allowed: string;
  position: string;
  chatStyle: ChatOverlayStyle;
  soundUrl: string;
}) {
  const params = new URLSearchParams();

  params.set("allowed", allowed);
  params.set("position", position);
  params.set("font", chatStyle.font);
  params.set("fontSize", String(chatStyle.fontSize));
  params.set("lineGap", String(chatStyle.lineGap));
  params.set("letterSpacing", String(chatStyle.letterSpacing));
  params.set("fontColor", chatStyle.fontColor);
  params.set("bgColor", chatStyle.backgroundColor);
  params.set("moderatorColor", chatStyle.moderatorColor);
  params.set("subscriberColor", chatStyle.subscriberColor);
  params.set("followerColor", chatStyle.followerColor);
  params.set("friendColor", chatStyle.friendColor);
  params.set("animation", chatStyle.animationIn);
  params.set("animationIn", chatStyle.animationIn);
  params.set("animationOut", chatStyle.animationOut);
  params.set("hideAfter", String(chatStyle.hideAfterMs));
  params.set("maxMessages", String(chatStyle.maxMessages));
  params.set("alignRight", chatStyle.alignRight ? "1" : "0");
  params.set("showProfile", chatStyle.showProfile ? "1" : "0");
  params.set("showBadge", chatStyle.showBadge ? "1" : "0");
  params.set("showJoin", chatStyle.showJoinEvents ? "1" : "0");
  params.set("showShare", chatStyle.showShareEvents ? "1" : "0");
  params.set("chatShadow", chatStyle.shadowEnabled ? "1" : "0");
  params.set("chatShadowColor", chatStyle.shadowColor);
  params.set("chatShadowBlur", String(chatStyle.shadowBlur));
  params.set("chatShadowX", String(chatStyle.shadowOffsetX));
  params.set("chatShadowY", String(chatStyle.shadowOffsetY));
  params.set("chatStroke", chatStyle.strokeEnabled ? "1" : "0");
  params.set("chatStrokeColor", chatStyle.strokeColor);
  params.set("chatStrokeWidth", String(chatStyle.strokeWidth));
  if (chatStyle.customDesignEnabled && !chatStyle.customDesignId) {
    params.set("chatCustom", "1");
    params.set("chatDesign", encodeDesignParam(chatStyle.customDesign));
  }

  if (soundUrl) {
    params.set("sound", soundUrl);
  }

  return params;
}

function buildFocusChatOverlayParams({
  position,
  focusStyle,
  soundUrl
}: {
  position: string;
  focusStyle: FocusChatStyle;
  soundUrl: string;
}) {
  const params = new URLSearchParams();

  params.set("position", position);
  params.set("focusFont", focusStyle.font);
  params.set("focusNameSize", String(focusStyle.nameSize));
  params.set("focusMessageSize", String(focusStyle.messageSize));
  params.set("focusFontColor", focusStyle.fontColor);
  params.set("focusNameColor", focusStyle.nameColor);
  params.set("focusBgColor", focusStyle.backgroundColor);
  params.set("focusBorderColor", focusStyle.borderColor);
  params.set("focusAccentColor", focusStyle.accentColor);
  params.set("focusShadowColor", focusStyle.shadowColor);
  params.set("focusShadow", focusStyle.shadowEnabled ? "1" : "0");
  params.set("focusShadowBlur", String(focusStyle.shadowBlur));
  params.set("focusShadowX", String(focusStyle.shadowOffsetX));
  params.set("focusShadowY", String(focusStyle.shadowOffsetY));
  params.set("focusStroke", focusStyle.strokeEnabled ? "1" : "0");
  params.set("focusStrokeColor", focusStyle.strokeColor);
  params.set("focusStrokeWidth", String(focusStyle.strokeWidth));
  params.set("focusWidth", String(focusStyle.width));
  params.set("focusRadius", String(focusStyle.radius));
  params.set("focusPadding", String(focusStyle.padding));
  params.set("focusAnimationIn", focusStyle.animationIn);
  params.set("focusAnimationOut", focusStyle.animationOut);
  params.set("focusDuration", String(focusStyle.durationMs));
  params.set("focusShowProfile", focusStyle.showProfile ? "1" : "0");
  params.set("focusShowBadge", focusStyle.showBadge ? "1" : "0");
  params.set("focusShowUsername", focusStyle.showUsername ? "1" : "0");
  params.set("focusShowTime", focusStyle.showTimestamp ? "1" : "0");
  params.set("focusQuote", focusStyle.showQuoteIcon ? "1" : "0");
  params.set("focusCustom", focusStyle.customDesignEnabled ? "1" : "0");

  if (focusStyle.customDesignEnabled && focusStyle.customDesignId) {
    params.set("focusDesignId", focusStyle.customDesignId);
  } else if (focusStyle.customDesignEnabled) {
    params.set("focusDesign", encodeDesignParam(focusStyle.customDesign));
  }

  if (soundUrl) {
    params.set("sound", soundUrl);
  }

  return params;
}

function encodeDesignParam(design: OverlayCustomDesign) {
  return JSON.stringify(design);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(parsed), min), max);
}

function normalizeCustomDesign(value: OverlayCustomDesign | undefined, fallback: OverlayCustomDesign): OverlayCustomDesign {
  const source = value ?? fallback;
  const width = clampNumber(source.width, fallback.width, 280, 1600);
  const height = clampNumber(source.height, fallback.height, 120, 900);
  const fallbackElements = fallback.elements;

  return {
    width,
    height,
    containerCss: typeof source.containerCss === "string" ? source.containerCss.slice(0, 1200) : fallback.containerCss,
    elements: Object.fromEntries(
      designElementOptions.map((option) => {
        const fallbackElement = fallbackElements[option.value];
        const element = source.elements?.[option.value] ?? fallbackElement;

        return [
          option.value,
          {
            x: clampNumber(element.x, fallbackElement.x, -1000, width + 1000),
            y: clampNumber(element.y, fallbackElement.y, -1000, height + 1000),
            width: clampNumber(element.width, fallbackElement.width, 20, width + 1000),
            height: clampNumber(element.height, fallbackElement.height, 16, height + 1000),
            rotation: clampNumber(element.rotation, getRotateValue(element.css), -180, 180),
            zIndex: clampNumber(element.zIndex, designElementOptions.findIndex((item) => item.value === option.value) + 1, -1000, 1000),
            visible: element.visible !== false,
            css: stripTransformDeclaration(typeof element.css === "string" ? element.css.slice(0, 1000) : fallbackElement.css)
          }
        ];
      })
    ) as Record<OverlayDesignElementKey, OverlayDesignElement>
  };
}

function normalizeChatStyle(style: ChatOverlayStyle): ChatOverlayStyle {
  const animationIn = style.animationIn ?? style.animation ?? defaultChatStyle.animationIn;

  return {
    ...defaultChatStyle,
    ...style,
    animation: animationIn,
    animationIn,
    animationOut: style.animationOut ?? defaultChatStyle.animationOut,
    lineGap: clampNumber(style.lineGap, defaultChatStyle.lineGap, 0, 180),
    maxMessages: clampNumber(style.maxMessages, defaultChatStyle.maxMessages, 1, 10),
    shadowBlur: clampNumber(style.shadowBlur, defaultChatStyle.shadowBlur, 0, 120),
    shadowOffsetX: clampNumber(style.shadowOffsetX, defaultChatStyle.shadowOffsetX, -80, 80),
    shadowOffsetY: clampNumber(style.shadowOffsetY, defaultChatStyle.shadowOffsetY, -80, 80),
    strokeWidth: clampNumber(style.strokeWidth, defaultChatStyle.strokeWidth, 0, 16),
    showJoinEvents: Boolean(style.showJoinEvents),
    showShareEvents: Boolean(style.showShareEvents),
    shadowEnabled: style.shadowEnabled !== false,
    strokeEnabled: Boolean(style.strokeEnabled),
    customDesignEnabled: Boolean(style.customDesignEnabled),
    customDesignId: typeof style.customDesignId === "string" ? style.customDesignId : undefined,
    customDesign: normalizeCustomDesign(style.customDesign, defaultChatStyle.customDesign)
  };
}

function normalizeFocusChatStyle(style: FocusChatStyle): FocusChatStyle {
  return {
    ...defaultFocusChatStyle,
    ...style,
    nameSize: Math.min(Math.max(Math.round(Number(style.nameSize) || defaultFocusChatStyle.nameSize), 10), 72),
    messageSize: Math.min(Math.max(Math.round(Number(style.messageSize) || defaultFocusChatStyle.messageSize), 14), 96),
    width: Math.min(Math.max(Math.round(Number(style.width) || defaultFocusChatStyle.width), 280), 1400),
    radius: Math.min(Math.max(Math.round(Number(style.radius) || defaultFocusChatStyle.radius), 0), 80),
    padding: Math.min(Math.max(Math.round(Number(style.padding) || defaultFocusChatStyle.padding), 8), 80),
    durationMs: Math.min(Math.max(Math.round(Number(style.durationMs) || defaultFocusChatStyle.durationMs), 1000), 60000),
    shadowBlur: clampNumber(style.shadowBlur, defaultFocusChatStyle.shadowBlur, 0, 140),
    shadowOffsetX: clampNumber(style.shadowOffsetX, defaultFocusChatStyle.shadowOffsetX, -100, 100),
    shadowOffsetY: clampNumber(style.shadowOffsetY, defaultFocusChatStyle.shadowOffsetY, -100, 100),
    strokeWidth: clampNumber(style.strokeWidth, defaultFocusChatStyle.strokeWidth, 0, 18),
    showProfile: style.showProfile !== false,
    showBadge: style.showBadge !== false,
    showUsername: style.showUsername !== false,
    showTimestamp: Boolean(style.showTimestamp),
    showQuoteIcon: style.showQuoteIcon !== false,
    shadowEnabled: style.shadowEnabled !== false,
    strokeEnabled: style.strokeEnabled !== false,
    strokeColor: style.strokeColor ?? style.borderColor ?? defaultFocusChatStyle.strokeColor,
    customDesignEnabled: Boolean(style.customDesignEnabled),
    customDesignId: typeof style.customDesignId === "string" ? style.customDesignId : undefined,
    customDesign: normalizeCustomDesign(style.customDesign, defaultFocusChatStyle.customDesign)
  };
}

function normalizeGiftStyle(style: GiftOverlayStyle): GiftOverlayStyle {
  return {
    ...defaultGiftStyle,
    ...style,
    fontSize: Math.min(Math.max(Math.round(Number(style.fontSize) || defaultGiftStyle.fontSize), 12), 72),
    maxItems: Math.min(Math.max(Math.round(Number(style.maxItems) || defaultGiftStyle.maxItems), 1), 10),
    showProfile: style.showProfile !== false,
    showGiftIcon: style.showGiftIcon !== false,
    showCoin: style.showCoin !== false,
    showSparkles: style.showSparkles !== false
  };
}

function isSoundUrl(value: string) {
  return soundOptions.some((option) => option.value === value);
}

function getOptionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function OverlayConfigurator({
  workspaceId,
  widgetBaseUrl,
  overlayKey,
  workspaceName,
  tiktokUsername
}: OverlayConfiguratorProps) {
  const [mode, setMode] = useState<OverlayMode>("gift");
  const [giftTheme, setGiftTheme] = useState("glass");
  const [chatTheme, setChatTheme] = useState("hud");
  const [focusChatTheme, setFocusChatTheme] = useState("spotlight");
  const [leaderboardTheme, setLeaderboardTheme] = useState("crown");
  const [position, setPosition] = useState("top-center");
  const [duration, setDuration] = useState(5000);
  const [allowed, setAllowed] = useState("all");
  const [metric, setMetric] = useState("gift");
  const [period, setPeriod] = useState("realtime");
  const [limit, setLimit] = useState(10);
  const [chatStyle, setChatStyle] = useState<ChatOverlayStyle>(defaultChatStyle);
  const [focusChatStyle, setFocusChatStyle] = useState<FocusChatStyle>(defaultFocusChatStyle);
  const [giftStyle, setGiftStyle] = useState<GiftOverlayStyle>(defaultGiftStyle);
  const [chatSoundUrl, setChatSoundUrl] = useState("");
  const [giftSoundUrl, setGiftSoundUrl] = useState("");
  const [chatFeatureTab, setChatFeatureTab] = useState<ChatFeatureTab>("chat");
  const [workspaceDesigns, setWorkspaceDesigns] = useState<Record<OverlayDesignMode, SavedOverlayDesign[]>>({
    chat: [],
    focus: []
  });
  const [selectedDesignIds, setSelectedDesignIds] = useState<Partial<Record<OverlayDesignMode, string>>>({});
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [focusCustomizeOpen, setFocusCustomizeOpen] = useState(false);
  const [giftCustomizeOpen, setGiftCustomizeOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const effectiveChatStyle = useMemo(() => normalizeChatStyle(chatStyle), [chatStyle]);
  const effectiveFocusChatStyle = useMemo(() => normalizeFocusChatStyle(focusChatStyle), [focusChatStyle]);
  const effectiveGiftStyle = useMemo(() => normalizeGiftStyle(giftStyle), [giftStyle]);
  const storageKey = useMemo(() => `tla:overlay-builder:${overlayKey}`, [overlayKey]);
  const chatStyleOptions = useMemo(
    () => [
      ...chatThemes.map((option) => ({
        value: `theme:${option.value}`,
        label: `Tema: ${option.label}`
      })),
      ...workspaceDesigns.chat.map((design) => ({
        value: `design:${design.id}`,
        label: `Custom: ${design.name}`
      }))
    ],
    [workspaceDesigns.chat]
  );
  const focusStyleOptions = useMemo(
    () => [
      ...focusChatThemes.map((option) => ({
        value: `theme:${option.value}`,
        label: `Tema: ${option.label}`
      })),
      ...workspaceDesigns.focus.map((design) => ({
        value: `design:${design.id}`,
        label: `Custom: ${design.name}`
      }))
    ],
    [workspaceDesigns.focus]
  );
  const chatStyleSelection = effectiveChatStyle.customDesignEnabled && effectiveChatStyle.customDesignId
    ? `design:${effectiveChatStyle.customDesignId}`
    : `theme:${chatTheme}`;
  const focusStyleSelection = effectiveFocusChatStyle.customDesignEnabled && effectiveFocusChatStyle.customDesignId
    ? `design:${effectiveFocusChatStyle.customDesignId}`
    : `theme:${focusChatTheme}`;
  const activeChatStyleLabel = effectiveChatStyle.customDesignEnabled
    ? workspaceDesigns.chat.find((design) => design.id === effectiveChatStyle.customDesignId)?.name ?? "Custom workspace"
    : getOptionLabel(chatThemes, chatTheme);
  const activeFocusStyleLabel = effectiveFocusChatStyle.customDesignEnabled
    ? workspaceDesigns.focus.find((design) => design.id === effectiveFocusChatStyle.customDesignId)?.name ?? "Custom workspace"
    : getOptionLabel(focusChatThemes, focusChatTheme);
  const previewStyleLabel = mode === "gift"
    ? getOptionLabel(giftThemes, giftTheme)
    : mode === "leaderboard"
      ? getOptionLabel(leaderboardThemes, leaderboardTheme)
      : chatFeatureTab === "focus"
        ? activeFocusStyleLabel
        : activeChatStyleLabel;

  const applyWorkspaceOverlayDesigns = useCallback((data: OverlayDesignsResponse) => {
    const designs = data.workspaceDesigns ?? { chat: [], focus: [] };
    const selected = data.selectedDesignIds ?? {};
    const selectedChat = selected.chat ? designs.chat.find((item) => item.id === selected.chat) : null;
    const selectedFocus = selected.focus ? designs.focus.find((item) => item.id === selected.focus) : null;

    setWorkspaceDesigns(designs);
    setSelectedDesignIds(selected);

    if (selectedChat) {
      setChatStyle((current) =>
        normalizeChatStyle({
          ...current,
          customDesignEnabled: true,
          customDesignId: selectedChat.id,
          customDesign: selectedChat.design,
          customJsonDesign: selectedChat.schema
        })
      );
    } else {
      setChatStyle((current) =>
        current.customDesignEnabled || current.customDesignId
          ? normalizeChatStyle({
              ...current,
              customDesignEnabled: false,
              customDesignId: undefined,
              customJsonDesign: undefined
            })
          : current
      );
    }

    if (selectedFocus) {
      setFocusChatStyle((current) =>
        normalizeFocusChatStyle({
          ...current,
          customDesignEnabled: true,
          customDesignId: selectedFocus.id,
          customDesign: selectedFocus.design
        })
      );
    } else {
      setFocusChatStyle((current) =>
        current.customDesignEnabled || current.customDesignId
          ? normalizeFocusChatStyle({
              ...current,
              customDesignEnabled: false,
              customDesignId: undefined
            })
          : current
      );
    }
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<OverlayBuilderState>;

        if (saved.mode) setMode(saved.mode);
        if (saved.giftTheme) setGiftTheme(saved.giftTheme);
        if (saved.chatTheme) setChatTheme(saved.chatTheme);
        if (saved.focusChatTheme) setFocusChatTheme(saved.focusChatTheme);
        if (saved.leaderboardTheme) setLeaderboardTheme(saved.leaderboardTheme);
        if (saved.position) setPosition(saved.position);
        if (typeof saved.duration === "number") setDuration(saved.duration);
        if (saved.allowed) setAllowed(saved.allowed);
        if (saved.metric) setMetric(saved.metric);
        if (saved.period) setPeriod(saved.period);
        if (typeof saved.limit === "number") setLimit(saved.limit);
        if (saved.chatStyle) setChatStyle(normalizeChatStyle(saved.chatStyle));
        if (saved.focusChatStyle) setFocusChatStyle(normalizeFocusChatStyle(saved.focusChatStyle));
        if (saved.giftStyle) setGiftStyle(normalizeGiftStyle(saved.giftStyle));
        if (saved.chatSoundUrl && isSoundUrl(saved.chatSoundUrl)) setChatSoundUrl(saved.chatSoundUrl);
        if (saved.giftSoundUrl && isSoundUrl(saved.giftSoundUrl)) setGiftSoundUrl(saved.giftSoundUrl);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setSettingsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/workspaces/${workspaceId}/overlay-designs`)
      .then((response) => response.json())
      .then((data: OverlayDesignsResponse) => {
        if (cancelled) {
          return;
        }

        applyWorkspaceOverlayDesigns(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [applyWorkspaceOverlayDesigns, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    const refreshDesigns = () => {
      fetch(`/api/workspaces/${workspaceId}/overlay-designs`)
        .then((response) => response.json())
        .then((data: OverlayDesignsResponse) => {
          if (!cancelled) {
            applyWorkspaceOverlayDesigns(data);
          }
        })
        .catch(() => undefined);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshDesigns();
      }
    };

    window.addEventListener("focus", refreshDesigns);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshDesigns);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [applyWorkspaceOverlayDesigns, workspaceId]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    const payload: OverlayBuilderState = {
      mode,
      giftTheme,
      chatTheme,
      focusChatTheme,
      leaderboardTheme,
      position,
      duration,
      allowed,
      metric,
      period,
      limit,
      chatStyle: effectiveChatStyle,
      focusChatStyle: effectiveFocusChatStyle,
      giftStyle: effectiveGiftStyle,
      chatSoundUrl,
      giftSoundUrl,
      activeChatDesignId: selectedDesignIds.chat,
      activeFocusDesignId: selectedDesignIds.focus
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    allowed,
    chatSoundUrl,
    chatTheme,
    duration,
    effectiveChatStyle,
    effectiveFocusChatStyle,
    effectiveGiftStyle,
    focusChatTheme,
    giftSoundUrl,
    giftTheme,
    leaderboardTheme,
    limit,
    metric,
    mode,
    period,
    position,
    selectedDesignIds.chat,
    selectedDesignIds.focus,
    settingsLoaded,
    storageKey
  ]);

  const chatOverlayParams = useMemo(
    () =>
      buildChatOverlayParams({
        allowed,
        position,
        chatStyle: effectiveChatStyle,
        soundUrl: chatSoundUrl
      }),
    [allowed, chatSoundUrl, effectiveChatStyle, position]
  );

  const focusChatOverlayParams = useMemo(
    () =>
      buildFocusChatOverlayParams({
        position,
        focusStyle: effectiveFocusChatStyle,
        soundUrl: chatSoundUrl
      }),
    [chatSoundUrl, effectiveFocusChatStyle, position]
  );

  const liveOverlayUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (mode === "gift") {
      params.set("position", position);
      params.set("duration", String(duration));
      params.set("giftFont", effectiveGiftStyle.font);
      params.set("giftFontSize", String(effectiveGiftStyle.fontSize));
      params.set("giftFontColor", effectiveGiftStyle.fontColor);
      params.set("giftBgColor", effectiveGiftStyle.backgroundColor);
      params.set("giftAccentColor", effectiveGiftStyle.accentColor);
      params.set("giftAnimationIn", effectiveGiftStyle.animationIn);
      params.set("giftAnimationOut", effectiveGiftStyle.animationOut);
      params.set("giftMaxItems", String(effectiveGiftStyle.maxItems));
      params.set("giftShowProfile", effectiveGiftStyle.showProfile ? "1" : "0");
      params.set("giftShowIcon", effectiveGiftStyle.showGiftIcon ? "1" : "0");
      params.set("giftShowCoin", effectiveGiftStyle.showCoin ? "1" : "0");
      params.set("giftSparkles", effectiveGiftStyle.showSparkles ? "1" : "0");
      if (giftSoundUrl) {
        params.set("sound", giftSoundUrl);
      }
      return `${widgetBaseUrl}/widgets/gift/${giftTheme}/${overlayKey}?${params.toString()}`;
    }

    if (mode === "chat") {
      return `${widgetBaseUrl}/widgets/chat/${chatTheme}/${overlayKey}?${chatOverlayParams.toString()}`;
    }

    params.set("theme", leaderboardTheme);
    params.set("period", period);
    params.set("limit", String(limit));
    params.set("position", position);

    return `${widgetBaseUrl}/widgets/leaderboard/${metric}/${overlayKey}?${params.toString()}`;
  }, [
    chatTheme,
    chatOverlayParams,
    effectiveGiftStyle,
    duration,
    giftSoundUrl,
    giftTheme,
    leaderboardTheme,
    limit,
    metric,
    mode,
    overlayKey,
    period,
    position,
    widgetBaseUrl
  ]);
  const focusChatOverlayUrl = useMemo(
    () => `${widgetBaseUrl}/widgets/chat-focus/${focusChatTheme}/${overlayKey}?${focusChatOverlayParams.toString()}`,
    [focusChatOverlayParams, focusChatTheme, overlayKey, widgetBaseUrl]
  );
  const chatDockUrl = useMemo(
    () => `${widgetBaseUrl}/widgets/dock/chat/${overlayKey}`,
    [overlayKey, widgetBaseUrl]
  );
  const previewOverlayUrl = useMemo(() => addPreviewFlag(liveOverlayUrl), [liveOverlayUrl]);
  const activePreviewUrl = mode === "chat" && chatFeatureTab === "focus"
    ? addPreviewFlag(focusChatOverlayUrl)
    : previewOverlayUrl;

  async function selectWorkspaceOverlayDesign(designMode: OverlayDesignMode, designId: string) {
    const selectedDesign = designId
      ? workspaceDesigns[designMode].find((item) => item.id === designId)
      : null;

    if (designId && !selectedDesign) {
      return;
    }

    setSelectedDesignIds((current) => ({
      ...current,
      [designMode]: designId || undefined
    }));

    if (designMode === "chat") {
      setChatStyle((current) =>
        normalizeChatStyle({
          ...current,
          customDesignEnabled: Boolean(selectedDesign),
          customDesignId: selectedDesign?.id,
          customDesign: selectedDesign?.design ?? current.customDesign,
          customJsonDesign: selectedDesign?.schema
        })
      );
    } else {
      setFocusChatStyle((current) =>
        normalizeFocusChatStyle({
          ...current,
          customDesignEnabled: Boolean(selectedDesign),
          customDesignId: selectedDesign?.id,
          customDesign: selectedDesign?.design ?? current.customDesign
        })
      );
    }

    try {
      await fetch(`/api/workspaces/${workspaceId}/overlay-designs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: designMode,
          selectedDesignId: designId || null
        })
      });
    } catch {
      // Local preview can still update; OBS keeps the last saved config if this request fails.
    }
  }

  function selectChatStyle(value: string) {
    if (value.startsWith("design:")) {
      void selectWorkspaceOverlayDesign("chat", value.replace("design:", ""));
      return;
    }

    const nextTheme = value.replace("theme:", "");

    setChatTheme(nextTheme);
    void selectWorkspaceOverlayDesign("chat", "");
  }

  function selectFocusStyle(value: string) {
    if (value.startsWith("design:")) {
      void selectWorkspaceOverlayDesign("focus", value.replace("design:", ""));
      return;
    }

    const nextTheme = value.replace("theme:", "");

    setFocusChatTheme(nextTheme);
    void selectWorkspaceOverlayDesign("focus", "");
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">Overlay Builder</h2>
              <Badge variant={tiktokUsername ? "default" : "destructive"}>
                {tiktokUsername ? `@${tiktokUsername}` : "TikTok username belum diisi"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih tipe overlay, tema, posisi, dan sumber data. URL yang muncul bisa langsung dipakai di OBS.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={activePreviewUrl} target="_blank">
              <ExternalLink />
              Open Preview
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ModeButton
            active={mode === "gift"}
            icon={<Gift className="size-5" />}
            label="Gift Overlay"
            description="Alert, history, atau running text gift."
            onClick={() => setMode("gift")}
          />
          <ModeButton
            active={mode === "chat"}
            icon={<MessageCircle className="size-5" />}
            label="Chat Overlay"
            description="Tampilkan komentar live dengan tema."
            onClick={() => setMode("chat")}
          />
          <ModeButton
            active={mode === "leaderboard"}
            icon={<Trophy className="size-5" />}
            label="Leaderboard"
            description="Top gifter, like, atau chat ranking."
            onClick={() => setMode("leaderboard")}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-5">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-lg font-semibold">URL Overlay</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Browser Source memakai URL live tanpa data contoh. Tombol preview memakai URL terpisah dengan data contoh.
            </p>

            {mode === "chat" ? (
              <div className="mt-4 grid gap-4">
                <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-1">
                  <TabButton active={chatFeatureTab === "chat"} label="Chat Overlay" onClick={() => setChatFeatureTab("chat")} />
                  <TabButton active={chatFeatureTab === "focus"} label="Focus Chat + Dock" onClick={() => setChatFeatureTab("focus")} />
                </div>

                {chatFeatureTab === "chat" ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="overlayUrl">Chat Overlay Browser Source URL</Label>
                      <Input id="overlayUrl" readOnly value={liveOverlayUrl} />
                      <p className="text-xs text-muted-foreground">
                        URL OBS tetap sama. Perubahan style otomatis mengikuti pilihan Style Chat Overlay.
                      </p>
                    </div>
                    <CopyButton value={liveOverlayUrl} />
                    <Button asChild variant="outline">
                      <Link href={previewOverlayUrl} target="_blank">
                        <ExternalLink />
                        Preview
                      </Link>
                    </Button>
                  </div>
                ) : null}

                {chatFeatureTab === "focus" ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="focusChatOverlayUrl">Focus Chat Overlay URL</Label>
                        <Input id="focusChatOverlayUrl" readOnly value={focusChatOverlayUrl} />
                      </div>
                      <CopyButton value={focusChatOverlayUrl} />
                      <Button asChild variant="outline">
                        <Link href={addPreviewFlag(focusChatOverlayUrl)} target="_blank">
                          <ExternalLink />
                          Preview
                        </Link>
                      </Button>
                    </div>

                    <div className="grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="chatDockUrl">Dock Chat History URL</Label>
                        <Input id="chatDockUrl" readOnly value={chatDockUrl} />
                      </div>
                      <CopyButton value={chatDockUrl} />
                      <Button asChild variant="outline">
                        <Link href={chatDockUrl} target="_blank">
                          <ExternalLink />
                          Buka Dock
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="overlayUrl">Browser Source URL</Label>
                  <Input id="overlayUrl" readOnly value={liveOverlayUrl} />
                </div>
                <CopyButton value={liveOverlayUrl} />
                <Button asChild variant="outline">
                  <Link href={previewOverlayUrl} target="_blank">
                    <ExternalLink />
                    Preview
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-lg font-semibold">Pilihan Overlay</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {mode === "gift" ? (
                <>
                  <SelectField
                    id="giftTheme"
                    label="Tema Gift"
                    value={giftTheme}
                    onChange={setGiftTheme}
                    options={giftThemes}
                  />
                  <SelectField
                    id="position"
                    label="Posisi"
                    value={position}
                    onChange={setPosition}
                    options={positions}
                  />
                  <NumberField
                    id="duration"
                    label="Durasi alert ms"
                    value={duration}
                    min={1500}
                    max={15000}
                    step={500}
                    onChange={setDuration}
                  />
                  <SelectField
                    id="giftAnimationIn"
                    label="Animasi masuk"
                    value={effectiveGiftStyle.animationIn}
                    onChange={(animationIn) => setGiftStyle((current) => ({ ...current, animationIn }))}
                    options={animationInOptions}
                  />
                  <SelectField
                    id="giftAnimationOut"
                    label="Animasi keluar"
                    value={effectiveGiftStyle.animationOut}
                    onChange={(animationOut) => setGiftStyle((current) => ({ ...current, animationOut }))}
                    options={animationOutOptions}
                  />
                  <NumberField
                    id="giftMaxItems"
                    label="Jumlah gift tampil"
                    value={effectiveGiftStyle.maxItems}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(maxItems) => setGiftStyle((current) => ({ ...current, maxItems }))}
                  />
                  <SoundField
                    id="giftSound"
                    label="Sound gift"
                    value={giftSoundUrl}
                    onChange={setGiftSoundUrl}
                    options={soundOptions}
                  />
                  <div className="md:col-span-2">
                    <Button type="button" variant="outline" onClick={() => setGiftCustomizeOpen(true)}>
                      <Settings />
                      Customize Gift Overlay
                    </Button>
                  </div>
                </>
              ) : null}

              {mode === "chat" ? (
                <>
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-1">
                      <TabButton active={chatFeatureTab === "chat"} label="Chat Overlay" onClick={() => setChatFeatureTab("chat")} />
                      <TabButton active={chatFeatureTab === "focus"} label="Focus Chat" onClick={() => setChatFeatureTab("focus")} />
                    </div>
                  </div>

                  {chatFeatureTab === "chat" ? (
                    <>
                      <SelectField
                        id="chatTheme"
                        label="Style Chat Overlay"
                        value={chatStyleSelection}
                        onChange={selectChatStyle}
                        options={chatStyleOptions}
                      />
                      <SelectField
                        id="allowed"
                        label="Allowed Users"
                        value={allowed}
                        onChange={setAllowed}
                        options={[
                          { value: "all", label: "Semua Orang" },
                          { value: "follower", label: "Follower" },
                          { value: "friend", label: "Teman" },
                          { value: "subscriber", label: "Subscriber / SuperFan" },
                          { value: "moderator", label: "Moderator" },
                          { value: "topgifter", label: "Top Gifter" }
                        ]}
                      />
                      <SelectField
                        id="chatPosition"
                        label="Posisi Chat Overlay"
                        value={position}
                        onChange={setPosition}
                        options={positions}
                      />
                      <NumberField
                        id="chatMaxMessagesQuick"
                        label="Jumlah chat tampil"
                        value={effectiveChatStyle.maxMessages}
                        min={1}
                        max={10}
                        step={1}
                        onChange={(maxMessages) => setChatStyle((current) => ({ ...current, maxMessages }))}
                      />
                      <NumberField
                        id="chatLineGapQuick"
                        label="Jarak antar list"
                        value={effectiveChatStyle.lineGap}
                        min={0}
                        max={180}
                        step={1}
                        onChange={(lineGap) => setChatStyle((current) => ({ ...current, lineGap }))}
                      />
                      <SelectField
                        id="chatAnimationInQuick"
                        label="Chat animasi masuk"
                        value={effectiveChatStyle.animationIn}
                        onChange={(animationIn) => setChatStyle((current) => ({ ...current, animation: animationIn, animationIn }))}
                        options={animationInOptions}
                      />
                      <SelectField
                        id="chatAnimationOutQuick"
                        label="Chat animasi keluar"
                        value={effectiveChatStyle.animationOut}
                        onChange={(animationOut) => setChatStyle((current) => ({ ...current, animationOut }))}
                        options={animationOutOptions}
                      />
                      <SoundField
                        id="chatSound"
                        label="Sound chat"
                        value={chatSoundUrl}
                        onChange={setChatSoundUrl}
                        options={soundOptions}
                      />
                      <div className="flex items-end">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/dashboard/workspaces/${workspaceId}/overlay-design-builder`}>
                            <LayoutTemplate />
                            Design Builder
                          </Link>
                        </Button>
                      </div>
                      <div className="md:col-span-2">
                        <Button type="button" variant="outline" onClick={() => setCustomizeOpen(true)}>
                          <Settings />
                          Customize Chat Overlay
                        </Button>
                      </div>
                    </>
                  ) : null}

                  {chatFeatureTab === "focus" ? (
                    <>
                      <SelectField
                        id="focusChatTheme"
                        label="Style Focus Chat"
                        value={focusStyleSelection}
                        onChange={selectFocusStyle}
                        options={focusStyleOptions}
                      />
                      <SelectField
                        id="focusPosition"
                        label="Posisi Focus Chat"
                        value={position}
                        onChange={setPosition}
                        options={positions}
                      />
                      <SelectField
                        id="focusAnimationInQuick"
                        label="Focus animasi masuk"
                        value={effectiveFocusChatStyle.animationIn}
                        onChange={(animationIn) => setFocusChatStyle((current) => ({ ...current, animationIn }))}
                        options={animationInOptions}
                      />
                      <NumberField
                        id="focusDurationQuick"
                        label="Durasi focus ms"
                        value={effectiveFocusChatStyle.durationMs}
                        min={1000}
                        max={60000}
                        step={500}
                        onChange={(durationMs) => setFocusChatStyle((current) => ({ ...current, durationMs }))}
                      />
                      <SelectField
                        id="focusAnimationOutQuick"
                        label="Focus animasi keluar"
                        value={effectiveFocusChatStyle.animationOut}
                        onChange={(animationOut) => setFocusChatStyle((current) => ({ ...current, animationOut }))}
                        options={animationOutOptions}
                      />
                      <SoundField
                        id="focusSound"
                        label="Sound focus chat"
                        value={chatSoundUrl}
                        onChange={setChatSoundUrl}
                        options={soundOptions}
                      />
                      <div className="flex items-end">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/dashboard/workspaces/${workspaceId}/overlay-design-builder`}>
                            <LayoutTemplate />
                            Design Builder
                          </Link>
                        </Button>
                      </div>
                      <div className="md:col-span-2">
                        <Button type="button" variant="outline" onClick={() => setFocusCustomizeOpen(true)}>
                          <Settings />
                          Customize Focus Chat
                        </Button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}

              {mode === "leaderboard" ? (
                <>
                  <SelectField
                    id="leaderboardTheme"
                    label="Tema Leaderboard"
                    value={leaderboardTheme}
                    onChange={setLeaderboardTheme}
                    options={leaderboardThemes}
                  />
                  <SelectField
                    id="metric"
                    label="Sumber Data"
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: "gift", label: "Top Gifter" },
                      { value: "like", label: "Like Leaderboard" },
                      { value: "chat", label: "Chat Leaderboard" }
                    ]}
                  />
                  <SelectField
                    id="period"
                    label="Periode"
                    value={period}
                    onChange={setPeriod}
                    options={[
                      { value: "realtime", label: "Realtime" },
                      { value: "7d", label: "7 Hari Terakhir" },
                      { value: "14d", label: "14 Hari Terakhir" },
                      { value: "30d", label: "30 Hari Terakhir" },
                      { value: "month", label: "Bulan Sekarang" }
                    ]}
                  />
                  <NumberField
                    id="limit"
                    label="Jumlah ranking"
                    value={limit}
                    min={3}
                    max={20}
                    step={1}
                    onChange={setLimit}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <PreviewPanel
          mode={mode}
          theme={mode === "gift" ? giftTheme : mode === "chat" ? chatTheme : leaderboardTheme}
          styleLabel={previewStyleLabel}
          chatFeatureTab={chatFeatureTab}
          focusTheme={focusChatTheme}
          metric={metric}
          workspaceName={workspaceName}
          chatStyle={effectiveChatStyle}
          focusChatStyle={effectiveFocusChatStyle}
          giftStyle={effectiveGiftStyle}
        />
      </div>

      {giftCustomizeOpen ? (
        <GiftCustomizeModal
          theme={giftTheme}
          value={effectiveGiftStyle}
          defaultValue={defaultGiftStyle}
          onSave={(nextValue) => {
            setGiftStyle(normalizeGiftStyle(nextValue));
            setGiftCustomizeOpen(false);
          }}
          onClose={() => setGiftCustomizeOpen(false)}
        />
      ) : null}

      {customizeOpen ? (
        <ChatCustomizeModal
          theme={chatTheme}
          value={effectiveChatStyle}
          defaultValue={defaultChatStyle}
          designBuilderHref={`/dashboard/workspaces/${workspaceId}/overlay-design-builder`}
          onSave={(nextValue) => {
            setChatStyle(normalizeChatStyle(nextValue));
            setCustomizeOpen(false);
          }}
          onClose={() => setCustomizeOpen(false)}
        />
      ) : null}

      {focusCustomizeOpen ? (
        <FocusChatCustomizeModal
          theme={focusChatTheme}
          value={effectiveFocusChatStyle}
          defaultValue={defaultFocusChatStyle}
          designBuilderHref={`/dashboard/workspaces/${workspaceId}/overlay-design-builder`}
          onSave={(nextValue) => {
            setFocusChatStyle(normalizeFocusChatStyle(nextValue));
            setFocusCustomizeOpen(false);
          }}
          onClose={() => setFocusCustomizeOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  description,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "hover:bg-muted"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SoundField({
  id,
  label,
  value,
  onChange,
  options
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" disabled={!value} onClick={() => playSoundPreview(value)}>
          <Volume2 />
          Test
        </Button>
      </div>
    </div>
  );
}

function playSoundPreview(soundUrl: string) {
  if (!soundUrl || typeof window === "undefined") {
    return;
  }

  const audio = new Audio(soundUrl);
  audio.currentTime = 0;
  audio.play().catch(() => undefined);
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function GiftCustomizeModal({
  theme,
  value,
  defaultValue,
  onSave,
  onClose
}: {
  theme: string;
  value: GiftOverlayStyle;
  defaultValue: GiftOverlayStyle;
  onSave: (value: GiftOverlayStyle) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  function update<K extends keyof GiftOverlayStyle>(key: K, nextValue: GiftOverlayStyle[K]) {
    setDraft((current) => ({
      ...current,
      [key]: nextValue
    }));
  }

  function saveChanges() {
    onSave({
      ...draft,
      maxItems: Math.min(Math.max(Math.round(draft.maxItems), 1), 10),
      fontSize: Math.min(Math.max(Math.round(draft.fontSize), 12), 72)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-lg border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Customize Gift Overlay - {theme.toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground">Atur warna, font, list, elemen visual, dan efek interaktif gift.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="grid max-h-[calc(86vh-8.5rem)] gap-5 overflow-y-auto p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <SelectField
              id="giftFont"
              label="Pilih Font"
              value={draft.font}
              onChange={(nextValue) => update("font", nextValue)}
              options={[
                { value: "Outfit", label: "Outfit" },
                { value: "Inter", label: "Inter" },
                { value: "Poppins", label: "Poppins" },
                { value: "Montserrat", label: "Montserrat" },
                { value: "Roboto", label: "Roboto" },
                { value: "Geist Mono", label: "Geist Mono" }
              ]}
            />
            <NumberField
              id="giftFontSizeModal"
              label="Ukuran Font"
              value={draft.fontSize}
              min={12}
              max={72}
              step={1}
              onChange={(nextValue) => update("fontSize", nextValue)}
            />
            <NumberField
              id="giftMaxItemsModal"
              label="Jumlah gift tampil"
              value={draft.maxItems}
              min={1}
              max={10}
              step={1}
              onChange={(nextValue) => update("maxItems", nextValue)}
            />
            <SelectField
              id="giftAnimationModal"
              label="Animasi masuk"
              value={draft.animationIn}
              onChange={(nextValue) => update("animationIn", nextValue)}
              options={animationInOptions}
            />
            <SelectField
              id="giftAnimationOutModal"
              label="Animasi keluar"
              value={draft.animationOut}
              onChange={(nextValue) => update("animationOut", nextValue)}
              options={animationOutOptions}
            />
            <div className="grid gap-3 pt-1">
              <CheckboxField
                id="giftShowProfile"
                label="Foto profil"
                checked={draft.showProfile}
                onChange={(checked) => update("showProfile", checked)}
              />
              <CheckboxField
                id="giftShowIcon"
                label="Ikon gift"
                checked={draft.showGiftIcon}
                onChange={(checked) => update("showGiftIcon", checked)}
              />
              <CheckboxField
                id="giftShowCoin"
                label="Tampilkan coin/count"
                checked={draft.showCoin}
                onChange={(checked) => update("showCoin", checked)}
              />
              <CheckboxField
                id="giftSparkles"
                label="Efek sparkles/pulse"
                checked={draft.showSparkles}
                onChange={(checked) => update("showSparkles", checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <ColorField
              id="giftFontColor"
              label="Warna Font"
              value={draft.fontColor}
              onChange={(nextValue) => update("fontColor", nextValue)}
            />
            <ColorField
              id="giftBgColor"
              label="Warna Background"
              value={draft.backgroundColor}
              onChange={(nextValue) => update("backgroundColor", nextValue)}
            />
            <ColorField
              id="giftAccentColor"
              label="Warna Aksen"
              value={draft.accentColor}
              onChange={(nextValue) => update("accentColor", nextValue)}
            />

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Preview gift style</p>
              <div
                className="mt-3 rounded-lg border px-4 py-3 shadow-xl"
                style={{
                  backgroundColor: draft.backgroundColor,
                  borderColor: draft.accentColor,
                  color: draft.fontColor,
                  fontFamily: draft.font
                }}
              >
                <div className="flex items-center gap-3">
                  {draft.showProfile ? (
                    <div className="grid size-10 place-items-center rounded-full font-bold text-white" style={{ backgroundColor: draft.accentColor }}>
                      V
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold" style={{ color: draft.accentColor }}>
                      Example Gifter
                    </p>
                    <p style={{ fontSize: draft.fontSize }}>Rose x3</p>
                  </div>
                  {draft.showGiftIcon ? <Gift className="size-8" style={{ color: draft.accentColor }} /> : null}
                </div>
              </div>
            </div>

            <Button type="button" variant="destructive" className="w-full" onClick={() => setDraft(defaultValue)}>
              <RotateCcw />
              Reset Default
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t p-5 sm:grid-cols-[auto_1fr]">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={saveChanges}>
            Konfirmasi Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatCustomizeModal({
  theme,
  value,
  defaultValue,
  designBuilderHref,
  onSave,
  onClose
}: {
  theme: string;
  value: ChatOverlayStyle;
  defaultValue: ChatOverlayStyle;
  designBuilderHref: string;
  onSave: (value: ChatOverlayStyle) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  function update<K extends keyof ChatOverlayStyle>(key: K, nextValue: ChatOverlayStyle[K]) {
    setDraft((current) => ({
      ...current,
      [key]: nextValue
    }));
  }

  function saveChanges() {
    onSave({
      ...draft,
      animation: draft.animationIn,
      maxMessages: Math.min(Math.max(Math.round(draft.maxMessages), 1), 10)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-lg border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Customize Overlay - {theme.toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground">Atur font, warna role, animasi, badge, dan profile.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="grid max-h-[calc(86vh-8.5rem)] gap-5 overflow-y-auto p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <SelectField
              id="chatFont"
              label="Pilih Font"
              value={draft.font}
              onChange={(nextValue) => update("font", nextValue)}
              options={[
                { value: "Outfit", label: "Outfit" },
                { value: "Inter", label: "Inter" },
                { value: "Poppins", label: "Poppins" },
                { value: "Montserrat", label: "Montserrat" },
                { value: "Roboto", label: "Roboto" },
                { value: "Geist Mono", label: "Geist Mono" }
              ]}
            />
            <NumberField
              id="chatFontSize"
              label="Ukuran Font"
              value={draft.fontSize}
              min={10}
              max={64}
              step={1}
              onChange={(nextValue) => update("fontSize", nextValue)}
            />
            <NumberField
              id="chatLineGap"
              label="Jarak antar list chat"
              value={draft.lineGap}
              min={0}
              max={180}
              step={1}
              onChange={(nextValue) => update("lineGap", nextValue)}
            />
            <NumberField
              id="chatLetterSpacing"
              label="Jarak Karakter"
              value={draft.letterSpacing}
              min={0}
              max={8}
              step={0.5}
              onChange={(nextValue) => update("letterSpacing", nextValue)}
            />
            <SelectField
              id="chatAnimation"
              label="Animasi masuk"
              value={draft.animationIn}
              onChange={(nextValue) => update("animationIn", nextValue)}
              options={animationInOptions}
            />
            <SelectField
              id="chatAnimationOut"
              label="Animasi keluar"
              value={draft.animationOut}
              onChange={(nextValue) => update("animationOut", nextValue)}
              options={animationOutOptions}
            />
            <NumberField
              id="chatHideAfter"
              label="Chat hilang setelah ms"
              value={draft.hideAfterMs}
              min={0}
              max={60000}
              step={500}
              onChange={(nextValue) => update("hideAfterMs", nextValue)}
            />
            <NumberField
              id="chatMaxMessages"
              label="Jumlah chat tampil"
              value={draft.maxMessages}
              min={1}
              max={10}
              step={1}
              onChange={(nextValue) => update("maxMessages", nextValue)}
            />
            <div className="grid gap-3 pt-1">
              <CheckboxField
                id="chatAlignRight"
                label="Rata kanan"
                checked={draft.alignRight}
                onChange={(checked) => update("alignRight", checked)}
              />
              <CheckboxField
                id="chatShowProfile"
                label="Foto profil"
                checked={draft.showProfile}
                onChange={(checked) => update("showProfile", checked)}
              />
              <CheckboxField
                id="chatShowBadge"
                label="Show badge"
                checked={draft.showBadge}
                onChange={(checked) => update("showBadge", checked)}
              />
              <CheckboxField
                id="chatShowJoin"
                label="Info join live"
                checked={draft.showJoinEvents}
                onChange={(checked) => update("showJoinEvents", checked)}
              />
              <CheckboxField
                id="chatShowShare"
                label="Info share live"
                checked={draft.showShareEvents}
                onChange={(checked) => update("showShareEvents", checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <ColorField
              id="chatFontColor"
              label="Warna Font"
              value={draft.fontColor}
              onChange={(nextValue) => update("fontColor", nextValue)}
            />
            <ColorField
              id="chatBgColor"
              label="Warna Background"
              value={draft.backgroundColor}
              onChange={(nextValue) => update("backgroundColor", nextValue)}
            />
            <ColorField
              id="moderatorColor"
              label="Moderator"
              value={draft.moderatorColor}
              onChange={(nextValue) => update("moderatorColor", nextValue)}
            />
            <ColorField
              id="subscriberColor"
              label="Subscriber / SuperFan"
              value={draft.subscriberColor}
              onChange={(nextValue) => update("subscriberColor", nextValue)}
            />
            <ColorField
              id="followerColor"
              label="Follower"
              value={draft.followerColor}
              onChange={(nextValue) => update("followerColor", nextValue)}
            />
            <ColorField
              id="friendColor"
              label="Teman"
              value={draft.friendColor}
              onChange={(nextValue) => update("friendColor", nextValue)}
            />

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="chatShadowEnabled"
                  label="Shadow aktif"
                  checked={draft.shadowEnabled}
                  onChange={(checked) => update("shadowEnabled", checked)}
                />
                <ColorField
                  id="chatShadowColor"
                  label="Warna shadow"
                  value={draft.shadowColor}
                  onChange={(nextValue) => update("shadowColor", nextValue)}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberField
                    id="chatShadowBlur"
                    label="Ketebalan shadow"
                    value={draft.shadowBlur}
                    min={0}
                    max={120}
                    step={1}
                    onChange={(nextValue) => update("shadowBlur", nextValue)}
                  />
                  <NumberField
                    id="chatShadowX"
                    label="Shadow X"
                    value={draft.shadowOffsetX}
                    min={-80}
                    max={80}
                    step={1}
                    onChange={(nextValue) => update("shadowOffsetX", nextValue)}
                  />
                  <NumberField
                    id="chatShadowY"
                    label="Shadow Y"
                    value={draft.shadowOffsetY}
                    min={-80}
                    max={80}
                    step={1}
                    onChange={(nextValue) => update("shadowOffsetY", nextValue)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="chatStrokeEnabled"
                  label="Stroke aktif"
                  checked={draft.strokeEnabled}
                  onChange={(checked) => update("strokeEnabled", checked)}
                />
                <ColorField
                  id="chatStrokeColor"
                  label="Warna stroke"
                  value={draft.strokeColor}
                  onChange={(nextValue) => update("strokeColor", nextValue)}
                />
                <NumberField
                  id="chatStrokeWidth"
                  label="Ketebalan stroke"
                  value={draft.strokeWidth}
                  min={0}
                  max={16}
                  step={1}
                  onChange={(nextValue) => update("strokeWidth", nextValue)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="chatCustomDesignEnabled"
                  label="Aktifkan design builder custom"
                  checked={draft.customDesignEnabled}
                  onChange={(checked) => update("customDesignEnabled", checked)}
                />
                <Button asChild variant="outline">
                  <Link href={designBuilderHref}>
                    <LayoutTemplate />
                    Buka Design Builder Chat
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Preview nama role</p>
              <div className="mt-3 space-y-2 text-sm" style={{ fontFamily: draft.font }}>
                <p style={{ color: draft.moderatorColor }}>Moderator User: komentar moderator.</p>
                <p style={{ color: draft.subscriberColor }}>Subscriber User: warna nama mengikuti pilihan.</p>
                <p style={{ color: draft.followerColor }}>Follower User: komentar follower.</p>
                <p style={{ color: draft.friendColor }}>Friend User: komentar teman.</p>
              </div>
            </div>

            <Button type="button" variant="destructive" className="w-full" onClick={() => setDraft(defaultValue)}>
              <RotateCcw />
              Reset Default
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t p-5 sm:grid-cols-[auto_1fr]">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={saveChanges}>
            Konfirmasi Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

function FocusChatCustomizeModal({
  theme,
  value,
  defaultValue,
  designBuilderHref,
  onSave,
  onClose
}: {
  theme: string;
  value: FocusChatStyle;
  defaultValue: FocusChatStyle;
  designBuilderHref: string;
  onSave: (value: FocusChatStyle) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  function update<K extends keyof FocusChatStyle>(key: K, nextValue: FocusChatStyle[K]) {
    setDraft((current) => ({
      ...current,
      [key]: nextValue
    }));
  }

  function saveChanges() {
    onSave(normalizeFocusChatStyle(draft));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-lg border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Customize Focus Chat - {theme.toUpperCase()}</h3>
            <p className="text-sm text-muted-foreground">Atur style khusus untuk chat yang dikirim dari dock history.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="grid max-h-[calc(86vh-8.5rem)] gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <SelectField
              id="focusFont"
              label="Pilih Font"
              value={draft.font}
              onChange={(nextValue) => update("font", nextValue)}
              options={[
                { value: "Outfit", label: "Outfit" },
                { value: "Inter", label: "Inter" },
                { value: "Poppins", label: "Poppins" },
                { value: "Montserrat", label: "Montserrat" },
                { value: "Roboto", label: "Roboto" },
                { value: "Geist Mono", label: "Geist Mono" }
              ]}
            />
            <NumberField
              id="focusNameSize"
              label="Ukuran nama"
              value={draft.nameSize}
              min={10}
              max={72}
              step={1}
              onChange={(nextValue) => update("nameSize", nextValue)}
            />
            <NumberField
              id="focusMessageSize"
              label="Ukuran komentar"
              value={draft.messageSize}
              min={14}
              max={96}
              step={1}
              onChange={(nextValue) => update("messageSize", nextValue)}
            />
            <NumberField
              id="focusWidth"
              label="Lebar overlay"
              value={draft.width}
              min={280}
              max={1400}
              step={20}
              onChange={(nextValue) => update("width", nextValue)}
            />
            <NumberField
              id="focusRadius"
              label="Radius sudut"
              value={draft.radius}
              min={0}
              max={80}
              step={1}
              onChange={(nextValue) => update("radius", nextValue)}
            />
            <NumberField
              id="focusPadding"
              label="Padding"
              value={draft.padding}
              min={8}
              max={80}
              step={2}
              onChange={(nextValue) => update("padding", nextValue)}
            />
          </div>

          <div className="space-y-4">
            <SelectField
              id="focusAnimationIn"
              label="Animasi masuk"
              value={draft.animationIn}
              onChange={(nextValue) => update("animationIn", nextValue)}
              options={animationInOptions}
            />
            <SelectField
              id="focusAnimationOut"
              label="Animasi keluar"
              value={draft.animationOut}
              onChange={(nextValue) => update("animationOut", nextValue)}
              options={animationOutOptions}
            />
            <NumberField
              id="focusDuration"
              label="Durasi tampil ms"
              value={draft.durationMs}
              min={1000}
              max={60000}
              step={500}
              onChange={(nextValue) => update("durationMs", nextValue)}
            />
            <div className="grid gap-3 pt-1">
              <CheckboxField
                id="focusShowProfile"
                label="Foto profil"
                checked={draft.showProfile}
                onChange={(checked) => update("showProfile", checked)}
              />
              <CheckboxField
                id="focusShowBadge"
                label="Show badge"
                checked={draft.showBadge}
                onChange={(checked) => update("showBadge", checked)}
              />
              <CheckboxField
                id="focusShowUsername"
                label="Username @"
                checked={draft.showUsername}
                onChange={(checked) => update("showUsername", checked)}
              />
              <CheckboxField
                id="focusShowTime"
                label="Timestamp"
                checked={draft.showTimestamp}
                onChange={(checked) => update("showTimestamp", checked)}
              />
              <CheckboxField
                id="focusQuote"
                label="Quote mark"
                checked={draft.showQuoteIcon}
                onChange={(checked) => update("showQuoteIcon", checked)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <ColorField
              id="focusFontColor"
              label="Warna komentar"
              value={draft.fontColor}
              onChange={(nextValue) => update("fontColor", nextValue)}
            />
            <ColorField
              id="focusNameColor"
              label="Warna nama default"
              value={draft.nameColor}
              onChange={(nextValue) => update("nameColor", nextValue)}
            />
            <ColorField
              id="focusBgColor"
              label="Warna background"
              value={draft.backgroundColor}
              onChange={(nextValue) => update("backgroundColor", nextValue)}
            />
            <ColorField
              id="focusBorderColor"
              label="Warna border tema"
              value={draft.borderColor}
              onChange={(nextValue) => {
                update("borderColor", nextValue);
                update("strokeColor", nextValue);
              }}
            />
            <ColorField
              id="focusAccentColor"
              label="Warna aksen"
              value={draft.accentColor}
              onChange={(nextValue) => update("accentColor", nextValue)}
            />
            <ColorField
              id="focusShadowColor"
              label="Warna shadow"
              value={draft.shadowColor}
              onChange={(nextValue) => update("shadowColor", nextValue)}
            />

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="focusShadowEnabled"
                  label="Shadow aktif"
                  checked={draft.shadowEnabled}
                  onChange={(checked) => update("shadowEnabled", checked)}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberField
                    id="focusShadowBlur"
                    label="Ketebalan shadow"
                    value={draft.shadowBlur}
                    min={0}
                    max={140}
                    step={1}
                    onChange={(nextValue) => update("shadowBlur", nextValue)}
                  />
                  <NumberField
                    id="focusShadowX"
                    label="Shadow X"
                    value={draft.shadowOffsetX}
                    min={-100}
                    max={100}
                    step={1}
                    onChange={(nextValue) => update("shadowOffsetX", nextValue)}
                  />
                  <NumberField
                    id="focusShadowY"
                    label="Shadow Y"
                    value={draft.shadowOffsetY}
                    min={-100}
                    max={100}
                    step={1}
                    onChange={(nextValue) => update("shadowOffsetY", nextValue)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="focusStrokeEnabled"
                  label="Stroke aktif"
                  checked={draft.strokeEnabled}
                  onChange={(checked) => update("strokeEnabled", checked)}
                />
                <ColorField
                  id="focusStrokeColor"
                  label="Warna stroke"
                  value={draft.strokeColor}
                  onChange={(nextValue) => update("strokeColor", nextValue)}
                />
                <NumberField
                  id="focusStrokeWidth"
                  label="Ketebalan stroke"
                  value={draft.strokeWidth}
                  min={0}
                  max={18}
                  step={1}
                  onChange={(nextValue) => update("strokeWidth", nextValue)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3">
                <CheckboxField
                  id="focusCustomDesignEnabled"
                  label="Aktifkan design builder custom"
                  checked={draft.customDesignEnabled}
                  onChange={(checked) => update("customDesignEnabled", checked)}
                />
                <Button asChild variant="outline">
                  <Link href={designBuilderHref}>
                    <LayoutTemplate />
                    Buka Design Builder Focus
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Preview focus</p>
              <div className="mt-3">
                <FocusChatPreview theme={theme} focusStyle={draft} />
              </div>
            </div>

            <Button type="button" variant="destructive" className="w-full" onClick={() => setDraft(defaultValue)}>
              <RotateCcw />
              Reset Default
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t p-5 sm:grid-cols-[auto_1fr]">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={saveChanges}>
            Konfirmasi Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}

function getPreviewRoleLabel(role: ChatUserRole) {
  switch (role) {
    case "moderator":
      return "Moderator";
    case "subscriber":
      return "Subscriber";
    case "follower":
      return "Follower";
    case "friend":
      return "Friend";
    case "topgifter":
      return "Top Gifter";
    default:
      return "Viewer";
  }
}

function DesignElementContent({
  elementKey,
  sampleMode,
  elementStyle,
  sample
}: {
  elementKey: OverlayDesignElementKey;
  sampleMode: "chat" | "focus";
  elementStyle: CSSProperties;
  sample?: CustomDesignPreviewSample;
}) {
  const name = sample?.displayName ?? (sampleMode === "focus" ? "Vicky Viewer" : "Moderator User");
  const username = sample?.username ?? "viewer";
  const message = sample?.message ?? (sampleMode === "focus" ? "Chat pilihan muncul besar di OBS." : "Ini komentar live yang masuk.");
  const timestamp = sample?.timestamp ?? "12.34";
  const role = sample?.role ?? "moderator";

  if (elementKey === "profile") {
    const fallbackStyle: CSSProperties = {
      background: elementStyle.background || elementStyle.backgroundColor ? undefined : "#fda4af"
    };

    return (
      <div className="grid h-full w-full place-items-center overflow-hidden font-black text-zinc-950" style={fallbackStyle}>
        {sample?.initial ?? name.trim().charAt(0).toUpperCase() ?? "V"}
      </div>
    );
  }

  if (elementKey === "badge") {
    if (role === "viewer") {
      return null;
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        {getPreviewRoleLabel(role)}
      </div>
    );
  }

  if (elementKey === "name") {
    return <div className="h-full w-full">{name}</div>;
  }

  if (elementKey === "username") {
    return <div className="h-full w-full">@{username}</div>;
  }

  if (elementKey === "timestamp") {
    return <div className="h-full w-full">{timestamp}</div>;
  }

  return <div className="h-full w-full">{message}</div>;
}

function CustomDesignPreviewCard({
  design,
  sampleMode,
  fontFamily,
  decorationStyle,
  sample,
  maxPreviewWidth = 680
}: {
  design: OverlayCustomDesign;
  sampleMode: "chat" | "focus";
  fontFamily: string;
  decorationStyle: CSSProperties;
  sample?: CustomDesignPreviewSample;
  maxPreviewWidth?: number;
}) {
  const scale = getCustomDesignPreviewScale(design, maxPreviewWidth);
  const effectiveFontFamily = fontFamily || overlayDesignFontStack;

  return (
    <div
      className="relative mx-auto overflow-visible"
      style={{
        width: design.width * scale,
        height: design.height * scale,
        fontFamily: effectiveFontFamily
      }}
    >
      <div
        className="absolute left-0 top-0 overflow-visible"
        style={{
          width: design.width,
          height: design.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left"
        }}
      >
        <OverlayRenderer
          schema={overlayCustomDesignToRendererSchema(design)}
          style={{
            ...decorationStyle,
            fontFamily: effectiveFontFamily
          }}
          renderElement={({ elementKey, elementStyle }) => (
            <DesignElementContent
              elementKey={elementKey}
              sampleMode={sampleMode}
              elementStyle={elementStyle}
              sample={sample}
            />
          )}
        />
      </div>
    </div>
  );
}

function getCustomDesignPreviewScale(design: OverlayCustomDesign, maxPreviewWidth: number) {
  return Math.min(1, maxPreviewWidth / Math.max(1, design.width));
}

function getChatDecorationStyle(chatStyle: ChatOverlayStyle, useOutline = false): CSSProperties {
  return getOverlayDecorationStyle({
    shadowEnabled: chatStyle.shadowEnabled,
    shadowColor: chatStyle.shadowColor,
    shadowBlur: chatStyle.shadowBlur,
    shadowOffsetX: chatStyle.shadowOffsetX,
    shadowOffsetY: chatStyle.shadowOffsetY,
    strokeEnabled: chatStyle.strokeEnabled,
    strokeColor: chatStyle.strokeColor,
    strokeWidth: chatStyle.strokeWidth,
    useOutline
  });
}

function getFocusDecorationStyle(focusStyle: FocusChatStyle, useOutline = false): CSSProperties {
  return getOverlayDecorationStyle({
    shadowEnabled: focusStyle.shadowEnabled,
    shadowColor: focusStyle.shadowColor,
    shadowBlur: focusStyle.shadowBlur,
    shadowOffsetX: focusStyle.shadowOffsetX,
    shadowOffsetY: focusStyle.shadowOffsetY,
    strokeEnabled: focusStyle.strokeEnabled,
    strokeColor: focusStyle.strokeColor,
    strokeWidth: focusStyle.strokeWidth,
    useOutline
  });
}

function getOverlayDecorationStyle({
  shadowEnabled,
  shadowColor,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  strokeEnabled,
  strokeColor,
  strokeWidth,
  useOutline
}: {
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  useOutline: boolean;
}): CSSProperties {
  const style: CSSProperties = {
    boxShadow: shadowEnabled ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}` : "none"
  };

  if (useOutline) {
    return {
      ...style,
      outlineStyle: strokeEnabled ? "solid" : "none",
      outlineColor: strokeColor,
      outlineWidth: strokeEnabled ? strokeWidth : 0
    };
  }

  return {
    ...style,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: strokeColor,
    borderRightColor: strokeColor,
    borderBottomColor: strokeColor,
    borderLeftColor: strokeColor,
    borderTopWidth: strokeEnabled ? strokeWidth : 0,
    borderRightWidth: strokeEnabled ? strokeWidth : 0,
    borderBottomWidth: strokeEnabled ? strokeWidth : 0,
    borderLeftWidth: strokeEnabled ? strokeWidth : 0
  };
}

function resolvePreviewFont(font: string) {
  switch (font) {
    case "Outfit":
      return "Outfit, Inter, system-ui, sans-serif";
    case "Poppins":
      return "Poppins, Inter, system-ui, sans-serif";
    case "Montserrat":
      return "Montserrat, Inter, system-ui, sans-serif";
    case "Roboto":
      return "Roboto, Arial, sans-serif";
    case "Geist Mono":
      return '"Geist Mono", "SFMono-Regular", Consolas, monospace';
    default:
      return "Inter, system-ui, sans-serif";
  }
}

function getRotateValue(css: string | undefined) {
  const transform = parseCssDeclarations(css ?? "").get("transform") ?? "";
  const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/i);

  return match ? Number(match[1]) : 0;
}

function stripTransformDeclaration(css: string) {
  const declarations = parseCssDeclarations(css);

  declarations.delete("transform");

  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
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

function CheckboxField({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
        <input
          id={id}
          type="color"
          value={value.slice(0, 7)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded-md border border-input bg-card p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function PreviewPanel({
  mode,
  theme,
  styleLabel,
  chatFeatureTab,
  focusTheme,
  metric,
  workspaceName,
  chatStyle,
  focusChatStyle,
  giftStyle
}: {
  mode: OverlayMode;
  theme: string;
  styleLabel: string;
  chatFeatureTab: ChatFeatureTab;
  focusTheme: string;
  metric: string;
  workspaceName: string;
  chatStyle: ChatOverlayStyle;
  focusChatStyle: FocusChatStyle;
  giftStyle: GiftOverlayStyle;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Preview</h3>
          <p className="text-sm text-muted-foreground">Preview visual untuk OBS.</p>
        </div>
        <Badge variant="outline">{styleLabel}</Badge>
      </div>

      <div className="mt-4 min-h-[420px] overflow-auto rounded-lg border bg-[linear-gradient(45deg,#d1d5db_25%,transparent_25%),linear-gradient(-45deg,#d1d5db_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d1d5db_75%),linear-gradient(-45deg,transparent_75%,#d1d5db_75%)] bg-[length:32px_32px] bg-[position:0_0,0_16px,16px_-16px,-16px_0] p-8">
        {mode === "gift" ? <GiftPreview theme={theme} workspaceName={workspaceName} giftStyle={giftStyle} /> : null}
        {mode === "chat" && chatFeatureTab === "chat" ? <ChatPreview theme={theme} chatStyle={chatStyle} /> : null}
        {mode === "chat" && chatFeatureTab === "focus" ? <FocusChatPreview theme={focusTheme} focusStyle={focusChatStyle} /> : null}
        {mode === "leaderboard" ? <LeaderboardPreview metric={metric} /> : null}
      </div>
    </div>
  );
}

function GiftPreview({
  theme,
  workspaceName,
  giftStyle
}: {
  theme: string;
  workspaceName: string;
  giftStyle: GiftOverlayStyle;
}) {
  const panelStyle = {
    backgroundColor: giftStyle.backgroundColor,
    color: giftStyle.fontColor,
    fontFamily: giftStyle.font
  };
  const accentStyle = {
    color: giftStyle.accentColor
  };

  if (theme === "ticker") {
    return (
      <div className="mt-64 overflow-hidden px-4 py-3 text-xl font-semibold shadow-xl" style={panelStyle}>
        1. Test User (3 Coin) | 2. Example User (2 Coin) | {workspaceName}
      </div>
    );
  }

  if (theme === "history") {
    return (
      <div className="space-y-3">
        {Array.from({ length: Math.min(giftStyle.maxItems, 4) }, (_, index) => (
          <div key={index} className="rounded-lg border p-4 shadow-xl" style={{ ...panelStyle, borderColor: giftStyle.accentColor }}>
            <div className="flex items-center gap-3">
              {giftStyle.showProfile ? (
                <div className="grid size-12 place-items-center rounded-full font-bold text-white" style={{ backgroundColor: giftStyle.accentColor }}>
                  T
                </div>
              ) : null}
              <div className="flex-1">
                <p className="text-xl font-bold" style={accentStyle}>Test User</p>
                <p>Rose {index + 1}x</p>
              </div>
              {giftStyle.showCoin ? <p className="text-lg font-bold">{index + 1} Coin</p> : null}
              {giftStyle.showGiftIcon ? <Gift className="size-8" style={accentStyle} /> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (theme === "combo") {
    return (
      <div className="mt-16 overflow-hidden rounded-lg border p-5 shadow-2xl" style={{ ...panelStyle, borderColor: giftStyle.accentColor }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide" style={accentStyle}>Combo aktif</p>
            <p className="text-3xl font-black">Rose x8</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black" style={accentStyle}>8x</p>
            {giftStyle.showCoin ? <p className="text-sm">combo meter</p> : null}
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-4/5 rounded-full" style={{ backgroundColor: giftStyle.accentColor }} />
        </div>
      </div>
    );
  }

  if (theme === "neon" || theme === "spotlight" || theme === "badge") {
    return (
      <div className={`mt-16 ${theme === "badge" ? "max-w-sm rounded-full px-5 py-3" : "rounded-2xl p-6"} border shadow-2xl`} style={{ ...panelStyle, borderColor: giftStyle.accentColor }}>
        <div className="flex items-center gap-4">
          {giftStyle.showProfile ? (
            <div className="grid size-14 place-items-center rounded-full font-bold text-white shadow-xl" style={{ backgroundColor: giftStyle.accentColor }}>
              T
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase" style={accentStyle}>{workspaceName}</p>
            <p className="truncate text-2xl font-black">Test User</p>
            <p style={{ fontSize: giftStyle.fontSize }}>Rose x3</p>
          </div>
          {giftStyle.showGiftIcon ? <Gift className="size-10" style={accentStyle} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 rounded-lg border p-5 shadow-2xl" style={{ ...panelStyle, borderColor: giftStyle.accentColor }}>
      <div className="flex items-center gap-4">
        {giftStyle.showProfile ? (
          <div className="grid size-14 place-items-center rounded-full font-bold text-white" style={{ backgroundColor: giftStyle.accentColor }}>
            T
          </div>
        ) : null}
        <div className="flex-1">
          <p className="text-sm font-bold uppercase" style={accentStyle}>{workspaceName}</p>
          <p className="text-2xl font-bold">Test User</p>
          <p style={{ fontSize: giftStyle.fontSize }}>sent Rose x3</p>
        </div>
        {giftStyle.showGiftIcon ? <Gift className="size-10" style={accentStyle} /> : null}
      </div>
    </div>
  );
}

function ChatPreview({ theme, chatStyle }: { theme: string; chatStyle: ChatOverlayStyle }) {
  const previewFont = resolvePreviewFont(chatStyle.font);
  const panelStyle = {
    backgroundColor: chatStyle.backgroundColor,
    color: chatStyle.fontColor,
    fontFamily: previewFont,
    letterSpacing: `${chatStyle.letterSpacing}px`,
    ...getChatDecorationStyle(chatStyle)
  };
  const messageStyle = {
    color: chatStyle.fontColor,
    fontFamily: previewFont,
    fontSize: `${chatStyle.fontSize}px`,
    letterSpacing: `${chatStyle.letterSpacing}px`
  };
  const profile = chatStyle.showProfile ? (
    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-rose-300 font-bold">F</div>
  ) : null;
  const previewCount = Math.min(Math.max(Math.round(chatStyle.maxMessages), 1), 10);
  const previewGap = chatStyle.lineGap;

  if (chatStyle.customDesignEnabled) {
    if (chatStyle.customJsonDesign) {
      const previewScale = Math.min(1, 340 / Math.max(1, chatStyle.customJsonDesign.canvas.width));

      return (
        <div className="min-h-[430px] min-w-full overflow-hidden py-2">
          <div className="flex w-full justify-center overflow-hidden px-8">
            <div
              style={{
                width: chatStyle.customJsonDesign.canvas.width * previewScale,
                height: chatStyle.customJsonDesign.canvas.height * previewScale
              }}
            >
              <div
                style={{
                  width: chatStyle.customJsonDesign.canvas.width,
                  height: chatStyle.customJsonDesign.canvas.height,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left"
                }}
              >
                <ChatStyleRenderer
                  designJson={chatStyle.customJsonDesign}
                  items={getSampleChatRenderData(chatStyle.customJsonDesign.layout.maxItems)}
                  gap={previewGap}
                  height={chatStyle.customJsonDesign.canvas.height}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    const maxPreviewWidth = 340;
    const previewScale = getCustomDesignPreviewScale(chatStyle.customDesign, maxPreviewWidth);
    const customPreviewRows: CustomDesignPreviewSample[] = [
      {
        displayName: "Vicky Viewer",
        username: "viewer",
        role: "moderator",
        message: "Ini komentar live yang masuk.",
        timestamp: "12.34",
        initial: "V"
      },
      {
        displayName: "A'al",
        username: "aldi_jaya0",
        role: "viewer",
        message: "join live",
        timestamp: "12.35",
        initial: "A"
      },
      {
        displayName: "abdullahulan2",
        username: "abdullahulan2",
        role: "follower",
        message: "share live",
        timestamp: "12.36",
        initial: "A"
      }
    ];
    return (
      <div className="min-h-[430px] min-w-full overflow-visible py-2">
        <div className="flex w-full flex-col items-center overflow-visible px-8" style={{ gap: previewGap * previewScale }}>
          {customPreviewRows.map((sample) => (
            <CustomDesignPreviewCard
              key={`${sample.username}-${sample.timestamp}`}
              design={chatStyle.customDesign}
              sampleMode="chat"
              fontFamily={overlayDesignFontStack}
              decorationStyle={{}}
              sample={sample}
              maxPreviewWidth={maxPreviewWidth}
            />
          ))}
        </div>
      </div>
    );
  }

  if (theme === "scroll") {
    const rows = [
      ["ahmada saw", "darah"],
      ["Antasena 4D56", "las li"],
      ["B.Y E D S Z T", "sampe jam berapa ly"],
      ["Barrr", "Seandainya tank"],
      ["Antasena 4D56", "las li"],
      ["Follower User", "mantap live hari ini"],
      ["Subscriber User", "gas terus"],
      ["Friend User", "ikut antrian"],
      ["Top Gifter", "naikin lagi"],
      ["Regular User", "hadir"]
    ].slice(-previewCount);

    return (
      <div className="flex h-full max-h-[390px] flex-col justify-end overflow-hidden" style={{ gap: previewGap }}>
        {rows.map(([name, message], index) => (
          <div
            key={`${name}-${index}`}
            className="flex items-center gap-4"
            style={{ opacity: index === 0 && rows.length > 1 ? 0.4 : index === 1 && rows.length > 4 ? 0.75 : 1 }}
          >
            {chatStyle.showProfile ? (
              <div className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-rose-200 bg-zinc-700 font-bold text-white">
                {name.charAt(0)}
              </div>
            ) : null}
            <div className="rounded-[2rem] border border-white/25 px-6 py-3 shadow-xl" style={panelStyle}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold" style={{ color: chatStyle.moderatorColor }}>{name}</span>
                {chatStyle.showBadge ? (
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">MODERATOR</span>
                ) : null}
              </div>
              <p className="text-xl font-bold" style={messageStyle}>{message}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (theme === "manga") {
    return (
      <div className="flex flex-col" style={{ gap: previewGap }}>
        {[1, 2].map((item) => (
          <div key={item} className="flex items-start gap-3">
            {profile}
            <div className="border-4 border-black p-4 text-black shadow-[6px_6px_0_#000]" style={panelStyle}>
              <p className="font-bold" style={{ color: item === 1 ? chatStyle.subscriberColor : chatStyle.friendColor }}>
                {item === 1 ? "Subscriber User" : "Friend User"}
              </p>
              <p className="font-black uppercase" style={messageStyle}>Lorem ipsum dolor sit amet</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (theme === "arcade") {
    return (
      <div className="flex flex-col font-mono" style={{ gap: previewGap }}>
        <div className="border-4 border-lime-500 p-4 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]" style={panelStyle}>
          <p style={{ color: chatStyle.moderatorColor }}>MODERATOR USER</p>
          <p className="uppercase" style={messageStyle}>Lorem ipsum dolor sit amet</p>
        </div>
      </div>
    );
  }

  if (theme === "aura") {
    return (
      <div className="mt-24 rounded-full border border-white/30 px-6 py-4 text-white shadow-[0_0_32px_rgba(74,222,128,0.55)]" style={panelStyle}>
        <p className="font-bold" style={{ color: chatStyle.followerColor }}>Followed User</p>
        <p className="font-semibold drop-shadow" style={messageStyle}>lorem ipsum dolor sit amet</p>
      </div>
    );
  }

  if (theme === "cyber") {
    return (
      <div className="flex flex-col font-mono" style={{ gap: previewGap }}>
        {[1, 2].map((item) => (
          <div key={item} className="border border-cyan-300/70 p-4 text-white shadow-[0_0_22px_rgba(34,211,238,0.35)]" style={panelStyle}>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-cyan-300">
              <span style={{ color: chatStyle.friendColor }}>Signal User</span>
              {chatStyle.showBadge ? <span>live_chat</span> : null}
            </div>
            <p className="font-semibold" style={messageStyle}>lorem ipsum dolor sit amet</p>
          </div>
        ))}
      </div>
    );
  }

  if (theme === "bubble") {
    return (
      <div className="flex flex-col" style={{ gap: previewGap }}>
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-end gap-3">
            {chatStyle.showProfile ? <div className="grid size-10 place-items-center rounded-full bg-amber-300 font-bold">U</div> : null}
            <div className="rounded-3xl rounded-bl-md px-5 py-3 text-zinc-900 shadow-xl" style={panelStyle}>
              <p className="font-bold" style={{ color: item === 1 ? chatStyle.subscriberColor : chatStyle.followerColor }}>
                {item === 1 ? "Subscriber User" : "Follower User"}
              </p>
              <p className="font-semibold" style={messageStyle}>lorem ipsum dolor sit amet</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (theme === "ticker") {
    return (
      <div className="mt-64 overflow-hidden border-y border-white/30 px-4 py-3 font-semibold text-white" style={panelStyle}>
        <span style={messageStyle}>Regular User: lorem ipsum dolor sit amet | Followed User: mantap live hari ini</span>
      </div>
    );
  }

  if (theme === "minimal") {
    return (
      <div className="flex flex-col" style={{ gap: previewGap }}>
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-md px-4 py-2 text-white" style={panelStyle}>
            <span className="font-semibold" style={{ color: item === 1 ? chatStyle.subscriberColor : chatStyle.friendColor }}>User {item}</span>
            <span className="text-zinc-400"> : </span>
            <span style={messageStyle}>lorem ipsum dolor sit amet</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col font-mono" style={{ gap: previewGap }}>
      <div className="rounded-md border border-lime-500/60 p-4 text-lime-200" style={panelStyle}>
        <p className="uppercase tracking-[0.25em] text-lime-500">chat_log</p>
        <p style={messageStyle}>lorem ipsum dolor sit amet</p>
      </div>
      <div className="rounded-md border border-cyan-300/50 p-4 text-white" style={panelStyle}>
        <p className="font-bold" style={{ color: chatStyle.friendColor }}>FRIEND USER</p>
        <p style={messageStyle}>mantap live hari ini</p>
      </div>
    </div>
  );
}

function FocusChatPreview({
  theme,
  focusStyle
}: {
  theme: string;
  focusStyle: FocusChatStyle;
}) {
  const cardStyle = {
    backgroundColor: focusStyle.backgroundColor,
    borderRadius: focusStyle.radius,
    color: focusStyle.fontColor,
    fontFamily: focusStyle.font,
    padding: Math.max(16, Math.min(focusStyle.padding, 34)),
    maxWidth: Math.min(focusStyle.width, 620),
    ...getFocusDecorationStyle(focusStyle)
  };
  const nameStyle = {
    color: focusStyle.nameColor,
    fontSize: Math.min(focusStyle.nameSize, 28),
    lineHeight: 1.1
  };
  const messageStyle = {
    color: focusStyle.fontColor,
    fontSize: Math.min(focusStyle.messageSize, 42),
    lineHeight: 1.1
  };

  if (focusStyle.customDesignEnabled) {
    return (
      <div className="flex min-h-[340px] items-center justify-center overflow-visible px-10 py-8">
        <CustomDesignPreviewCard
          design={focusStyle.customDesign}
          sampleMode="focus"
          fontFamily={overlayDesignFontStack}
          decorationStyle={{}}
        />
      </div>
    );
  }

  if (theme === "lower-third") {
    return (
      <div className="flex items-end gap-3">
        {focusStyle.showProfile ? <div className="grid size-12 place-items-center rounded-full bg-rose-300 font-bold">V</div> : null}
        <div className="border-l-4" style={{ ...cardStyle, borderLeftColor: focusStyle.accentColor }}>
          <FocusPreviewMeta focusStyle={focusStyle} nameStyle={nameStyle} />
          <p className="mt-1 font-black" style={messageStyle}>Chat penting yang dipilih dari dock.</p>
        </div>
      </div>
    );
  }

  if (theme === "broadcast") {
    return (
      <div className="overflow-hidden shadow-2xl" style={{ maxWidth: Math.min(focusStyle.width, 620), borderRadius: focusStyle.radius }}>
        <div className="px-4 py-2 text-sm font-black uppercase tracking-[0.2em] text-black" style={{ backgroundColor: focusStyle.accentColor }}>
          Focus Chat
        </div>
        <div className="border" style={cardStyle}>
          <FocusPreviewMeta focusStyle={focusStyle} nameStyle={nameStyle} />
          <p className="mt-2 font-black" style={messageStyle}>Tampilkan chat pilihan ke OBS.</p>
        </div>
      </div>
    );
  }

  if (theme === "bubble") {
    return (
      <div className="flex items-end gap-3">
        {focusStyle.showProfile ? <div className="grid size-12 place-items-center rounded-full bg-cyan-300 font-bold">U</div> : null}
        <div className="relative border" style={cardStyle}>
          <div
            className="absolute -bottom-3 left-8 size-6 rotate-45 border-b border-r"
            style={{
              backgroundColor: focusStyle.backgroundColor,
              borderBottomColor: focusStyle.strokeColor,
              borderRightColor: focusStyle.strokeColor,
              borderBottomWidth: focusStyle.strokeEnabled ? focusStyle.strokeWidth : 0,
              borderRightWidth: focusStyle.strokeEnabled ? focusStyle.strokeWidth : 0
            }}
          />
          <FocusPreviewMeta focusStyle={focusStyle} nameStyle={nameStyle} />
          <p className="relative mt-2 font-bold" style={messageStyle}>Bubble focus chat.</p>
        </div>
      </div>
    );
  }

  if (theme === "neon") {
    return (
      <div className="relative">
        <div className="absolute -inset-2 opacity-50 blur-2xl" style={{ backgroundColor: focusStyle.accentColor, borderRadius: focusStyle.radius }} />
        <div className="relative border-2" style={cardStyle}>
          <FocusPreviewMeta focusStyle={focusStyle} nameStyle={nameStyle} />
          <p className="mt-2 font-black" style={messageStyle}>Neon focus highlight.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-full opacity-25 blur-3xl" style={{ backgroundColor: focusStyle.accentColor }} />
      <div className="relative border" style={cardStyle}>
        {focusStyle.showQuoteIcon ? (
          <div className="absolute right-5 top-2 text-6xl font-black opacity-20" style={{ color: focusStyle.accentColor }}>
            &quot;
          </div>
        ) : null}
        <FocusPreviewMeta focusStyle={focusStyle} nameStyle={nameStyle} />
        <p className="mt-2 font-black" style={messageStyle}>Chat pilihan muncul sebagai satu kartu besar.</p>
      </div>
    </div>
  );
}

function FocusPreviewMeta({
  focusStyle,
  nameStyle
}: {
  focusStyle: FocusChatStyle;
  nameStyle: CSSProperties;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-black" style={nameStyle}>Vicky Viewer</span>
      {focusStyle.showUsername ? <span className="text-sm opacity-70" style={{ color: focusStyle.fontColor }}>@viewer</span> : null}
      {focusStyle.showBadge ? <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-black text-white">MODERATOR</span> : null}
      {focusStyle.showTimestamp ? <span className="ml-auto text-xs opacity-70" style={{ color: focusStyle.fontColor }}>12.34</span> : null}
    </div>
  );
}

function LeaderboardPreview({ metric }: { metric: string }) {
  const icon = metric === "gift" ? <Gift className="size-4" /> : metric === "like" ? <Heart className="size-4" /> : <MessageCircle className="size-4" />;

  return (
    <div className="rounded-lg bg-black/75 p-5 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-2xl font-bold">{metric === "gift" ? "Top Gifter" : metric === "like" ? "Like Leaderboard" : "Chat Leaderboard"}</h4>
        <Trophy className="size-7 text-amber-300" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-md bg-white/10 px-3 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-amber-300 font-bold text-black">
              {index + 1}
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-zinc-300 font-bold text-zinc-800">U</div>
            <div className="flex-1">
              <p className="font-bold text-sky-300">Example User {index + 1}</p>
            </div>
            <div className="flex items-center gap-1 text-amber-300">
              {icon}
              {123 - index * 6}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
