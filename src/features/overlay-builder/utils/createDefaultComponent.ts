import { componentRegistry } from "@/features/overlay-builder/registry/componentRegistry";
import type { OverlayComponentSchema, OverlayComponentType } from "@/features/overlay-builder/schema/overlaySchema";

export function createDefaultComponent(type: OverlayComponentType, x = 24, y = 24, index = 1): OverlayComponentSchema {
  const registryItem = componentRegistry[type];

  return {
    id: `${type}_${Date.now()}_${index}`,
    type,
    name: registryItem.label,
    x,
    y,
    width: registryItem.defaultSize.width,
    height: registryItem.defaultSize.height,
    rotation: 0,
    zIndex: index,
    visible: true,
    locked: false,
    props: { ...registryItem.defaultProps },
    style: structuredClone(registryItem.defaultStyle)
  };
}
