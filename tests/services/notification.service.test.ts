import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMessage, translate } = vi.hoisted(() => {
  const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
  const translate = vi
    .fn()
    .mockImplementation((_locale: string, key: string) => `t:${key}`);
  return { sendMessage, translate };
});

vi.mock("../../src/bot/bot.js", () => ({
  bot: { api: { sendMessage } },
}));
vi.mock("../../src/bot/middlewares/i18n.middleware.js", () => ({
  i18nMiddleware: { translate },
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    profile: () => () => {},
  },
}));

import { notificationService } from "../../src/services/notification.service.js";
import { botNotificationsTotal as _m } from "../../src/metrics/index.js";
void _m;

describe("NotificationService", () => {
  beforeEach(() => {
    sendMessage.mockClear();
    translate.mockClear();
  });

  it("builds the localized message and sends it via bot.api", async () => {
    await notificationService.sendStatusUpdate(123, 7, "en", "confirmed");
    expect(translate).toHaveBeenCalledWith(
      "en",
      "order_update_notification",
      { orderId: 7, status: "confirmed" },
    );
    expect(sendMessage).toHaveBeenCalledWith(123, "t:order_update_notification");
  });

  it("re-throws on API failure (so BullMQ retries)", async () => {
    sendMessage.mockRejectedValueOnce(new Error("flood"));
    await expect(
      notificationService.sendStatusUpdate(1, 1, "en", "cancelled"),
    ).rejects.toThrow("flood");
  });
});