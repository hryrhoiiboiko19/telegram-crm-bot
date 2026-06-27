import { describe, it, expect, vi } from "vitest";

const { translate } = vi.hoisted(() => {
  const translate = vi.fn().mockReturnValue("localized error");
  return { translate };
});

vi.mock("../../src/bot/middlewares/i18n.middleware.js", () => ({
  i18nMiddleware: { translate },
}));
vi.mock("../../src/bot/constants/index.js", () => ({
  availableLocales: ["en", "uk"],
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, warn: () => {}, error: () => {} },
}));
vi.mock("../../src/metrics/index.js", () => ({
  botErrorsTotal: { inc: vi.fn() },
}));

import { setupErrorBoundary } from "../../src/bot/middlewares/error.middleware.js";

function makeBot() {
  let catcher:
    | ((err: { error: Error; ctx: unknown }) => Promise<void>)
    | null = null;
  return {
    catch(fn: (err: { error: Error; ctx: unknown }) => Promise<void>) {
      catcher = fn;
    },
    _throw(error: Error, ctx: unknown) {
      return catcher!({ error, ctx });
    },
  } as never;
}

describe("error boundary", () => {
  it("replies with a localized message and records the error", async () => {
    const bot = makeBot();
    setupErrorBoundary(bot as never);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      from: { language_code: "uk" },
      reply,
    };
    await (bot as unknown as { _throw: (e: Error, c: unknown) => Promise<void> })._throw(
      new SyntaxError("boom"),
      ctx,
    );
    expect(translate).toHaveBeenCalledWith("uk", "internal_server_error");
    expect(reply).toHaveBeenCalledWith("localized error");
  });

  it("falls back to en when locale is unsupported", async () => {
    translate.mockReturnValue("err");
    const bot = makeBot();
    setupErrorBoundary(bot as never);
    const reply = vi.fn().mockResolvedValue(undefined);
    await (bot as unknown as { _throw: (e: Error, c: unknown) => Promise<void> })._throw(
      new Error("x"),
      { from: { language_code: "fr" }, reply },
    );
    expect(translate).toHaveBeenCalledWith("en", "internal_server_error");
  });

  it("does not throw when reply itself fails", async () => {
    const bot = makeBot();
    setupErrorBoundary(bot as never);
    const reply = vi.fn().mockRejectedValue(new Error("cannot send"));
    await expect(
      (bot as unknown as { _throw: (e: Error, c: unknown) => Promise<void> })._throw(
        new Error("x"),
        { from: {}, reply },
      ),
    ).resolves.toBeUndefined();
  });
});