import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  allowedAnimationAssetExtensions,
  defaultAnimationAssetRoot,
  getAnimationAssetContentType,
  legacyAnimationAssetUploadRoot,
  overlayAssetUploadRoot
} from "@/lib/animation-assets";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    source: string;
    path: string[];
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { source, path: segments = [] } = await context.params;
  const filePaths = resolveAnimationFilePaths(source, segments);

  if (!filePaths.length) {
    return NextResponse.json({ error: "Animation asset not found" }, { status: 404 });
  }

  for (const filePath of filePaths) {
    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        continue;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = getAnimationAssetContentType(extension);
      const bytes = await readFile(filePath);
      const range = request.headers.get("range");

      if (range) {
        const partial = createPartialResponse(bytes, range, contentType);

        if (partial) {
          return partial;
        }
      }

      return new NextResponse(toArrayBuffer(bytes), {
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(bytes.byteLength),
          "Content-Type": contentType
        }
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Animation asset not found" }, { status: 404 });
}

function resolveAnimationFilePaths(source: string, segments: string[]) {
  if (source === "workspaces") {
    const [workspaceId, filename] = segments;

    if (segments.length !== 2 || !isSafeWorkspaceId(workspaceId) || !isSafeFilename(filename)) {
      return [];
    }

    return [
      path.join(overlayAssetUploadRoot, filename),
      path.join(defaultAnimationAssetRoot, "workspaces", workspaceId, filename),
      path.join(process.cwd(), "storage", "uploads", "animations", "workspaces", workspaceId, filename)
    ];
  }

  if (source === "default" || source === "legacy-default") {
    const [filename] = segments;

    if (segments.length !== 1 || !isSafeFilename(filename)) {
      return [];
    }

    const root = source === "default" ? defaultAnimationAssetRoot : legacyAnimationAssetUploadRoot;
    return [path.join(root, "default", filename)];
  }

  return [];
}

function isSafeWorkspaceId(workspaceId: string | undefined) {
  return Boolean(workspaceId && /^[a-zA-Z0-9_-]+$/.test(workspaceId));
}

function isSafeFilename(filename: string | undefined) {
  if (!filename || filename !== path.basename(filename) || filename.includes("..")) {
    return false;
  }

  return allowedAnimationAssetExtensions.has(path.extname(filename).toLowerCase());
}

function createPartialResponse(bytes: Buffer, range: string, contentType: string) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);

  if (!match) {
    return null;
  }

  const size = bytes.byteLength;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`
      }
    });
  }

  const safeEnd = Math.min(end, size - 1);
  const chunk = bytes.subarray(start, safeEnd + 1);

  return new NextResponse(toArrayBuffer(chunk), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${safeEnd}/${size}`,
      "Content-Type": contentType
    }
  });
}

function toArrayBuffer(bytes: Buffer) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
