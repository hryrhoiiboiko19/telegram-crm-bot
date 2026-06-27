import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fakeFetch = vi.fn();
const originalGlobalFetch = globalThis.fetch;

beforeEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as never;
});
afterEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = originalGlobalFetch;
});

vi.mock("../../src/config/env.js", () => ({
  env: { GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.com/webhook" },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    profile: () => () => {},
  },
}));

import { googleSheetsService } from "../../src/services/google-sheets.service.js";

const orders = [
  {
    id: 1,
    userId: 10,
    serviceType: "plumbing",
    description: "leak",
    status: "pending",
    createdAt: new Date(),
  },
] as never;

describe("GoogleSheetsService", () => {
  it("POSTs formatted rows and returns true on success", async () => {
    fakeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    expect(await googleSheetsService.exportOrders(orders)).toBe(true);
    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe("https://sheets.example.com/webhook");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.data).toEqual([["1", "10", "plumbing", "leak", "pending"]]);
  });

  it("returns false when webhook responds non-ok", async () => {
    fakeFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await googleSheetsService.exportOrders(orders)).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    fakeFetch.mockRejectedValueOnce(new Error("network"));
    expect(await googleSheetsService.exportOrders(orders)).toBe(false);
  });

  it("uses N/A for missing description", async () => {
    fakeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await googleSheetsService.exportOrders([
      { id: 2, userId: 3, serviceType: "cleaning", description: null, status: "pending" } as never,
    ]);
    const body = JSON.parse((fakeFetch.mock.calls.at(-1)![1] as RequestInit).body as string);
    expect(body.data[0]).toEqual(["2", "3", "cleaning", "N/A", "pending"]);
  });
});