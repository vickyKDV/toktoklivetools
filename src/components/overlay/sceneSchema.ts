import { z } from "zod";
import {
  blankOverlayDesignSchema,
  overlayAnimationEffectSchema,
  overlayBackgroundSchema,
  overlayComponentSchema,
  overlayComponentStyleSchema,
  overlayComponentTypes,
  overlayDesignSchema,
  overlayKinds,
  overlayShadowSchema,
  overlayStrokeSchema,
  type OverlayComponentSchema,
  type OverlayDesignSchema
} from "@/core/overlay/schema";
import { normalizeDesignSchema } from "@/core/overlay/normalizeDesignSchema";

export const SCENE_BASE_CANVAS = {
  width: 1080,
  height: 1920
} as const;

export const sceneLayoutSchema = z.object({
  x: z.number().finite().default(0),
  y: z.number().finite().default(0),
  width: z.number().finite().min(1).default(1),
  height: z.number().finite().min(1).default(1),
  rotate: z.number().finite().default(0),
  zIndex: z.number().finite().default(1)
});

export const sceneElementSchema: z.ZodType<SceneElement, z.ZodTypeDef, unknown> = z.lazy(() => z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  layout: sceneLayoutSchema.default({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotate: 0,
    zIndex: 1
  }),
  style: overlayComponentStyleSchema.default({}),
  dataBinding: z.record(z.unknown()).default({}),
  animation: overlayAnimationEffectSchema.optional(),
  children: z.array(sceneElementSchema).default([])
}));

export type SceneElement = {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layout: z.infer<typeof sceneLayoutSchema>;
  style: z.infer<typeof overlayComponentStyleSchema>;
  dataBinding: Record<string, unknown>;
  animation?: z.infer<typeof overlayAnimationEffectSchema>;
  children: SceneElement[];
};

export const overlaySceneSchema = z.object({
  version: z.number().default(1),
  kind: z.enum(overlayKinds).default("CUSTOM"),
  name: z.string().min(1).default("Untitled Scene"),
  canvas: z.object({
    width: z.number().finite().min(120).max(3840).default(SCENE_BASE_CANVAS.width),
    height: z.number().finite().min(80).max(3840).default(SCENE_BASE_CANVAS.height),
    background: overlayBackgroundSchema.default({ type: "transparent", color: "transparent", opacity: 0 }),
    radius: z.number().finite().min(0).max(999).default(0),
    radiusTopLeft: z.number().finite().min(0).max(999).optional(),
    radiusTopRight: z.number().finite().min(0).max(999).optional(),
    radiusBottomRight: z.number().finite().min(0).max(999).optional(),
    radiusBottomLeft: z.number().finite().min(0).max(999).optional(),
    stroke: overlayStrokeSchema.default({ enabled: false, color: "#ffffff", width: 0 }),
    shadow: overlayShadowSchema.default({ enabled: false, color: "#00000055", blur: 0, x: 0, y: 0 })
  }),
  elements: z.array(sceneElementSchema).default([]),
  theme: z.record(z.unknown()).default({}),
  animations: z.record(z.unknown()).default({}),
  dataSource: overlayDesignSchema.shape.dataSource,
  layout: overlayDesignSchema.shape.layout
});

export type OverlaySceneSchema = z.infer<typeof overlaySceneSchema>;

export function normalizeSceneSchema(value: unknown): OverlaySceneSchema {
  if (isOverlayScene(value)) {
    const parsed = overlaySceneSchema.safeParse(value);

    if (parsed.success) {
      return sanitizeScene(parsed.data);
    }
  }

  if (value == null) {
    return overlaySceneSchema.parse({
      version: 1,
      kind: "CUSTOM",
      name: "Untitled Scene",
      canvas: {
        width: SCENE_BASE_CANVAS.width,
        height: SCENE_BASE_CANVAS.height,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#00000055", blur: 0, x: 0, y: 0 }
      },
      elements: [],
      theme: {},
      animations: {}
    });
  }

  return migrateOverlayDesignToScene(normalizeDesignSchema(value));
}

export function migrateOverlayDesignToScene(design: OverlayDesignSchema): OverlaySceneSchema {
  const normalized = normalizeDesignSchema(design);

  return sanitizeScene({
    version: 1,
    kind: normalized.kind,
    name: normalized.name,
    canvas: {
      width: normalized.canvas.width,
      height: normalized.canvas.height,
      background: normalized.canvas.background,
      radius: normalized.canvas.radius,
      radiusTopLeft: normalized.canvas.radiusTopLeft,
      radiusTopRight: normalized.canvas.radiusTopRight,
      radiusBottomRight: normalized.canvas.radiusBottomRight,
      radiusBottomLeft: normalized.canvas.radiusBottomLeft,
      stroke: normalized.canvas.stroke,
      shadow: normalized.canvas.shadow
    },
    elements: normalized.components.map(componentToSceneElement),
    theme: {},
    animations: normalized.canvas.animation ? { canvas: normalized.canvas.animation } : {},
    dataSource: normalized.dataSource,
    layout: normalized.layout
  });
}

export function migrateSceneToOverlayDesign(scene: OverlaySceneSchema): OverlayDesignSchema {
  const normalized = sanitizeScene(scene);

  return normalizeDesignSchema({
    version: 2,
    kind: normalized.kind,
    name: normalized.name,
    canvas: {
      ...blankOverlayDesignSchema.canvas,
      ...normalized.canvas,
      animation: (normalized.animations.canvas as OverlayDesignSchema["canvas"]["animation"] | undefined)
        ?? blankOverlayDesignSchema.canvas.animation
    },
    dataSource: normalized.dataSource,
    layout: normalized.layout,
    components: normalized.elements.map(sceneElementToComponent)
  });
}

function componentToSceneElement(component: OverlayComponentSchema): SceneElement {
  return {
    id: component.id,
    type: component.type,
    name: component.name,
    visible: component.visible && !component.hidden,
    locked: component.locked,
    layout: sanitizeLayout({
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
      rotate: component.rotation ?? 0,
      zIndex: component.zIndex
    }),
    style: component.style,
    dataBinding: component.props,
    animation: component.style.animation,
    children: (component.children ?? []).map(componentToSceneElement)
  };
}

function sceneElementToComponent(element: SceneElement): OverlayComponentSchema {
  const type = overlayComponentTypes.includes(element.type as OverlayComponentSchema["type"])
    ? element.type
    : "comment";
  const style = {
    ...element.style,
    animation: element.animation ?? element.style.animation
  };

  return overlayComponentSchema.parse({
    id: element.id,
    type,
    name: element.name,
    x: element.layout.x,
    y: element.layout.y,
    width: element.layout.width,
    height: element.layout.height,
    rotation: element.layout.rotate,
    zIndex: element.layout.zIndex,
    visible: element.visible,
    hidden: !element.visible,
    locked: element.locked,
    props: element.dataBinding,
    style,
    children: element.children.map(sceneElementToComponent)
  });
}

function isOverlayScene(value: unknown): value is OverlaySceneSchema {
  return Boolean(value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).elements));
}

function sanitizeScene(scene: OverlaySceneSchema): OverlaySceneSchema {
  return {
    ...scene,
    canvas: {
      ...scene.canvas,
      width: safeNumber(scene.canvas.width, SCENE_BASE_CANVAS.width, 120),
      height: safeNumber(scene.canvas.height, SCENE_BASE_CANVAS.height, 80)
    },
    elements: scene.elements.map(sanitizeElement)
  };
}

function sanitizeElement(element: SceneElement): SceneElement {
  return {
    ...element,
    layout: sanitizeLayout(element.layout),
    children: element.children.map(sanitizeElement)
  };
}

function sanitizeLayout(layout: SceneElement["layout"]) {
  return {
    x: safeNumber(layout.x, 0),
    y: safeNumber(layout.y, 0),
    width: safeNumber(layout.width, 1, 1),
    height: safeNumber(layout.height, 1, 1),
    rotate: safeNumber(layout.rotate, 0),
    zIndex: safeNumber(layout.zIndex, 1)
  };
}

function safeNumber(value: unknown, fallback: number, min?: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return min == null ? number : Math.max(min, number);
}
