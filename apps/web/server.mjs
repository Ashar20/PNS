/**
 * Custom Next.js server that ALSO proxies WebSocket upgrade requests on /chain
 * to a local Substrate node (default ws://127.0.0.1:9944).
 *
 * Used so a single ngrok tunnel can expose both the dApp and the node WS RPC
 * without needing two public domains.
 *
 *   PORT=3000 NODE_WS=ws://127.0.0.1:9944 node server.mjs
 */

import { createServer } from "node:http";
import next from "next";
import httpProxy from "http-proxy";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const NODE_WS = process.env.NODE_WS ?? "ws://127.0.0.1:9944";
const DEV = process.env.NODE_ENV !== "production";

console.log(`[pns-server] starting Next (dev=${DEV}) on ${HOST}:${PORT}`);
console.log(`[pns-server] WS /chain → ${NODE_WS}`);

const app = next({ dev: DEV });
const handle = app.getRequestHandler();
await app.prepare();

const wsProxy = httpProxy.createProxyServer({
  target: NODE_WS,
  ws: true,
  changeOrigin: true,
  ignorePath: true,
});

wsProxy.on("error", (err, _req, socket) => {
  console.error("[pns-server] ws proxy error:", err.message);
  try { socket?.destroy?.(); } catch { /* ignore */ }
});

const server = createServer((req, res) => handle(req, res));

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/chain")) {
    console.log("[pns-server] upgrading WS:", req.url, "→", NODE_WS);
    wsProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[pns-server] ready: http://${HOST}:${PORT}`);
});
