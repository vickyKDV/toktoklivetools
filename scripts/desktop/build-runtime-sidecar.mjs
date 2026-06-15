import { chmod, copyFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const target = process.argv.find((arg) => arg.startsWith("--target="))?.slice("--target=".length) ?? hostTarget();
const isWindowsTarget = target.includes("windows");
const binName = `liplo-runtime-${target}${isWindowsTarget ? ".exe" : ""}`;
const cargo = resolveCargo();
const sidecarRoot = path.join(repoRoot, "src-tauri", "runtime-sidecar");
const outputPath = path.join(sidecarRoot, "target", target, "release", `liplo-runtime${isWindowsTarget ? ".exe" : ""}`);
const fallbackOutputPath = path.join(sidecarRoot, "target", "release", `liplo-runtime${process.platform === "win32" ? ".exe" : ""}`);
const destination = path.join(repoRoot, "src-tauri", "binaries", binName);

await run(cargo, ["build", "--release", "--target", target], sidecarRoot);
await mkdir(path.dirname(destination), { recursive: true });
await copyFile(outputPath, destination).catch(async () => {
  if (target === hostTarget()) {
    await copyFile(fallbackOutputPath, destination);
    return;
  }

  throw new Error(`Missing cargo output: ${outputPath}`);
});

if (!isWindowsTarget) {
  await chmod(destination, 0o755);
}

console.log(`[desktop] Built ${path.relative(repoRoot, destination)}`);

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? 1}`));
      }
    });
    child.on("error", reject);
  });
}

function resolveCargo() {
  try {
    return execFileSync("rustup", ["which", "cargo"], {
      encoding: "utf8"
    }).trim();
  } catch {
    return process.platform === "win32" ? "cargo.exe" : "cargo";
  }
}

function hostTarget() {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  }

  if (process.platform === "win32") {
    return "x86_64-pc-windows-msvc";
  }

  throw new Error(`Unsupported desktop release host: ${process.platform}/${process.arch}`);
}
