import { createServer } from "http";
import { Server } from "socket.io";
import { startTikTokConnection, stopTikTokConnection } from "./src/lib/tiktok/connection-manager";
import { bindSocketServer } from "./src/server/realtime/socket-server";

const hostname = process.env.REALTIME_HOSTNAME || process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.REALTIME_PORT || 7051);
const controlToken = process.env.REALTIME_CONTROL_TOKEN || "";

const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${hostname}:${port}`}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "liplo-realtime" }));
    return;
  }

  const match = url.pathname.match(/^\/internal\/realtime\/tiktok\/([^/]+)\/(start|stop)$/);

  if (request.method === "POST" && match) {
    if (controlToken && request.headers.authorization !== `Bearer ${controlToken}`) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    try {
      const workspaceId = decodeURIComponent(match[1] ?? "");
      const intent = match[2];
      const result = intent === "start"
        ? await startTikTokConnection(workspaceId)
        : await stopTikTokConnection(workspaceId);

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Realtime control failed" }));
    }

    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  pingInterval: 25_000,
  pingTimeout: 20_000,
  connectTimeout: 20_000,
  cors: {
    origin: "*"
  }
});

bindSocketServer(io);

httpServer.listen(port, hostname, () => {
  console.log(`> Liplo realtime ready on http://${hostname}:${port}`);
});
