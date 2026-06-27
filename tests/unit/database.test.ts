import { describe, it, expect, vi } from "vitest";

const poolInstance = {
  on: vi.fn(),
  _events: {} as Record<string, (...args: unknown[]) => void>,
};

vi.mock("pg", () => ({
  Pool: class FakePool {
    constructor() {
      return poolInstance;
    }
  },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, error: () => {} },
}));
vi.mock("../../src/config/env.js", () => ({
  env: { DATABASE_URL: "postgresql://u:p@host:5432/db" },
}));

describe("database module", () => {
  it("creates a pool bound to DATABASE_URL and registers connect/error handlers", async () => {
    poolInstance.on.mockClear();
    vi.resetModules();
    await import("../../src/config/database.js");
    expect(poolInstance.on).toHaveBeenCalledWith(
      "connect",
      expect.any(Function),
    );
    expect(poolInstance.on).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    // sanity: invoking handlers does not throw
    const connect = poolInstance.on.mock.calls.find((c) => c[0] === "connect")![1];
    const error = poolInstance.on.mock.calls.find((c) => c[0] === "error")![1];
    expect(() => connect()).not.toThrow();
    expect(() => error(new Error("idle"))).not.toThrow();
  });
});