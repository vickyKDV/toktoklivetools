import { overlayDesignSchema, type OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";
import { blankOverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

type LegacyDesign = {
  width: number;
  height: number;
  containerCss: string;
  elements: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    zIndex?: number;
    visible?: boolean;
    css: string;
  }>;
};

export function normalizeDesignSchema(value: unknown, fallback: OverlayDesignSchema = blankOverlayDesignSchema): OverlayDesignSchema {
  const parsed = overlayDesignSchema.safeParse(inferRuntimeDefaults(value));

  if (parsed.success) {
    return normalizeComponentOrder(parsed.data);
  }

  if (isLegacyDesign(value)) {
    return normalizeComponentOrder(migrateLegacyDesign(value, fallback.name));
  }

  return fallback;
}

function inferRuntimeDefaults(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (record.kind || !Array.isArray(record.components) || !hasChatComponent(record.components)) {
    return value;
  }

  return {
    ...record,
    kind: "CHAT",
    dataSource: record.dataSource ?? { type: "chat", filters: {} },
    layout: record.layout ?? { mode: "list", maxItems: 10, gap: 12, direction: "vertical", reverse: true, align: "start", listStyle: "stacked_card", enterAnimation: "slide-up", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
  };
}

function hasChatComponent(components: unknown[]): boolean {
  return components.some((component) => {
    if (!component || typeof component !== "object") {
      return false;
    }

    const record = component as Record<string, unknown>;

    if (record.type === "comment" || record.type === "viewer_name" || record.type === "viewer_username" || record.type === "viewer_badge") {
      return true;
    }

    return Array.isArray(record.children) ? hasChatComponent(record.children) : false;
  });
}

function normalizeComponentOrder(schema: OverlayDesignSchema): OverlayDesignSchema {
  const layout = schema.kind === "LEADERBOARD"
    ? {
      ...schema.layout,
      mode: "list" as const,
      maxItems: Math.min(50, Math.max(3, Number.isFinite(Number(schema.layout.maxItems)) ? Number(schema.layout.maxItems) : 10))
    }
    : schema.layout;
  const dataSource = schema.kind === "LEADERBOARD"
    ? {
      ...schema.dataSource,
      type: "leaderboard" as const,
      filters: {
        ...schema.dataSource.filters,
        metric: normalizeLeaderboardMetric(schema.dataSource.filters?.metric)
      }
    }
    : schema.dataSource;

  return {
    ...fallbackSchemaByKind(schema.kind),
    ...schema,
    layout,
    dataSource,
    version: 2,
    components: normalizeComponents(schema.components)
  };
}

function normalizeComponents(components: OverlayDesignSchema["components"]): OverlayDesignSchema["components"] {
  return components.map((component, index) => ({
    ...component,
    zIndex: component.zIndex ?? index + 1,
    visible: component.visible !== false,
    locked: component.locked === true,
    children: component.children ? normalizeComponents(component.children) : undefined
  }));
}

function isLegacyDesign(value: unknown): value is LegacyDesign {
  return typeof value === "object" && value !== null && "width" in value && "height" in value && "elements" in value;
}

function migrateLegacyDesign(value: LegacyDesign, name: string): OverlayDesignSchema {
  const source = normalizeLegacyInput(value);
  const components: OverlayDesignSchema["components"] = Object.entries(source.elements).map(([key, element], index) => ({
    id: `${key}_${index + 1}`,
    type: legacyTypeMap[key] ?? "comment",
    name: legacyNameMap[key] ?? key,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation ?? getRotateValue(element.css),
    zIndex: element.zIndex ?? index + 1,
    visible: element.visible !== false,
    locked: false,
    props: getDefaultPropsForLegacyKey(key),
    style: legacyCssToStyle(element.css)
  }));

  return {
    version: 2,
    kind: "CHAT",
    name,
    canvas: {
      width: source.width,
      height: source.height,
      background: {
        type: "solid",
        color: readCssDeclaration(source.containerCss, "background") || readCssDeclaration(source.containerCss, "background-color") || "transparent",
        opacity: 100
      },
      radius: readCssNumber(source.containerCss, "border-radius", 0) ?? 0,
      stroke: {
        enabled: Boolean(readCssDeclaration(source.containerCss, "border")),
        color: "#ffffff",
        width: 0
      },
      shadow: {
        enabled: Boolean(readCssDeclaration(source.containerCss, "box-shadow")),
        color: "#00000055",
        blur: 0,
        x: 0,
        y: 0
      },
      animation: {
        type: "none",
        enabled: false,
        color: "#22d3ee",
        color2: "#f43f5e",
        durationMs: 2400,
        intensity: 70
      }
    },
    dataSource: {
      type: "chat",
      filters: {}
    },
    layout: {
      mode: "list",
      maxItems: 10,
      gap: 12,
      direction: "vertical",
      reverse: true,
      align: "start",
      listStyle: "stacked_card",
      enterAnimation: "slide-up",
      exitAnimation: "fade",
      autoCloseMs: 0,
      animationDurationMs: 620
    },
    components
  };
}

function fallbackSchemaByKind(kind: OverlayDesignSchema["kind"]): Pick<OverlayDesignSchema, "dataSource" | "layout"> {
  if (kind === "CHAT") {
    return {
      dataSource: { type: "chat", filters: {} },
      layout: { mode: "list", maxItems: 10, gap: 12, direction: "vertical", reverse: true, align: "start", listStyle: "stacked_card", enterAnimation: "slide-up", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  if (kind === "GIFT") {
    return {
      dataSource: { type: "gift", filters: {} },
      layout: { mode: "single", maxItems: 1, gap: 12, direction: "vertical", reverse: false, align: "start", listStyle: "stacked_card", enterAnimation: "pop", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  if (kind === "LEADERBOARD") {
    return {
      dataSource: { type: "leaderboard", filters: {} },
      layout: { mode: "list", maxItems: 10, gap: 8, direction: "vertical", reverse: false, align: "stretch", listStyle: "layered_list", enterAnimation: "fade", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  if (kind === "DOCK") {
    return {
      dataSource: { type: "dock", filters: {} },
      layout: { mode: "dock", maxItems: 20, gap: 8, direction: "vertical", reverse: true, align: "stretch", listStyle: "stacked_card", enterAnimation: "fade", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  if (kind === "STATIC") {
    return {
      dataSource: { type: "static", filters: {} },
      layout: { mode: "single", maxItems: 1, gap: 0, direction: "vertical", reverse: false, align: "start", listStyle: "default", enterAnimation: "fade", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  if (kind === "GOAL") {
    return {
      dataSource: { type: "goal", filters: {} },
      layout: { mode: "single", maxItems: 1, gap: 0, direction: "vertical", reverse: false, align: "start", listStyle: "default", enterAnimation: "fade", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
    };
  }

  return {
    dataSource: { type: "manual", filters: {} },
    layout: { mode: "single", maxItems: 1, gap: 12, direction: "vertical", reverse: false, align: "start", listStyle: "stacked_card", enterAnimation: "fade", exitAnimation: "fade", autoCloseMs: 0, animationDurationMs: 620 }
  };
}

function normalizeLeaderboardMetric(value: unknown) {
  if (value === "chat") {
    return "comment";
  }

  if (value === "gift" || value === "like" || value === "view" || value === "comment") {
    return value;
  }

  return "gift";
}

function normalizeLegacyInput(value: LegacyDesign): LegacyDesign {
  return {
    width: Number.isFinite(Number(value.width)) ? Number(value.width) : 800,
    height: Number.isFinite(Number(value.height)) ? Number(value.height) : 600,
    containerCss: typeof value.containerCss === "string" ? value.containerCss : "",
    elements: typeof value.elements === "object" && value.elements ? value.elements : {}
  };
}

const legacyTypeMap: Record<string, OverlayDesignSchema["components"][number]["type"]> = {
  profile: "profile_photo",
  name: "viewer_name",
  username: "viewer_username",
  badge: "viewer_badge",
  message: "comment",
  timestamp: "created_at"
};

const legacyNameMap: Record<string, string> = {
  profile: "Foto Profil",
  name: "Nama",
  username: "Username",
  badge: "Badge",
  message: "Komentar",
  timestamp: "Timestamp"
};

function getDefaultPropsForLegacyKey(key: string) {
  if (key === "profile") {
    return { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" };
  }

  if (key === "username") {
    return { text: "{{viewer.username}}" };
  }

  if (key === "badge") {
    return { text: "{{viewer.badge}}" };
  }

  if (key === "timestamp") {
    return { text: "{{comment.createdAt}}" };
  }

  if (key === "name") {
    return { text: "{{viewer.name}}" };
  }

  return { text: "{{comment.text}}" };
}

function legacyCssToStyle(css: string) {
  return {
    radius: readCssNumber(css, "border-radius", 0),
    opacity: 100,
    border: {
      enabled: Boolean(readCssDeclaration(css, "border")),
      color: "#ffffff",
      width: 0
    },
    fontSize: readCssNumber(css, "font-size", undefined),
    fontWeight: readCssNumber(css, "font-weight", undefined),
    color: readCssDeclaration(css, "color") || undefined,
    align: normalizeAlign(readCssDeclaration(css, "text-align")),
    lineHeight: readCssNumber(css, "line-height", undefined),
    backgroundColor: readCssDeclaration(css, "background") || readCssDeclaration(css, "background-color") || undefined,
    objectFit: normalizeObjectFit(readCssDeclaration(css, "object-fit"))
  };
}

function readCssDeclaration(css: string | undefined, property: string) {
  return parseCssDeclarations(css ?? "").get(property) ?? "";
}

function readCssNumber(css: string | undefined, property: string, fallback: number | undefined): number | undefined {
  const value = readCssDeclaration(css, property);
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRotateValue(css: string) {
  const match = readCssDeclaration(css, "transform").match(/rotate\((-?\d+(?:\.\d+)?)deg\)/i);
  return match ? Number(match[1]) : 0;
}

function normalizeAlign(value: string): "left" | "center" | "right" {
  return value === "center" || value === "right" ? value : "left";
}

function normalizeObjectFit(value: string): "cover" | "contain" | "fill" {
  return value === "contain" || value === "fill" ? value : "cover";
}

function parseCssDeclarations(css: string) {
  const declarations = new Map<string, string>();

  css.split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separator = declaration.indexOf(":");

      if (separator < 0) {
        return;
      }

      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();

      if (property && value) {
        declarations.set(property, value);
      }
    });

  return declarations;
}
