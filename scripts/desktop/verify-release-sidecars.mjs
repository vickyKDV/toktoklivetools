import { access, constants } from "node:fs/promises";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");

const targets = selectedTargets();
const expected = targets.map((target) => `liplo-runtime-${target}${target.includes("windows") ? ".exe" : ""}`);

let failed = false;

for (const fileName of expected) {
  const filePath = path.join(root, "src-tauri", "binaries", fileName);

  try {
    const info = await stat(filePath);
    const raw = await readFile(filePath, "utf8").catch(() => "");
    const isPlaceholder =
      raw.includes("Liplo packaged runtime sidecar is not bundled in this build.") ||
      raw.includes("Replace src-tauri/binaries/liplo-runtime");

    if (!info.isFile() || info.size === 0 || isPlaceholder) {
      failed = true;
      console.error(`[desktop] ${fileName} is not a release sidecar binary.`);
      continue;
    }

    if (!fileName.endsWith(".exe")) {
      try {
        await access(filePath, constants.X_OK);
      } catch {
        failed = true;
        console.error(`[desktop] ${fileName} is not executable.`);
        continue;
      }
    }

    if (canRunOnHost(sidecarTarget(fileName))) {
      const selfCheck = await runSelfCheck(filePath).catch((error) => {
        failed = true;
        console.error(`[desktop] ${fileName} self-check failed: ${error.message}`);
        return null;
      });

      if (selfCheck && (
        selfCheck.placeholder === true ||
        selfCheck.requiresPnpm === true ||
        selfCheck.requiresProjectSource === true ||
        selfCheck.requiresUserNode === true
      )) {
        failed = true;
        console.error(`[desktop] ${fileName} self-check did not meet release requirements.`);
      }
    }
  } catch {
    failed = true;
    console.error(`[desktop] Missing release sidecar: ${fileName}`);
  }
}

if (failed) {
  console.error(
    [
      "",
      "Release builds must provide real sidecars before Tauri packaging.",
      `Selected target${targets.length > 1 ? "s" : ""}: ${targets.join(", ")}`,
      "",
      "Required filenames:",
      ...expected.map((fileName) => `- src-tauri/binaries/${fileName}`),
      "",
      "Use `pnpm desktop:verify-release-sidecars -- --all` in full release CI.",
      "Use `pnpm desktop:verify-release-sidecars -- --target=<target-triple>` for one release target."
    ].join("\n")
  );
  process.exit(1);
}

console.log("[desktop] Release sidecars verified.");

function selectedTargets() {
  const explicitTarget = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--target="))
    ?.slice("--target=".length);

  if (explicitTarget) {
    return [explicitTarget];
  }

  if (process.argv.includes("--all")) {
    return [
      "aarch64-apple-darwin",
      "x86_64-apple-darwin",
      "x86_64-pc-windows-msvc"
    ];
  }

  return [hostTarget()];
}

function sidecarTarget(fileName) {
  return fileName
    .replace(/^liplo-runtime-/, "")
    .replace(/\.exe$/, "");
}

function canRunOnHost(target) {
  if (process.platform === "darwin") {
    if (target === "aarch64-apple-darwin") {
      return process.arch === "arm64";
    }

    if (target === "x86_64-apple-darwin") {
      return process.arch === "x64";
    }
  }

  if (process.platform === "win32") {
    return target === "x86_64-pc-windows-msvc";
  }

  return false;
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

function runSelfCheck(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(filePath, ["self-check"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `exited with ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
    child.on("error", reject);
  });
}
