import type { OverlayDesignSchema } from "@/core/overlay/schema";

export const chatRuntimeThemeIds = [
  "chat-dynamic-island",
  "chat-special-roblox",
  "chat-gaming-mood",
  "chat-minimalist-glass",
  "chat-minimalist-white",
  "chat-neumorphism-light",
  "chat-neumorphism-dark",
  "chat-square-minimalist",
  "chat-women-style",
  "chat-girl-pink",
  "chat-color-pop",
  "chat-glitch-cartoon",
  "chat-rgb-glitch-bubble",
  "chat-paper-bubble"
] as const;

export type ChatRuntimeThemeId = (typeof chatRuntimeThemeIds)[number];

export const fallbackChatRuntimeThemeId: ChatRuntimeThemeId = "chat-dynamic-island";

const themeAliases: Record<string, ChatRuntimeThemeId> = {
  dynamic: "chat-dynamic-island",
  "dynamic-island": "chat-dynamic-island",
  "chat-dynamic-island": "chat-dynamic-island",
  roblox: "chat-special-roblox",
  "special-roblox": "chat-special-roblox",
  "chat-special-roblox": "chat-special-roblox",
  gaming: "chat-gaming-mood",
  "gaming-mood": "chat-gaming-mood",
  "chat-gaming-mood": "chat-gaming-mood",
  glass: "chat-minimalist-glass",
  "minimalist-glass": "chat-minimalist-glass",
  "chat-minimalist-glass": "chat-minimalist-glass",
  white: "chat-minimalist-white",
  "minimalist-white": "chat-minimalist-white",
  "chat-minimalist-white": "chat-minimalist-white",
  neumorphism: "chat-neumorphism-light",
  "neumorphism-light": "chat-neumorphism-light",
  "chat-neumorphism-light": "chat-neumorphism-light",
  "neumorphism-dark": "chat-neumorphism-dark",
  "chat-neumorphism-dark": "chat-neumorphism-dark",
  square: "chat-square-minimalist",
  "square-minimalist": "chat-square-minimalist",
  "chat-square-minimalist": "chat-square-minimalist",
  women: "chat-women-style",
  "women-style": "chat-women-style",
  "chat-women-style": "chat-women-style",
  pink: "chat-girl-pink",
  "girl-pink": "chat-girl-pink",
  "chat-girl-pink": "chat-girl-pink",
  colorful: "chat-color-pop",
  color: "chat-color-pop",
  "color-pop": "chat-color-pop",
  "chat-color-pop": "chat-color-pop",
  glitch: "chat-glitch-cartoon",
  cartoon: "chat-glitch-cartoon",
  "glitch-cartoon": "chat-glitch-cartoon",
  "chat-glitch-cartoon": "chat-glitch-cartoon",
  rgb: "chat-rgb-glitch-bubble",
  "rgb-glitch": "chat-rgb-glitch-bubble",
  "rgb-glitch-bubble": "chat-rgb-glitch-bubble",
  "chat-rgb-glitch-bubble": "chat-rgb-glitch-bubble",
  paper: "chat-paper-bubble",
  "paper-bubble": "chat-paper-bubble",
  "paper-chat-bubble": "chat-paper-bubble",
  "chat-paper-bubble": "chat-paper-bubble"
};

export function resolveChatRuntimeThemeId(schema: OverlayDesignSchema): ChatRuntimeThemeId {
  const filters = schema.dataSource.filters ?? {};
  const fromFilters = normalizeThemeToken(readFilterString(filters, "themeId") ?? readFilterString(filters, "theme") ?? readFilterString(filters, "themeName"));

  if (fromFilters) {
    return fromFilters;
  }

  const fromName = normalizeThemeToken(schema.name);

  if (fromName) {
    return fromName;
  }

  for (const component of schema.components) {
    const fromComponentId = normalizeThemeToken(component.id);

    if (fromComponentId) {
      return fromComponentId;
    }
  }

  return fallbackChatRuntimeThemeId;
}

function readFilterString(filters: Record<string, unknown>, key: string) {
  const value = filters[key];

  return typeof value === "string" ? value : null;
}

function normalizeThemeToken(value: string | null | undefined): ChatRuntimeThemeId | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^chat-/, "chat-")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized in themeAliases) {
    return themeAliases[normalized];
  }

  const componentPrefix = chatRuntimeThemeIds.find((themeId) => normalized.startsWith(themeId));

  return componentPrefix ?? null;
}
