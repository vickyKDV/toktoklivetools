import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { bindSocketServer } from "./src/lib/realtime/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 5000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
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
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
