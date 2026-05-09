import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  allowedAnimationAssetExtensions,
  createOverlayAssetFilename,
  getAnimationAssetType,
  maxAnimationUploadBytes,
  overlayAssetUploadRoot
} from "@/lib/animation-assets";
import { getCurrentUser } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!allowedAnimationAssetExtensions.has(extension)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan image, video, JSON/Lottie, atau GIF." },
      { status: 400 }
    );
  }

  if (!isAllowedUploadMime(file.type, extension)) {
    return NextResponse.json({ error: "Mime type file tidak didukung." }, { status: 400 });
  }

  if (file.size > maxAnimationUploadBytes) {
    return NextResponse.json({ error: "File terlalu besar. Maksimal 25MB." }, { status: 400 });
  }

  await mkdir(overlayAssetUploadRoot, { recursive: true });

  const filename = createOverlayAssetFilename(file.name, `user-${user.id}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(overlayAssetUploadRoot, filename), bytes);

  return NextResponse.json({
    asset: {
      id: `asset:/api/assets:${filename}`,
      name: filename,
      label: humanizeFilename(filename),
      type: getAnimationAssetType(extension),
      url: `/api/assets/${encodeURIComponent(filename)}`,
      size: file.size
    }
  });
}

function isAllowedUploadMime(mimeType: string, extension: string) {
  if (!mimeType) {
    return true;
  }

  if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) {
    return true;
  }

  return (
    mimeType === "application/json" ||
    mimeType === "application/zip" ||
    mimeType === "application/octet-stream" ||
    extension === ".json" ||
    extension === ".lottie"
  );
}

function humanizeFilename(filename: string) {
  return filename
    .replace(/^[^-]+-\d+-[a-f0-9]+-/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
