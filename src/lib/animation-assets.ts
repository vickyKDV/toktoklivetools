import path from "node:path";

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

export const animationAssetUploadRoot = process.env.ANIMATION_UPLOAD_ROOT
  ? path.resolve(process.env.ANIMATION_UPLOAD_ROOT)
  : path.join(process.cwd(), "public", "uploads", "animations");

export const legacyAnimationAssetUploadRoot = path.join(process.cwd(), "public", "upload", "animations");

export function getWorkspaceAnimationUploadDirectory(workspaceId: string) {
  return path.join(animationAssetUploadRoot, "workspaces", workspaceId);
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
