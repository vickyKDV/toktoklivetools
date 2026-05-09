import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  allowedAnimationAssetExtensions,
  createOverlayAssetFilename,
  defaultAnimationAssetRoot,
  getAnimationAssetType,
  getWorkspaceAnimationUploadDirectory,
  legacyAnimationAssetUploadRoot,
  maxAnimationUploadBytes
} from "@/lib/animation-assets";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

type AnimationAssetSource = "default" | "workspace";

export async function GET(_request: Request, context: RouteContext) {
  const auth = await authorizeWorkspace(context);

  if (!auth.ok) {
    return auth.response;
  }

  const assets = [
    ...(await readAssets(
      "default",
      "Default Template",
      path.join(defaultAnimationAssetRoot, "default"),
      "/media/animations/default"
    )),
    ...(await readAssets(
      "default",
      "Default Template",
      path.join(legacyAnimationAssetUploadRoot, "default"),
      "/media/animations/legacy-default"
    )),
    ...(await readAssets(
      "workspace",
      "Workspace Upload",
      getWorkspaceAnimationUploadDirectory(auth.workspaceId),
      "/api/assets",
      `${auth.workspaceId}-`
    ))
  ];

  return NextResponse.json({ assets });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorizeWorkspace(context);

  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!allowedAnimationAssetExtensions.has(extension)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan JSON/Lottie, video, atau image." },
      { status: 400 }
    );
  }

  if (file.size > maxAnimationUploadBytes) {
    return NextResponse.json({ error: "File terlalu besar. Maksimal 25MB." }, { status: 400 });
  }

  const uploadDirectory = getWorkspaceAnimationUploadDirectory(auth.workspaceId);
  await mkdir(uploadDirectory, { recursive: true });

  const filename = createOverlayAssetFilename(file.name, auth.workspaceId);
  const filePath = path.join(uploadDirectory, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  const asset = await toAsset({
    source: "workspace",
    sourceLabel: "Workspace Upload",
    filename,
    directory: uploadDirectory,
    urlPrefix: "/api/assets"
  });

  return NextResponse.json({ asset });
}

async function authorizeWorkspace(context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const { workspaceId } = await context.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid workspace" }, { status: 400 })
    };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: {
        some: {
          userId: user.id
        }
      }
    },
    select: {
      id: true
    }
  });

  if (!workspace) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    };
  }

  return {
    ok: true as const,
    workspaceId: workspace.id
  };
}

async function readAssets(
  source: AnimationAssetSource,
  sourceLabel: string,
  directory: string,
  urlPrefix: string,
  filenamePrefix?: string
) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          (!filenamePrefix || entry.name.startsWith(filenamePrefix)) &&
          allowedAnimationAssetExtensions.has(path.extname(entry.name).toLowerCase())
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    return Promise.all(
      files.map((filename) =>
        toAsset({
          source,
          sourceLabel,
          filename,
          directory,
          urlPrefix
        })
      )
    );
  } catch {
    return [];
  }
}

async function toAsset({
  source,
  sourceLabel,
  filename,
  directory,
  urlPrefix
}: {
  source: AnimationAssetSource;
  sourceLabel: string;
  filename: string;
  directory: string;
  urlPrefix: string;
}) {
  const fileStat = await stat(path.join(directory, filename));
  const extension = path.extname(filename).toLowerCase();

  return {
    id: `${source}:${urlPrefix}:${filename}`,
    name: filename,
    label: humanizeFilename(filename),
    source,
    sourceLabel,
    type: getAnimationAssetType(extension),
    url: `${urlPrefix}/${encodeURIComponent(filename)}`,
    size: fileStat.size
  };
}

function humanizeFilename(filename: string) {
  return filename
    .replace(/^\d+-/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
