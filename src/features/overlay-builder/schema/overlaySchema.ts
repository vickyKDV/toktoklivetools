import { z } from "zod";

export const overlayComponentTypes = [
  "container",
  "bubble_card",
  "glass_card",
  "gradient_card",
  "profile_photo",
  "viewer_name",
  "viewer_username",
  "viewer_badge",
  "comment",
  "created_at",
  "gift_name",
  "gift_count",
  "gift_image",
  "running_text"
] as const;

export const overlayKinds = ["CHAT", "GIFT", "LEADERBOARD", "DOCK", "CUSTOM"] as const;
export type OverlayKind = (typeof overlayKinds)[number];
export const overlayLayoutModes = ["single", "list", "ticker", "dock", "grid"] as const;
export type OverlayLayoutMode = (typeof overlayLayoutModes)[number];
export type OverlayComponentType = (typeof overlayComponentTypes)[number];

export const overlayBackgroundSchema = z.object({
  type: z.enum(["solid", "transparent", "gradient", "glass"]).default("solid"),
  color: z.string().default("#4d85ff"),
  opacity: z.number().min(0).max(100).default(100),
  from: z.string().optional(),
  to: z.string().optional(),
  angle: z.number().min(0).max(360).optional()
});

export const overlayStrokeSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default("#ffffff"),
  width: z.number().min(0).max(80).default(0)
});

export const overlayShadowSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default("#00000055"),
  opacity: z.number().min(0).max(100).optional(),
  blur: z.number().min(0).max(240).default(0),
  x: z.number().min(-400).max(400).default(0),
  y: z.number().min(-400).max(400).default(0)
});

export const overlayBorderSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default("#ffffff"),
  width: z.number().min(0).max(80).default(0)
});

export const overlayComponentStyleSchema = z.object({
  background: overlayBackgroundSchema.optional(),
  radius: z.number().min(0).max(999).optional(),
  opacity: z.number().min(0).max(100).optional(),
  border: overlayBorderSchema.optional(),
  shadow: overlayShadowSchema.optional(),
  blur: z.number().min(0).max(80).optional(),
  backdropBlur: z.number().min(0).max(80).optional(),
  fontSize: z.number().min(6).max(220).optional(),
  fontWeight: z.number().min(100).max(1000).optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  lineHeight: z.number().min(0.6).max(4).optional(),
  maxLines: z.number().min(1).max(20).optional(),
  textOverflow: z.enum(["clip", "ellipsis"]).optional(),
  autoFitFontSize: z.boolean().optional(),
  lineClamp: z.number().min(1).max(20).optional(),
  backgroundColor: z.string().optional(),
  objectFit: z.enum(["cover", "contain", "fill"]).optional(),
  overflow: z.enum(["visible", "hidden"]).optional()
}).passthrough();

const overlayComponentBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(overlayComponentTypes),
  name: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  rotation: z.number().min(-360).max(360).default(0).optional(),
  zIndex: z.number().min(-10000).max(10000).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  props: z.record(z.unknown()).default({}),
  style: overlayComponentStyleSchema.default({})
});

export type OverlayComponentSchema = z.infer<typeof overlayComponentBaseSchema> & {
  children?: OverlayComponentSchema[];
};

export const overlayComponentSchema: z.ZodType<OverlayComponentSchema, z.ZodTypeDef, unknown> = overlayComponentBaseSchema.extend({
  children: z.lazy(() => z.array(overlayComponentSchema)).optional()
});

export const overlayDesignSchema = z.object({
  version: z.number().default(2),
  kind: z.enum(overlayKinds).default("CUSTOM"),
  name: z.string().min(1).default("Chat Overlay"),
  canvas: z.object({
    width: z.number().min(120).max(3840).default(1080),
    height: z.number().min(80).max(2160).default(1920),
    background: overlayBackgroundSchema.default({ type: "solid", color: "#4d85ff", opacity: 100 }),
    radius: z.number().min(0).max(999).default(0),
    stroke: overlayStrokeSchema.default({ enabled: false, color: "#ffffff", width: 0 }),
    shadow: overlayShadowSchema.default({ enabled: false, color: "#00000055", blur: 0, x: 0, y: 0 })
  }),
  dataSource: z.object({
    type: z.enum(["chat", "gift", "leaderboard", "dock", "manual"]).default("manual"),
    filters: z.record(z.unknown()).default({})
  }).default({ type: "manual", filters: {} }),
  layout: z.object({
    mode: z.enum(overlayLayoutModes).default("single"),
    maxItems: z.number().min(1).max(100).default(1),
    gap: z.number().min(0).max(240).default(12),
    direction: z.enum(["vertical", "horizontal"]).default("vertical"),
    reverse: z.boolean().default(false),
    align: z.enum(["start", "center", "end", "stretch"]).default("start"),
    enterAnimation: z.string().default("fade"),
    exitAnimation: z.string().default("fade"),
    autoCloseMs: z.number().min(0).max(600000).default(0),
    animationDurationMs: z.number().min(120).max(5000).default(620)
  }).default({
    mode: "single",
    maxItems: 1,
    gap: 12,
    direction: "vertical",
    reverse: false,
    align: "start",
    enterAnimation: "fade",
    exitAnimation: "fade",
    autoCloseMs: 0,
    animationDurationMs: 620
  }),
  components: z.array(overlayComponentSchema).default([])
});

export type OverlayDesignSchema = z.infer<typeof overlayDesignSchema>;
export type OverlayRenderData = {
  meta?: {
    id?: string | null;
    instanceId?: string | null;
    exiting?: boolean;
  };
  viewer?: {
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    badge?: string | null;
  };
  comment?: {
    text?: string | null;
    createdAt?: string | null;
  };
  gift?: {
    name?: string | null;
    count?: number | string | null;
    image?: string | null;
  };
};

export const dummyOverlayData: OverlayRenderData = {
  viewer: {
    name: "Vicky Viewer",
    username: "viewer",
    avatar: "",
    badge: "Moderator"
  },
  comment: {
    text: "Ini komentar live yang masuk.",
    createdAt: "12.34"
  },
  gift: {
    name: "Rose",
    count: 3,
    image: ""
  }
};

export const blankOverlayDesignSchema: OverlayDesignSchema = {
  version: 2,
  kind: "CUSTOM",
  name: "Untitled Overlay",
  canvas: {
    width: 1080,
    height: 1920,
    background: {
      type: "transparent",
      color: "transparent",
      opacity: 0
    },
    radius: 0,
    stroke: {
      enabled: false,
      color: "#ffffff",
      width: 0
    },
    shadow: {
      enabled: false,
      color: "#000000",
      blur: 0,
      x: 0,
      y: 0
    }
  },
  dataSource: {
    type: "manual",
    filters: {}
  },
  layout: {
    mode: "single",
    maxItems: 1,
    gap: 12,
    direction: "vertical",
    reverse: false,
    align: "start",
    enterAnimation: "fade",
    exitAnimation: "fade",
    autoCloseMs: 0,
    animationDurationMs: 620
  },
  components: []
};
