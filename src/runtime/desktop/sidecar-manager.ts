import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { readDesktopLocalConfig } from "./local-config";
import { createDesktopRuntimeEnv } from "./desktop-env";

export type DesktopSidecarService = "web" | "realtime";

export type DesktopSidecarStatus = {
  service: DesktopSidecarService;
  running: boolean;
  pid?: number;
};

export type DesktopSidecarManager = {
  start: (service: DesktopSidecarService) => Promise<DesktopSidecarStatus>;
  stop: (service: DesktopSidecarService) => Promise<DesktopSidecarStatus>;
  stopAll: () => Promise<DesktopSidecarStatus[]>;
  getStatus: (service: DesktopSidecarService) => DesktopSidecarStatus;
};

const serviceScripts: Record<DesktopSidecarService, string> = {
  web: "start:web",
  realtime: "start:realtime"
};

export function createDesktopSidecarManager(rootDir = process.cwd()): DesktopSidecarManager {
  const processes = new Map<DesktopSidecarService, ChildProcessWithoutNullStreams>();

  async function stop(service: DesktopSidecarService) {
    const child = processes.get(service);

    if (!child || child.killed) {
      processes.delete(service);
      return {
        service,
        running: false
      };
    }

    await stopProcess(child);
    processes.delete(service);

    return {
      service,
      running: false
    };
  }

  return {
    async start(service) {
      const existing = processes.get(service);

      if (existing && !existing.killed) {
        return toStatus(service, existing);
      }

      const config = await readDesktopLocalConfig(rootDir);
      const env = {
        ...process.env,
        ...createDesktopRuntimeEnv(config)
      };

      const child = spawn("pnpm", [serviceScripts[service]], {
        cwd: rootDir,
        env,
        stdio: "pipe"
      });

      child.once("exit", () => {
        processes.delete(service);
      });

      processes.set(service, child);

      return toStatus(service, child);
    },
    stop,
    async stopAll() {
      return Promise.all((["web", "realtime"] as const).map((service) => stop(service)));
    },
    getStatus(service) {
      const child = processes.get(service);
      return child && !child.killed
        ? toStatus(service, child)
        : {
            service,
            running: false
          };
    }
  };
}

function toStatus(service: DesktopSidecarService, child: ChildProcessWithoutNullStreams): DesktopSidecarStatus {
  return {
    service,
    running: !child.killed,
    pid: child.pid
  };
}

async function stopProcess(child: ChildProcessWithoutNullStreams) {
  if (child.killed) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    child.kill("SIGTERM");
  });
}
