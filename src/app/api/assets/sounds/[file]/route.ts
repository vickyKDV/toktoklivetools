import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    file: string;
  }>;
};

const allowedFiles = new Set([
  "message_sound_alert.mp3",
  "message_sound_alert_2.mp3",
  "message_sound_alert_3.mp3"
]);

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;

  if (!allowedFiles.has(file)) {
    return NextResponse.json({ error: "Sound not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "src", "assets", "alert", file);
  const bytes = await readFile(filePath);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
