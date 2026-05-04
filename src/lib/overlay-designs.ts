import type { OverlayCustomDesign, OverlayDesignElement, OverlayDesignElementKey } from "@/types/live";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

export type OverlayDesignMode = "chat" | "focus";

export type SavedOverlayDesign = {
  id: string;
  mode: OverlayDesignMode;
  name: string;
  design: OverlayCustomDesign;
  source?: "legacy" | "builder";
  schema?: OverlayDesignSchema;
  createdAt: string;
  updatedAt: string;
};

export type SystemOverlayDesignTemplate = {
  id: string;
  mode: OverlayDesignMode;
  name: string;
  description: string;
  design: OverlayCustomDesign;
};

export type OverlayDesignThemeState = {
  designs: Record<OverlayDesignMode, SavedOverlayDesign[]>;
  selectedDesignIds: Partial<Record<OverlayDesignMode, string>>;
};

export const overlayDesignElementKeys: OverlayDesignElementKey[] = ["profile", "name", "username", "badge", "message", "timestamp"];
export const overlayDesignFontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const designElementKeys = overlayDesignElementKeys;

export type OverlayCustomDesignBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function getOverlayCustomDesignBounds(design: OverlayCustomDesign): OverlayCustomDesignBounds {
  const visibleElements = overlayDesignElementKeys
    .map((key) => design.elements[key])
    .filter((element) => element.visible);
  const left = Math.min(0, ...visibleElements.map((element) => element.x));
  const top = Math.min(0, ...visibleElements.map((element) => element.y));
  const right = Math.max(design.width, ...visibleElements.map((element) => element.x + element.width));
  const bottom = Math.max(design.height, ...visibleElements.map((element) => element.y + element.height));

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

export function createDefaultChatDesign(): OverlayCustomDesign {
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

export function createDefaultFocusDesign(): OverlayCustomDesign {
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

export function createBlankOverlayDesign(mode: OverlayDesignMode): OverlayCustomDesign {
  const width = mode === "focus" ? 820 : 640;
  const height = mode === "focus" ? 260 : 168;

  return {
    width,
    height,
    containerCss: "background: transparent; border-radius: 0; padding: 0;",
    elements: Object.fromEntries(
      designElementKeys.map((key) => [
        key,
        {
          ...getDefaultElementForKey(key, mode),
          visible: false
        }
      ])
    ) as Record<OverlayDesignElementKey, OverlayDesignElement>
  };
}

export const systemOverlayDesignTemplates: SystemOverlayDesignTemplate[] = [
  {
    id: "system-chat-moderator-stack",
    mode: "chat",
    name: "Moderator Stack",
    description: "Kartu chat bulat seperti overlay live gaming.",
    design: createDefaultChatDesign()
  },
  {
    id: "system-chat-soft-bubble",
    mode: "chat",
    name: "Soft Bubble",
    description: "Bubble ringan dengan profile kecil dan pesan dominan.",
    design: {
      width: 620,
      height: 150,
      containerCss: "background: rgba(255,255,255,.92); border-radius: 30px; padding: 0;",
      elements: {
        profile: { x: 24, y: 38, width: 68, height: 68, visible: true, css: "border-radius: 999px; border: 3px solid #fecdd3;" },
        name: { x: 112, y: 30, width: 260, height: 30, visible: true, css: "font-size: 22px; font-weight: 900; color: #65a30d; line-height: 1.1;" },
        username: { x: 380, y: 34, width: 120, height: 24, visible: false, css: "font-size: 13px; font-weight: 700; color: #64748b;" },
        badge: { x: 390, y: 30, width: 120, height: 28, visible: true, css: "background: #65a30d; color: white; border-radius: 999px; font-size: 12px; font-weight: 900;" },
        message: { x: 112, y: 70, width: 450, height: 52, visible: true, css: "font-size: 26px; font-weight: 800; color: #18181b; line-height: 1.2; overflow-wrap: anywhere;" },
        timestamp: { x: 520, y: 24, width: 70, height: 22, visible: false, css: "font-size: 12px; color: #64748b; text-align: right;" }
      }
    }
  },
  {
    id: "system-chat-minimal-line",
    mode: "chat",
    name: "Minimal Line",
    description: "Layout padat tanpa profile untuk chat cepat.",
    design: {
      width: 580,
      height: 92,
      containerCss: "background: rgba(0,0,0,.64); border-radius: 12px; padding: 0;",
      elements: {
        profile: { ...getDefaultElementForKey("profile", "chat"), visible: false },
        name: { x: 22, y: 16, width: 230, height: 24, visible: true, css: "font-size: 18px; font-weight: 900; color: #22d3ee; line-height: 1;" },
        username: { x: 260, y: 18, width: 120, height: 22, visible: false, css: "font-size: 12px; color: rgba(255,255,255,.65);" },
        badge: { x: 420, y: 14, width: 120, height: 24, visible: true, css: "background: #dc2626; color: #fff; border-radius: 6px; font-size: 11px; font-weight: 900;" },
        message: { x: 22, y: 46, width: 520, height: 32, visible: true, css: "font-size: 22px; font-weight: 750; color: #ffffff; line-height: 1.1; overflow-wrap: anywhere;" },
        timestamp: { x: 500, y: 16, width: 54, height: 20, visible: false, css: "font-size: 11px; color: rgba(255,255,255,.6); text-align: right;" }
      }
    }
  },
  {
    id: "system-focus-spotlight-card",
    mode: "focus",
    name: "Spotlight Card",
    description: "Kartu besar untuk highlight chat pilihan.",
    design: createDefaultFocusDesign()
  },
  {
    id: "system-focus-lower-third",
    mode: "focus",
    name: "Lower Third",
    description: "Bar broadcast di bawah layar.",
    design: {
      width: 960,
      height: 190,
      containerCss: "background: rgba(15,23,42,.90); border-left: 10px solid #22d3ee; border-radius: 24px; padding: 0;",
      elements: {
        profile: { x: 34, y: 46, width: 88, height: 88, visible: true, css: "border-radius: 999px; border: 4px solid rgba(255,255,255,.7);" },
        name: { x: 150, y: 38, width: 320, height: 34, visible: true, css: "font-size: 26px; font-weight: 900; color: #f43f5e; line-height: 1.05;" },
        username: { x: 480, y: 42, width: 170, height: 26, visible: true, css: "font-size: 15px; color: rgba(255,255,255,.70); font-weight: 700;" },
        badge: { x: 150, y: 80, width: 150, height: 30, visible: true, css: "background: #dc2626; color: white; border-radius: 7px; font-size: 13px; font-weight: 900;" },
        message: { x: 150, y: 114, width: 760, height: 50, visible: true, css: "font-size: 34px; color: white; font-weight: 900; line-height: 1.05; overflow-wrap: anywhere;" },
        timestamp: { x: 840, y: 40, width: 80, height: 22, visible: false, css: "font-size: 13px; color: rgba(255,255,255,.62); text-align: right;" }
      }
    }
  }
];

export function getSystemOverlayDesignTemplates(mode: OverlayDesignMode) {
  return systemOverlayDesignTemplates.filter((template) => template.mode === mode);
}

export function parseOverlayDesignThemeState(value: unknown): OverlayDesignThemeState {
  if (!isRecord(value)) {
    return createEmptyOverlayDesignThemeState();
  }

  const overlayDesigns = isRecord(value.overlayDesigns) ? value.overlayDesigns : {};
  const designsRecord = isRecord(overlayDesigns.designs) ? overlayDesigns.designs : {};
  const selectedRecord = isRecord(overlayDesigns.selectedDesignIds) ? overlayDesigns.selectedDesignIds : {};

  return {
    designs: {
      chat: parseSavedDesigns(designsRecord.chat, "chat"),
      focus: parseSavedDesigns(designsRecord.focus, "focus")
    },
    selectedDesignIds: {
      chat: typeof selectedRecord.chat === "string" ? selectedRecord.chat : undefined,
      focus: typeof selectedRecord.focus === "string" ? selectedRecord.focus : undefined
    }
  };
}

export function serializeOverlayDesignThemeState(theme: unknown, state: OverlayDesignThemeState) {
  const base = isRecord(theme) ? theme : {};

  return {
    ...base,
    overlayDesigns: state
  };
}

export function createEmptyOverlayDesignThemeState(): OverlayDesignThemeState {
  return {
    designs: {
      chat: [],
      focus: []
    },
    selectedDesignIds: {}
  };
}

export function normalizeOverlayCustomDesign(value: unknown, fallback: OverlayCustomDesign): OverlayCustomDesign {
  if (!isRecord(value)) {
    return cloneOverlayDesign(fallback);
  }

  const width = clampNumber(value.width, fallback.width, 280, 1600);
  const height = clampNumber(value.height, fallback.height, 120, 900);
  const sourceElements = isRecord(value.elements) ? value.elements : {};

  return {
    width,
    height,
    containerCss: typeof value.containerCss === "string" ? value.containerCss.slice(0, 1200) : fallback.containerCss,
    elements: Object.fromEntries(
      designElementKeys.map((key) => {
        const fallbackElement = fallback.elements[key];

        return [
          key,
          normalizeOverlayDesignElement(sourceElements[key], fallbackElement, width, height)
        ];
      })
    ) as Record<OverlayDesignElementKey, OverlayDesignElement>
  };
}

export function cloneOverlayDesign(design: OverlayCustomDesign): OverlayCustomDesign {
  return {
    width: design.width,
    height: design.height,
    containerCss: design.containerCss,
    elements: Object.fromEntries(
      designElementKeys.map((key) => {
        const element = design.elements[key];

        return [
          key,
          {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation ?? getRotateValue(element.css),
            zIndex: element.zIndex ?? overlayDesignElementKeys.indexOf(key) + 1,
            visible: element.visible,
            css: stripTransformDeclaration(element.css)
          }
        ];
      })
    ) as Record<OverlayDesignElementKey, OverlayDesignElement>
  };
}

export function getDefaultDesignForMode(mode: OverlayDesignMode) {
  return mode === "focus" ? createDefaultFocusDesign() : createDefaultChatDesign();
}

function parseSavedDesigns(value: unknown, mode: OverlayDesignMode): SavedOverlayDesign[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseSavedDesign(item, mode))
    .filter((item): item is SavedOverlayDesign => Boolean(item));
}

function parseSavedDesign(value: unknown, mode: OverlayDesignMode): SavedOverlayDesign | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    id: value.id,
    mode,
    name: value.name.slice(0, 80),
    design: normalizeOverlayCustomDesign(value.design, getDefaultDesignForMode(mode)),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

function normalizeOverlayDesignElement(
  value: unknown,
  fallback: OverlayDesignElement,
  designWidth: number,
  designHeight: number
): OverlayDesignElement {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    x: clampNumber(value.x, fallback.x, -1000, designWidth + 1000),
    y: clampNumber(value.y, fallback.y, -1000, designHeight + 1000),
    width: clampNumber(value.width, fallback.width, 20, designWidth + 1000),
    height: clampNumber(value.height, fallback.height, 16, designHeight + 1000),
    rotation: clampNumber(value.rotation, getRotateValue(typeof value.css === "string" ? value.css : fallback.css), -180, 180),
    zIndex: clampNumber(value.zIndex, fallback.zIndex ?? 1, -1000, 1000),
    visible: value.visible !== false,
    css: stripTransformDeclaration(typeof value.css === "string" ? value.css.slice(0, 1000) : fallback.css)
  };
}

function getDefaultElementForKey(key: OverlayDesignElementKey, mode: OverlayDesignMode): OverlayDesignElement {
  const design = mode === "focus" ? createDefaultFocusDesign() : createDefaultChatDesign();
  return {
    ...design.elements[key],
    rotation: design.elements[key].rotation ?? 0,
    zIndex: design.elements[key].zIndex ?? overlayDesignElementKeys.indexOf(key) + 1
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(parsed), min), max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRotateValue(css: string) {
  const transform = parseCssDeclarations(css).get("transform") ?? "";
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
