import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock repositories so handlers don't touch a real database.
const {
  orderRepoMock,
  userRepoMock,
  addJobMock,
  exportOrdersMock,
} = vi.hoisted(() => {
  const orderRepoMock = {
    create: vi.fn().mockResolvedValue({ id: 5, userId: 1, serviceType: "x", description: null, status: "pending", createdAt: new Date() }),
    findByUserId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([
      { id: 1, userId: 1, serviceType: "plumbing", description: "leak", status: "pending", createdAt: new Date("2024-01-01") },
    ]),
    findPendingOrder: vi.fn().mockResolvedValue(null),
    countTotalPending: vi.fn().mockResolvedValue(0),
    updateStatus: vi.fn().mockResolvedValue({ id: 1, status: "confirmed" }),
    getOrderWithUser: vi.fn().mockResolvedValue({
      orderId: 1,
      status: "pending",
      user: { telegramId: "1000", languageCode: "en" },
    }),
    getStats: vi.fn().mockResolvedValue({
      pending: 1, confirmed: 2, completed: 3, cancelled: 4,
      conversionRate: 43, mostPopularService: "plumbing",
    }),
  };
  const userRepoMock = {
    findByTelegramId: vi.fn().mockImplementation(async (id: string) =>
      id === "1000" ? { id: 1, telegramId: "1000", languageCode: "en" } : null,
    ),
    create: vi.fn().mockResolvedValue({ id: 1, telegramId: "1000", languageCode: "en" }),
    updatePhone: vi.fn().mockResolvedValue({ id: 1 }),
    findAll: vi.fn().mockResolvedValue([{ id: 1, telegramId: "1000" }, { id: 2, telegramId: "2000" }]),
  };
  const addJobMock = vi.fn().mockResolvedValue(true);
  const exportOrdersMock = vi.fn().mockResolvedValue(true);
  return { orderRepoMock, userRepoMock, addJobMock, exportOrdersMock };
});

vi.mock("../../src/repositories/order.repository.js", () => ({
  orderRepository: orderRepoMock,
}));
vi.mock("../../src/repositories/user.repository.js", () => ({
  userRepository: userRepoMock,
}));
vi.mock("../../src/queue/notification.queue.js", () => ({
  notificationQueue: {},
  addNotificationJob: addJobMock,
}));
vi.mock("../../src/services/google-sheets.service.js", () => ({
  googleSheetsService: { exportOrders: exportOrdersMock },
  GoogleSheetsService: class {},
}));

import { withCapturedApi, apiCall, allApiCalls } from "../helpers/harness.ts";
import {
  makeCommandUpdate,
  makeCallbackUpdate,
  makeMessageUpdate,
} from "../fixtures/updates.ts";

const ADMIN_ID = 111;

function resetMocks() {
  orderRepoMock.create.mockClear();
  orderRepoMock.findAll.mockClear();
  orderRepoMock.findPendingOrder.mockClear();
  orderRepoMock.countTotalPending.mockClear();
  orderRepoMock.updateStatus.mockClear();
  orderRepoMock.getOrderWithUser.mockClear();
  orderRepoMock.getStats.mockClear();
  userRepoMock.findByTelegramId.mockClear();
  userRepoMock.create.mockClear();
  userRepoMock.updatePhone.mockClear();
  userRepoMock.findAll.mockClear();
  addJobMock.mockClear();
  exportOrdersMock.mockClear();
}

describe("bot integration via handleUpdate", () => {
  let harness: ReturnType<typeof withCapturedApi>;

  beforeEach(() => {
    resetMocks();
    harness = withCapturedApi();
    harness.clear();
  });

  it("/start registers a new user and replies with start message", async () => {
    userRepoMock.findByTelegramId.mockResolvedValueOnce(null);
    const update = makeCommandUpdate("start", { fromId: 500 });
    await harness.send(update);
    expect(userRepoMock.create).toHaveBeenCalledOnce();
    const sendMessage = apiCall(harness.calls, "sendMessage");
    expect(sendMessage?.text).toBeDefined();
  });

  it("/start for existing user does not create a new row", async () => {
    userRepoMock.findByTelegramId.mockResolvedValueOnce({ id: 7, telegramId: "500", languageCode: "en" });
    const update = makeCommandUpdate("start", { fromId: 500 });
    await harness.send(update);
    expect(userRepoMock.create).not.toHaveBeenCalled();
  });

  it("non-admin /admin is rejected with admin_access_denied and no admin actions", async () => {
    const update = makeCommandUpdate("admin", { fromId: 999 });
    await harness.send(update);
    const sendMessages = allApiCalls(harness.calls, "sendMessage");
    const denied = sendMessages.find((p) => typeof p.text === "string" && /denied|access/i.test(String(p.text)));
    expect(denied).toBeDefined();
    // No inline keyboard (admin panel) was sent with this API call
    expect(JSON.stringify(denied?.reply_markup ?? "")).not.toMatch(/admin_view_orders/);
  });

  it("admin /admin opens panel with export and view-orders buttons", async () => {
    const update = makeCommandUpdate("admin", { fromId: ADMIN_ID });
    await harness.send(update);
    const sendMessage = apiCall(harness.calls, "sendMessage");
    const markup = JSON.stringify(sendMessage?.reply_markup ?? {});
    expect(markup).toMatch(/admin_export_sheets/);
    expect(markup).toMatch(/admin_view_orders/);
  });

  it("/stats returns analytics report for admin", async () => {
    const update = makeCommandUpdate("stats", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.getStats).toHaveBeenCalledOnce();
    const sendMessage = apiCall(harness.calls, "sendMessage");
    expect(String(sendMessage?.text ?? "")).toMatch(/pending|confirmed/i);
  });

  it("/broadcast without message replies with missing-message prompt", async () => {
    const update = makeCommandUpdate("broadcast", { fromId: ADMIN_ID });
    await harness.send(update);
    const sendMessage = apiCall(harness.calls, "sendMessage");
    expect(String(sendMessage?.text ?? "")).toMatch(/broadcast/i);
  });

  it("/broadcast with message sends to all users", async () => {
    const update = makeCommandUpdate("broadcast", { fromId: ADMIN_ID, args: "hello all" });
    await harness.send(update);
    // 2 users mocked → 2 sendMessage calls to user ids + initial ack messages
    const sends = allApiCalls(harness.calls, "sendMessage");
    expect(userRepoMock.findAll).toHaveBeenCalledOnce();
    expect(sends.length).toBeGreaterThanOrEqual(2);
  });

  it("unknown text message replies unknown_command", async () => {
    const update = makeMessageUpdate("hello?", { fromId: 5 });
    await harness.send(update);
    const sendMessage = apiCall(harness.calls, "sendMessage");
    expect(String(sendMessage?.text ?? "")).toMatch(/unknown/i);
  });

  it("non-admin callback admin_view_orders is rejected", async () => {
    const update = makeCallbackUpdate("admin_view_orders", { fromId: 999 });
    await harness.send(update);
    // No editMessageText and no findPendingOrder call
    expect(orderRepoMock.findPendingOrder).not.toHaveBeenCalled();
    expect(apiCall(harness.calls, "editMessageText")).toBeUndefined();
  });

  it("admin callback admin_view_orders shows pending order or no-pending message", async () => {
    orderRepoMock.findPendingOrder.mockResolvedValueOnce({
      id: 7, userId: 1, serviceType: "plumbing", description: "leak", status: "pending", createdAt: new Date("2024-01-01"),
    });
    orderRepoMock.countTotalPending.mockResolvedValueOnce(1);
    const update = makeCallbackUpdate("admin_view_orders", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.countTotalPending).toHaveBeenCalled();
    const edited = apiCall(harness.calls, "editMessageText");
    const replied = apiCall(harness.calls, "sendMessage");
    expect(edited ?? replied).toBeDefined();
  });

  it("admin callback admin_confirm_order_7 updates status and enqueues notification", async () => {
    orderRepoMock.countTotalPending.mockResolvedValue(0);
    orderRepoMock.updateStatus.mockResolvedValueOnce({ id: 7, status: "confirmed" });
    orderRepoMock.getOrderWithUser.mockResolvedValueOnce({
      orderId: 7, status: "pending", user: { telegramId: "500", languageCode: "en" },
    });
    const update = makeCallbackUpdate("admin_confirm_order_7", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.updateStatus).toHaveBeenCalledWith(7, "confirmed");
    expect(addJobMock).toHaveBeenCalledWith(expect.objectContaining({ orderId: 7, newStatus: "confirmed" }));
  });

  it("admin callback admin_cancel_order_7 updates status and enqueues notification", async () => {
    orderRepoMock.countTotalPending.mockResolvedValue(0);
    orderRepoMock.updateStatus.mockResolvedValueOnce({ id: 7, status: "cancelled" });
    orderRepoMock.getOrderWithUser.mockResolvedValueOnce({
      orderId: 7, status: "pending", user: { telegramId: "500", languageCode: "en" },
    });
    const update = makeCallbackUpdate("admin_cancel_order_7", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.updateStatus).toHaveBeenCalledWith(7, "cancelled");
  });

  it("admin callback admin_export_sheets exports orders", async () => {
    exportOrdersMock.mockResolvedValueOnce(true);
    const update = makeCallbackUpdate("admin_export_sheets", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.findAll).toHaveBeenCalledOnce();
    expect(exportOrdersMock).toHaveBeenCalledOnce();
  });

  it("admin callback pagination offset calls findPendingOrder with that offset", async () => {
    orderRepoMock.countTotalPending.mockResolvedValueOnce(3);
    orderRepoMock.findPendingOrder.mockResolvedValueOnce(null);
    const update = makeCallbackUpdate("admin_order_pagination_offset_2", { fromId: ADMIN_ID });
    await harness.send(update);
    expect(orderRepoMock.findPendingOrder).toHaveBeenCalledWith(2);
  });
});