import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const { redisPing, poolQuery } = vi.hoisted(() => {
  const redisPing = vi.fn().mockResolvedValue("PONG");
  const poolQuery = vi.fn().mockResolvedValue({ rows: [] });
  return { redisPing, poolQuery };
});

vi.mock("../../src/config/redis.js", () => ({
  getRedis: () => ({ ping: redisPing }),
}));
vi.mock("../../src/config/database.js", () => ({
  pool: { query: poolQuery },
}));
vi.mock("../../src/config/env.js", () => ({
  env: { METRICS_PORT: 0 },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

import { startMetricsServer, stopMetricsServer } from "../../src/metrics/server.js";

let base: string;
let server: ReturnType<typeof startMetricsServer>;

beforeAll(async () => {
  server = startMetricsServer();
  await new Promise<void>((resolve) => {
    server.on("listening", () => {
      const addr = (server as { address(): { port: number } }).address();
      base = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await stopMetricsServer();
});

describe("metrics server", () => {
  it("GET /healthz returns ok=200 when Redis and Postgres are healthy", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(redisPing).toHaveBeenCalled();
    expect(poolQuery).toHaveBeenCalled();
  });

  it("GET /metrics returns Prometheus exposition", async () => {
    const res = await fetch(`${base}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/process_|nodejs_|crm_/);
  });

  it("GET /unknown returns 404", async () => {
    const res = await fetch(`${base}/unknown`);
    expect(res.status).toBe(404);
  });

  it("GET /healthz returns 500 when Redis is unhealthy", async () => {
    redisPing.mockRejectedValueOnce(new Error("down"));
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(500);
  });
});