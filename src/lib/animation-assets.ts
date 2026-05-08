import path from "node:path";
import { randomUUID } from "node:crypto";

export const allowedAnimationAssetExtensions = new Set([
  ".json",
  ".lottie",
  ".webm",
  ".mp4",
  ".mov",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg"
]);

export const maxAnimationUploadBytes = 25 * 1024 * 1024;

export const defaultAnimationAssetRoot = path.join(process.cwd(), "public", "uploads", "animations");

export const overlayAssetUploadRoot = path.join(process.cwd(), "storage", "uploads", "overlay-assets");

export const legacyAnimationAssetUploadRoot = path.join(process.cwd(), "public", "upload", "animations");

export function getWorkspaceAnimationUploadDirectory(workspaceId: string) {
  void workspaceId;
  return overlayAssetUploadRoot;
}

export function createOverlayAssetFilename(originalFilename: string, scope = "asset") {
  const extension = path.extname(originalFilename).toLowerCase();
  const base = path.basename(originalFilename, extension);
  const safeBase =
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "upload";
  const safeScope =
    scope
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "asset";

  return `${safeScope}-${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}${extension}`;
}

export function isSafeOverlayAssetFilename(filename: string | undefined) {
  if (!filename || filename !== path.basename(filename) || filename.includes("..")) {
    return false;
  }

  return allowedAnimationAssetExtensions.has(path.extname(filename).toLowerCase());
}

export function getAnimationAssetType(extension: string) {
  if (extension === ".json" || extension === ".lottie") {
    return "lottie";
  }

  if (extension === ".webm" || extension === ".mp4" || extension === ".mov") {
    return "video";
  }

  return "image";
}

export function getAnimationAssetContentType(extension: string) {
  switch (extension) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".lottie":
      return "application/octet-stream";
    case ".webm":
      return "video/webm";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
