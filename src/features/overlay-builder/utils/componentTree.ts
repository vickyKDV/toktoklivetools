import type { OverlayComponentSchema, OverlayComponentType } from "@/features/overlay-builder/schema/overlaySchema";

export function isContainerType(type: OverlayComponentType) {
  return type === "container" || type === "bubble_card" || type === "glass_card" || type === "gradient_card";
}

export function findComponent(components: OverlayComponentSchema[], id: string | null): OverlayComponentSchema | null {
  if (!id) {
    return null;
  }

  for (const component of components) {
    if (component.id === id) {
      return component;
    }

    const child = findComponent(component.children ?? [], id);

    if (child) {
      return child;
    }
  }

  return null;
}

export function findParentId(components: OverlayComponentSchema[], id: string, parentId: string | null = null): string | null {
  for (const component of components) {
    if (component.id === id) {
      return parentId;
    }

    const childParent = findParentId(component.children ?? [], id, component.id);

    if (childParent !== null) {
      return childParent;
    }
  }

  return null;
}

export function updateComponentInTree(
  components: OverlayComponentSchema[],
  id: string,
  updater: (component: OverlayComponentSchema) => OverlayComponentSchema
): OverlayComponentSchema[] {
  return components.map((component) => {
    if (component.id === id) {
      return updater(component);
    }

    return {
      ...component,
      children: updateComponentInTree(component.children ?? [], id, updater)
    };
  });
}

export function removeComponentFromTree(
  components: OverlayComponentSchema[],
  id: string
): { components: OverlayComponentSchema[]; removed: OverlayComponentSchema | null; absoluteX: number; absoluteY: number } {
  return removeWithOffset(components, id, 0, 0);
}

function removeWithOffset(
  components: OverlayComponentSchema[],
  id: string,
  offsetX: number,
  offsetY: number
): { components: OverlayComponentSchema[]; removed: OverlayComponentSchema | null; absoluteX: number; absoluteY: number } {
  let removed: OverlayComponentSchema | null = null;
  let absoluteX = 0;
  let absoluteY = 0;
  const next: OverlayComponentSchema[] = [];

  for (const component of components) {
    if (component.id === id) {
      removed = component;
      absoluteX = offsetX + component.x;
      absoluteY = offsetY + component.y;
      continue;
    }

    const childResult = removeWithOffset(component.children ?? [], id, offsetX + component.x, offsetY + component.y);

    if (childResult.removed) {
      removed = childResult.removed;
      absoluteX = childResult.absoluteX;
      absoluteY = childResult.absoluteY;
      next.push({
        ...component,
        children: childResult.components
      });
      continue;
    }

    next.push(component);
  }

  return { components: next, removed, absoluteX, absoluteY };
}

export function appendComponentToParent(
  components: OverlayComponentSchema[],
  parentId: string | null,
  child: OverlayComponentSchema
): OverlayComponentSchema[] {
  if (!parentId) {
    return [...components, child];
  }

  return updateComponentInTree(components, parentId, (component) => ({
    ...component,
    children: [...(component.children ?? []), child]
  }));
}

export function moveComponentToParent(
  components: OverlayComponentSchema[],
  id: string,
  parentId: string | null,
  x: number,
  y: number
): OverlayComponentSchema[] {
  const removed = removeComponentFromTree(components, id);

  if (!removed.removed || removed.removed.id === parentId) {
    return components;
  }

  return appendComponentToParent(removed.components, parentId, {
    ...removed.removed,
    x,
    y
  });
}

export function flattenComponents(
  components: OverlayComponentSchema[],
  parentId: string | null = null,
  offsetX = 0,
  offsetY = 0
): Array<OverlayComponentSchema & { parentId: string | null; absoluteX: number; absoluteY: number }> {
  return components.flatMap((component) => [
    {
      ...component,
      parentId,
      absoluteX: offsetX + component.x,
      absoluteY: offsetY + component.y
    },
    ...flattenComponents(component.children ?? [], component.id, offsetX + component.x, offsetY + component.y)
  ]);
}
