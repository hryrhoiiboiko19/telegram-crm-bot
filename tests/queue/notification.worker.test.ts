import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendStatusUpdate } = vi.hoisted(() => {
  const sendStatusUpdate = vi.fn().mockResolvedValue(undefined);
  return { sendStatusUpdate };
});

vi.mock("../../src/services/notification.service.js", () => ({
  notificationService: { sendStatusUpdate },
}));
vi.mock("../../src/config/env.js", () => ({
  env: { REDIS: { host: "localhost", port: 6379, password: "" } },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, warn: () => {}, error: () => {} },
}));

import { startNotificationWorker } from "../../src/queue/notification.worker.js";

import type { NotificationJobData } from "../../src/queue/types.js";

describe("notification worker", () => {
  beforeEach(() => {
    sendStatusUpdate.mockClear();
    sendStatusUpdate.mockResolvedValue(undefined);
  });

  it("processes a job by calling notificationService.sendStatusUpdate", async () => {
    const worker = startNotificationWorker() as unknown as {
      __processor: (job: unknown) => Promise<unknown>;
    };
    expect(worker.__processor).toBeDefined();
    const fakeJob = {
      id: "j1",
      data: {
        userTelegramId: 1,
        orderId: 2,
        userLocale: "en",
        newStatus: "confirmed",
      } as NotificationJobData,
    };
    await worker.__processor(fakeJob);
    expect(sendStatusUpdate).toHaveBeenCalledWith(1, 2, "en", "confirmed");
  });

  it("propagates errors so BullMQ schedules a retry", async () => {
    sendStatusUpdate.mockRejectedValueOnce(new Error("boom"));
    const worker = startNotificationWorker() as unknown as {
      __processor: (job: unknown) => Promise<unknown>;
    };
    await expect(
      worker.__processor({
        id: "j2",
        data: { userTelegramId: 1, orderId: 3, userLocale: "en", newStatus: "cancelled" },
      }),
    ).rejects.toThrow("boom");
  });

  it("emits completed and failed worker events without throwing", () => {
    const worker = startNotificationWorker() as unknown as {
      emit: (event: string, ...args: unknown[]) => void;
    };
    expect(() => worker.emit("completed", { id: "ok" })).not.toThrow();
    expect(() =>
      worker.emit("failed", { id: "bad" }, new Error("worker failed")),
    ).not.toThrow();
  });
});