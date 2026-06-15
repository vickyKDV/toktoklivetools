import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const binariesDir = path.join(repoRoot, "src-tauri", "binaries");
const resourcesDir = path.join(repoRoot, "src-tauri", "resources", "sidecars");

const manifestPath = path.join(resourcesDir, "README.md");
const sidecars = [
  {
    target: "aarch64-apple-darwin",
    fileName: "liplo-runtime-aarch64-apple-darwin",
    script: unixPlaceholder("aarch64-apple-darwin")
  },
  {
    target: "x86_64-apple-darwin",
    fileName: "liplo-runtime-x86_64-apple-darwin",
    script: unixPlaceholder("x86_64-apple-darwin")
  },
  {
    target: "x86_64-pc-windows-msvc",
    fileName: "liplo-runtime-x86_64-pc-windows-msvc.exe",
    script: windowsPlaceholder("x86_64-pc-windows-msvc")
  }
];

await mkdir(binariesDir, { recursive: true });
await mkdir(resourcesDir, { recursive: true });

for (const sidecar of sidecars) {
  const runtimePath = path.join(binariesDir, sidecar.fileName);

  if (!(await exists(runtimePath))) {
    await writeFile(runtimePath, sidecar.script, "utf8");

    if (!sidecar.fileName.endsWith(".exe")) {
      await chmod(runtimePath, 0o755);
    }
  }
}

await writeFile(
  manifestPath,
  [
    "# Liplo Desktop Sidecars",
    "",
    "Tauri config uses the logical sidecar name `binaries/liplo-runtime`.",
    "Release CI must provide target-triple suffixed source binaries before `tauri build` runs.",
    "",
    "The sidecar is responsible for starting the local web/realtime/TikTok runtime without requiring user-installed Node or pnpm.",
    "`pnpm desktop:prepare` creates missing target-triple placeholders and builds a real host-platform `liplo-runtime` sidecar for local validation.",
    "Any remaining placeholder for a non-host target must be replaced in release CI before that target is packaged.",
    "",
    "Required target-triple filenames:",
    "- macOS Apple Silicon: `src-tauri/binaries/liplo-runtime-aarch64-apple-darwin`",
    "- macOS Intel: `src-tauri/binaries/liplo-runtime-x86_64-apple-darwin`",
    "- Windows x64: `src-tauri/binaries/liplo-runtime-x86_64-pc-windows-msvc.exe`",
    "",
    "Do not ship a placeholder as the production runtime.",
    "",
  ].join("\n"),
  "utf8",
);

await buildHostRuntimeSidecar();

console.log("Prepared desktop sidecars:");
for (const sidecar of sidecars) {
  console.log(`- ${path.join("src-tauri", "binaries", sidecar.fileName)}`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function unixPlaceholder(target) {
  return `#!/usr/bin/env sh
echo "Liplo packaged runtime sidecar is not bundled in this build." >&2
echo "Replace src-tauri/binaries/liplo-runtime-${target} with the platform runtime binary in release CI." >&2
exit 78
`;
}

function windowsPlaceholder(target) {
  return `@echo off
echo Liplo packaged runtime sidecar is not bundled in this build. 1>&2
echo Replace src-tauri\\binaries\\liplo-runtime-${target}.exe with the platform runtime binary in release CI. 1>&2
exit /b 78
`;
}

function buildHostRuntimeSidecar() {
  const target = hostTarget();
  const script = path.join(repoRoot, "scripts", "desktop", "build-runtime-sidecar.mjs");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, `--target=${target}`], {
      cwd: repoRoot,
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to build host liplo-runtime sidecar for ${target}`));
      }
    });
    child.on("error", reject);
  });
}

function hostTarget() {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  }

  if (process.platform === "win32") {
    return "x86_64-pc-windows-msvc";
  }

  throw new Error(`Unsupported desktop host: ${process.platform}/${process.arch}`);
}
