import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = {
  ...process.env,
  LIPLO_APP_MODE: "desktop",
  LIPLO_DATA_MODE: "cloud",
  LIPLO_RUNTIME_MODE: "desktop-cloud",
  NEXT_PUBLIC_WIDGET_BASE_URL: "http://127.0.0.1:7050",
  NEXT_PUBLIC_SOCKET_URL: "http://127.0.0.1:7051"
};

await cleanGeneratedDesktopArtifacts();
await run(["build"], env);
await run(["desktop:runtime:bundle"], env);

async function cleanGeneratedDesktopArtifacts() {
  await rm(path.join(repoRoot, "src-tauri", "resources", "liplo-runtime", "web"), {
    recursive: true,
    force: true
  });
  await rm(path.join(repoRoot, "src-tauri", "resources", "liplo-runtime", "realtime"), {
    recursive: true,
    force: true
  });
  await rm(path.join(repoRoot, "src-tauri", "resources", "liplo-runtime", "node"), {
    recursive: true,
    force: true
  });
  await rm(path.join(repoRoot, ".next", "standalone", "src-tauri"), {
    recursive: true,
    force: true
  });
}

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit"
    });

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
