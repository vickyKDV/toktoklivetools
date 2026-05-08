import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getAnimationAssetContentType,
  isSafeOverlayAssetFilename,
  overlayAssetUploadRoot
} from "@/lib/animation-assets";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    filename: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { filename } = await context.params;

  if (!isSafeOverlayAssetFilename(filename)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const filePath = path.join(overlayAssetUploadRoot, filename);

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const extension = path.extname(filename).toLowerCase();
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
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
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
