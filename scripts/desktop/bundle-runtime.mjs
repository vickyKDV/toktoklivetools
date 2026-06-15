import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runtimeRoot = path.join(repoRoot, "src-tauri", "resources", "liplo-runtime");
const webRoot = path.join(runtimeRoot, "web");
const realtimeRoot = path.join(runtimeRoot, "realtime");
const nodeRoot = path.join(runtimeRoot, "node");

await ensureNextStandalone();

await rm(runtimeRoot, { recursive: true, force: true });
await mkdir(webRoot, { recursive: true });
await mkdir(realtimeRoot, { recursive: true });
await mkdir(nodeRoot, { recursive: true });

await cp(path.join(repoRoot, ".next", "standalone"), webRoot, { recursive: true, dereference: true });
await cp(path.join(repoRoot, ".next", "static"), path.join(webRoot, ".next", "static"), {
  recursive: true,
  dereference: true
});
await removeEnvFiles(webRoot);
await replaceNextRuntimePackage(webRoot);
await ensureNextRuntimeDependencies(webRoot);
await ensurePrismaClientPackage(webRoot);
await ensurePrismaRuntime(webRoot);
await patchPrismaClientExports(webRoot);
await ensureNodePackage(webRoot, "client-only");

if (await exists(path.join(repoRoot, "public"))) {
  await cp(path.join(repoRoot, "public"), path.join(webRoot, "public"), {
    recursive: true,
    dereference: true
  });
}

await build({
  entryPoints: [path.join(repoRoot, "realtime-server.ts")],
  outfile: path.join(realtimeRoot, "realtime-server.cjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
  external: [
    "@prisma/client",
    ".prisma/client",
    "tiktok-live-connector"
  ],
  alias: {
    "@": path.join(repoRoot, "src")
  }
});

await cp(process.execPath, path.join(nodeRoot, process.platform === "win32" ? "node.exe" : "node"));

console.log(`[desktop] Runtime bundle prepared at ${path.relative(repoRoot, runtimeRoot)}`);

async function ensureNextStandalone() {
  const standalone = path.join(repoRoot, ".next", "standalone", "server.js");
  try {
    const info = await stat(standalone);
    if (info.isFile()) {
      return;
    }
  } catch {
    // handled below
  }

  throw new Error("Missing .next/standalone/server.js. Run `pnpm build:desktop` after enabling Next standalone output.");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeEnvFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(".env"))
      .map((entry) => rm(path.join(directory, entry.name), { force: true }))
  );
}

async function ensureNextRuntimeDependencies(directory) {
  const pnpmRoot = path.join(directory, "node_modules", ".pnpm");
  const pnpmEntries = await readdir(pnpmRoot, { withFileTypes: true });
  const nextPackage = pnpmEntries.find((entry) => entry.isDirectory() && entry.name.startsWith("next@"));

  if (!nextPackage) {
    return;
  }

  const nextNodeModules = path.join(pnpmRoot, nextPackage.name, "node_modules");
  const dependencies = await readdir(nextNodeModules, { withFileTypes: true });

  await Promise.all(
    dependencies
      .filter((entry) => entry.isDirectory() && entry.name !== "next")
      .map(async (entry) => {
        const target = path.join(directory, "node_modules", entry.name);
        if (await exists(target)) {
          return;
        }

        await cp(path.join(nextNodeModules, entry.name), target, {
          recursive: true,
          dereference: true
        });
      })
  );
}

async function ensurePrismaRuntime(directory) {
  const source = await findNestedPackageRuntime(
    path.join(repoRoot, ".next", "standalone", "node_modules", ".pnpm"),
    (entry) => entry.name.startsWith("@prisma+client@"),
    ["node_modules", ".prisma"]
  );

  if (!source) {
    return;
  }

  const packageTarget = path.join(directory, "node_modules", "@prisma", "client", ".prisma");
  const nodeModulesTarget = path.join(directory, "node_modules", ".prisma");

  await rm(packageTarget, { recursive: true, force: true });
  await cp(source, packageTarget, {
    recursive: true,
    dereference: true
  });

  await rm(nodeModulesTarget, { recursive: true, force: true });
  await cp(source, nodeModulesTarget, {
    recursive: true,
    dereference: true
  });
}

async function ensurePrismaClientPackage(directory) {
  const source = await findNestedPackageRuntime(
    path.join(repoRoot, "node_modules", ".pnpm"),
    (entry) => entry.name.startsWith("@prisma+client@"),
    ["node_modules", "@prisma", "client"]
  );

  if (!source) {
    return;
  }

  const target = path.join(directory, "node_modules", "@prisma", "client");
  await rm(target, { recursive: true, force: true });
  await cp(source, target, {
    recursive: true,
    dereference: true
  });
}

async function patchPrismaClientExports(directory) {
  const packageJsonPath = path.join(directory, "node_modules", "@prisma", "client", "package.json");
  if (!(await exists(packageJsonPath))) {
    return;
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.exports = {
    ...packageJson.exports,
    "./default": "./default.js",
    "./edge": "./edge.js",
    "./extension": "./extension.js",
    "./index": "./index.js",
    "./react-native": "./react-native.js",
    "./sql": "./sql.js",
    "./wasm": "./wasm.js"
  };

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function ensureNodePackage(directory, packageName) {
  const target = path.join(directory, "node_modules", packageName);
  if (await exists(target)) {
    return;
  }

  const source = await findNestedPackageRuntime(
    path.join(repoRoot, "node_modules", ".pnpm"),
    (entry) => entry.name === `${packageName}@0.0.1`,
    ["node_modules", packageName]
  );

  if (!source) {
    return;
  }

  await cp(source, target, {
    recursive: true,
    dereference: true
  });
}

async function findNestedPackageRuntime(root, predicate, childPath) {
  if (!(await exists(root))) {
    return null;
  }

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !predicate(entry)) {
      continue;
    }

    const candidate = path.join(root, entry.name, ...childPath);
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function replaceNextRuntimePackage(directory) {
  const bundledNext = path.join(directory, "node_modules", "next");
  const workspaceNext = path.join(repoRoot, "node_modules", "next");

  if (!(await exists(workspaceNext))) {
    return;
  }

  await rm(bundledNext, { recursive: true, force: true });
  await cp(workspaceNext, bundledNext, {
    recursive: true,
    dereference: true
  });
}
