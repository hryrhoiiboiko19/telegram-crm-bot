import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/env.js", () => ({
  env: {
    REDIS: { host: "localhost", port: 6379, password: "" },
  },
}));

import type { NotificationJobData } from "../../src/queue/types.js";
import * as queueModule from "../../src/queue/notification.queue.js";

describe("notification queue.addNotificationJob", () => {
  beforeEach(() => {
    (queueModule.notificationQueue.add as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it("adds a job with retries and exponential backoff and returns true", async () => {
    const res = await queueModule.addNotificationJob({
      userTelegramId: 1,
      orderId: 2,
      userLocale: "en",
      newStatus: "confirmed",
    } as NotificationJobData);
    expect(res).toBe(true);
    const queue = queueModule.notificationQueue as unknown as {
      add: ReturnType<typeof vi.fn>;
    };
    expect(queue.add).toHaveBeenCalled();
    const [name, data, opts] = queue.add.mock.calls[0];
    expect(name).toBe("status_update_order_2");
    expect(data.orderId).toBe(2);
    expect(opts.attempts).toBe(3);
    expect(opts.backoff).toEqual({ type: "exponential", delay: 5000 });
    expect(opts.removeOnComplete).toBe(true);
  });

  it("returns false when the queue add throws", async () => {
    const queue = queueModule.notificationQueue as unknown as {
      add: ReturnType<typeof vi.fn>;
    };
    queue.add.mockRejectedValueOnce(new Error("redis down"));
    const res = await queueModule.addNotificationJob({
      userTelegramId: 1,
      orderId: 99,
      userLocale: "en",
      newStatus: "cancelled",
    } as NotificationJobData);
    expect(res).toBe(false);
  });
});