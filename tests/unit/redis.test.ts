import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, error: () => {} },
}));
vi.mock("ioredis", () => {
  const Redis = vi.fn(function () {
    return {
      quit: vi.fn().mockResolvedValue("OK"),
      on: vi.fn(),
      _isFake: true,
    };
  });
  return { Redis };
});
vi.mock("../../src/config/env.js", () => ({
  env: { REDIS: { host: "localhost", port: 6379, password: "" } },
}));

import { getRedis, closeRedis, resetRedisForTesting } from "../../src/config/redis.js";
import { Redis as MockRedis } from "ioredis";

describe("redis singleton", () => {
  beforeEach(() => {
    (MockRedis as unknown as { mockClear: () => void }).mockClear();
    resetRedisForTesting();
  });

  it("returns the same instance on subsequent getRedis calls", () => {
    const a = getRedis();
    const b = getRedis();
    expect(a).toBe(b);
    expect(MockRedis).toHaveBeenCalledOnce();
  });

  it("closeRedis quits the connection and resets the singleton", async () => {
    const a = getRedis();
    await closeRedis();
    expect((a as unknown as { quit: ReturnType<typeof vi.fn> }).quit).toHaveBeenCalled();
    const b = getRedis();
    expect(b).not.toBe(a);
  });
});