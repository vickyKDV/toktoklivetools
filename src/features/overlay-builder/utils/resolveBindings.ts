import type { OverlayRenderData } from "@/features/overlay-builder/schema/overlaySchema";

const bindingMap: Record<string, (data: OverlayRenderData) => string> = {
  "viewer.name": (data) => data.viewer?.name ?? "Viewer",
  "viewer.username": (data) => data.viewer?.username ? `@${data.viewer.username}` : "",
  "viewer.avatar": (data) => data.viewer?.avatar ?? "",
  "viewer.badge": (data) => data.viewer?.badge ?? "",
  "comment.text": (data) => data.comment?.text ?? "",
  "comment.createdAt": (data) => data.comment?.createdAt ?? "",
  "gift.name": (data) => data.gift?.name ?? "",
  "gift.count": (data) => String(data.gift?.count ?? ""),
  "gift.image": (data) => data.gift?.image ?? "",
  "giftName": (data) => data.gift?.name ?? "",
  "GiftName": (data) => data.gift?.name ?? "",
  "count": (data) => String(data.gift?.count ?? "")
};

export function resolveBindings(value: unknown, data: OverlayRenderData): string {
  if (typeof value !== "string") {
    return value == null ? "" : String(value);
  }

  return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => bindingMap[key]?.(data) ?? "");
}
