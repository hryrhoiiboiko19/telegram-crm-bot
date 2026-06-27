import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { metricsRegistry, httpRequestsDurationSeconds } from "./index.js";
import { getRedis } from "../config/redis.js";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { Logger } from "../utils/logger/index.js";

function measure(
  route: string,
  method: string,
  status: number,
  startedAt: number,
): void {
  const duration = (Date.now() - startedAt) / 1000;
  httpRequestsDurationSeconds
    .labels({ route, method, status: String(status) })
    .observe(duration);
}

async function handleHealth(): Promise<number> {
  try {
    const redis = getRedis();
    await redis.ping();
    await pool.query("SELECT 1");
    return 200;
  } catch {
    return 500;
  }
}

let metricsServer: Server | null = null;

export function startMetricsServer(): Server {
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const startedAt = Date.now();
      const url = req.url ?? "/";

      try {
        if (url === "/healthz") {
          const status = await handleHealth();
          res.writeHead(status, { "Content-Type": "text/plain" });
          res.end(status === 200 ? "ok" : "error");
          measure("/healthz", "GET", status, startedAt);
          return;
        }

        if (url === "/metrics") {
          const metrics = await metricsRegistry.metrics();
          res.writeHead(200, { "Content-Type": metricsRegistry.contentType });
          res.end(metrics);
          measure("/metrics", "GET", 200, startedAt);
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        measure(url, "GET", 404, startedAt);
      } catch (error) {
        Logger.error(["Metrics server error", error as Error]);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("error");
        }
        measure(url, "GET", 500, startedAt);
      }
    },
  );

  server.listen(env.METRICS_PORT, () => {
    Logger.info(`Metrics server listening on port ${env.METRICS_PORT}`);
  });

  metricsServer = server;
  return server;
}

export function stopMetricsServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!metricsServer) return resolve();
    metricsServer.close(() => resolve());
    metricsServer = null;
  });
}