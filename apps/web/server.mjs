// Custom Next.js server with a WebSocket proxy at /chain.
//
// The browser SDK connects to wss://<origin>/chain (see NEXT_PUBLIC_WS_ENDPOINT),
// which lands here over the same origin (works through a single ngrok tunnel) and
// is proxied to the local Substrate node at NODE_WS. This avoids needing a second
// ngrok tunnel just for the node's RPC port.
//
// The /chain proxy is implemented at the raw socket level (no extra deps): on an
// HTTP upgrade for /chain we open a TCP socket to the node, replay the WebSocket
// handshake (rewriting the path to "/" and the Host header), then pipe both ways.
// Every other upgrade (Next.js HMR in dev) is handed back to Next.

import { createServer } from "node:http";
import { parse } from "node:url";
import { readFileSync } from "node:fs";
import net from "node:net";
import nextFactory from "next";

// Minimal .env loader (no dep): Next loads NEXT_PUBLIC_* itself for the browser
// bundle; this is only so server.mjs sees NODE_WS / HOST / PORT at startup.
for (const file of [".env.local", ".env"]) {
  try {
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* file may not exist */
  }
}

const dev = process.env.NODE_ENV !== "production";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_WS = process.env.NODE_WS || "ws://127.0.0.1:9944";

const backend = new URL(NODE_WS);
const BACKEND_HOST = backend.hostname;
const BACKEND_PORT = parseInt(backend.port || "9944", 10);

const app = nextFactory({ dev });
const handle = app.getRequestHandler();
const upgradeHandler =
  typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : null;

function proxyChain(req, clientSocket, head) {
  const target = net.connect(BACKEND_PORT, BACKEND_HOST, () => {
    let path = req.url.slice("/chain".length);
    if (!path.startsWith("/")) path = "/" + path;

    const lines = [`GET ${path} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const key = req.rawHeaders[i];
      let val = req.rawHeaders[i + 1];
      if (key.toLowerCase() === "host") val = `${BACKEND_HOST}:${BACKEND_PORT}`;
      lines.push(`${key}: ${val}`);
    }
    target.write(lines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) target.write(head);

    target.pipe(clientSocket);
    clientSocket.pipe(target);
  });

  target.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => target.destroy());
}

await app.prepare();

const server = createServer((req, res) => handle(req, res, parse(req.url, true)));

server.on("upgrade", (req, socket, head) => {
  const { pathname } = parse(req.url);
  if (pathname && pathname.startsWith("/chain")) {
    proxyChain(req, socket, head);
  } else if (upgradeHandler) {
    upgradeHandler(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `▶ web on http://${HOST}:${PORT}  •  /chain → ${NODE_WS}  •  mode=${dev ? "dev" : "prod"}`,
  );
});
