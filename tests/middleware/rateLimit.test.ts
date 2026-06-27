import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimitMiddleware } from "../../src/bot/middlewares/rateLimit.middleware.js";

function fakeCtx(fromId: number | undefined, isCallback = false) {
  const reply = vi.fn().mockResolvedValue(undefined);
  const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
  const ctx = {
    from: fromId ? { id: fromId, language_code: "en" } : undefined,
    reply,
    callbackQuery: isCallback ? {} : undefined,
    answerCallbackQuery,
  };
  return ctx as never;
}

function makeRedis(scriptedCounts: number[]) {
  let i = 0;
  return {
    incr: vi.fn().mockImplementation(async () => scriptedCounts[i++] ?? 99),
    expire: vi.fn().mockResolvedValue(1),
  } as never;
}

describe("rateLimit middleware", () => {
  const next = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => next.mockClear());

  it("lets requests through when under the limit", async () => {
    const redis = makeRedis([1, 2, 3]);
    const mw = createRateLimitMiddleware(redis);
    for (let k = 0; k < 3; k++) await mw(fakeCtx(1), next);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("blocks requests over the limit and replies", async () => {
    const redis = makeRedis([31]);
    const mw = createRateLimitMiddleware(redis);
    const ctx = fakeCtx(2);
    await mw(ctx, next);
    expect(next).not.toHaveBeenCalled();
    const r = (ctx as unknown as { reply: ReturnType<typeof vi.fn> }).reply;
    expect(r).toHaveBeenCalled();
  });

  it("answers the callback query when blocking a callback update", async () => {
    const redis = makeRedis([31]);
    const mw = createRateLimitMiddleware(redis);
    const ctx = fakeCtx(3, true);
    await mw(ctx, next);
    expect(
      (ctx as unknown as { answerCallbackQuery: ReturnType<typeof vi.fn> })
        .answerCallbackQuery,
    ).toHaveBeenCalled();
  });

  it("skips when ctx.from is undefined (e.g. channel posts)", async () => {
    const redis = makeRedis([]);
    const mw = createRateLimitMiddleware(redis);
    await mw(fakeCtx(undefined), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("fails open (allows request) if Redis throws", async () => {
    const redis = {
      incr: vi.fn().mockRejectedValue(new Error("redis down")),
      expire: vi.fn(),
    } as never;
    const mw = createRateLimitMiddleware(redis);
    await mw(fakeCtx(4), next);
    expect(next).toHaveBeenCalledOnce();
  });
});