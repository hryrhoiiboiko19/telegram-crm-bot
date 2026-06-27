import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const { botHandleUpdate } = vi.hoisted(() => {
  const botHandleUpdate = vi.fn().mockResolvedValue(undefined);
  return { botHandleUpdate };
});

vi.mock("../../src/bot/bot.js", () => ({
  bot: { handleUpdate: botHandleUpdate },
}));
vi.mock("../../src/config/env.js", () => ({
  env: { WEBHOOK_SECRET: "topsecret", PORT: 0 },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

import { startWebhookServer } from "../../src/webhook.js";

let base: string;
let server: ReturnType<typeof startWebhookServer>;

beforeAll(async () => {
  server = startWebhookServer();
  await new Promise<void>((resolve) => {
    server.on("listening", () => {
      const addr = (server as { address(): { port: number } }).address();
      base = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("webhook server", () => {
  it("forwards a POST to /<WEBHOOK_SECRET> to bot.handleUpdate", async () => {
    const update = { update_id: 1, message: { text: "hi", chat: { id: 1 } } };
    const res = await fetch(`${base}/topsecret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(botHandleUpdate).toHaveBeenCalledTimes(1);
    expect(botHandleUpdate.mock.calls[0][0]).toEqual(update);
  });

  it("returns 404 for other paths", async () => {
    const res = await fetch(`${base}/wrongpath`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await fetch(`${base}/topsecret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });
});