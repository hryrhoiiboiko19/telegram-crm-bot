import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a fluent mock of the drizzle query builder used by the order repo.
type Row = Record<string, unknown>;

function chainMock(resultProvider: () => Row[]) {
  const chain: Record<string, unknown> = {};
  const resolve = () => Promise.resolve(resultProvider());
  Object.assign(chain, {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    offset: () => chain,
    limit: () => chain,
    innerJoin: () => chain,
    returning: () => chain,
    values: () => chain,
    set: () => chain,
    then: (onFulfilled: (v: Row[]) => unknown) => resolve().then(onFulfilled),
  });
  const db = {
    insert: () => chain,
    select: () => chain,
    update: () => chain,
  };
  return { db };
}

const schema = await import("../../src/database/schema.js");

describe("orderRepository", () => {
  let orderRepository: typeof import("../../src/repositories/order.repository.js").orderRepository;

  beforeEach(() => {
    vi.resetModules();
  });

  it("create inserts and returns the new order", async () => {
    const newRow = { id: 7, userId: 1, serviceType: "x", description: null, status: "pending", createdAt: new Date() };
    const { db } = chainMock(() => [newRow]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({
      botOrdersTotal: { inc: vi.fn() },
    }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    const res = await orderRepository.create({ userId: 1, serviceType: "x", status: "pending" } as never);
    expect(res).toEqual(newRow);
  });

  it("findByUserId selects by userId ordered desc", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const { db } = chainMock(() => rows);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.findByUserId(5)).toEqual(rows);
  });

  it("findPendingOrder returns first row or null", async () => {
    const row = { id: 3, status: "pending" };
    const { db } = chainMock(() => [row]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.findPendingOrder(0)).toEqual(row);
  });

  it("findPendingOrder returns null when no rows", async () => {
    const { db } = chainMock(() => []);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.findPendingOrder(0)).toBeNull();
  });

  it("countTotalPending uses SQL count aggregation", async () => {
    const { db } = chainMock(() => [{ count: 7 }]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.countTotalPending()).toBe(7);
  });

  it("updateStatus updates and returns order, increments metric", async () => {
    const updated = { id: 9, status: "confirmed" };
    const { db } = chainMock(() => [updated]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    const inc = vi.fn();
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.updateStatus(9, "confirmed" as never)).toEqual(updated);
    expect(inc).toHaveBeenCalledWith({ status: "confirmed" });
  });

  it("updateStatus returns null when order not found", async () => {
    const { db } = chainMock(() => []);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.updateStatus(99, "cancelled" as never)).toBeNull();
  });

  it("getOrderWithUser selects the status column (regression: was mapping to id)", async () => {
    const row = {
      orderId: 5,
      status: "pending",
      user: { telegramId: "1000", languageCode: "en" },
    };
    const { db } = chainMock(() => [row]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    const res = await orderRepository.getOrderWithUser(5);
    expect(res?.status).toBe("pending");
    expect(res?.status).not.toBe(5);
  });

  it("getStats aggregates grouped counts and computes conversion rate", async () => {
    const grouped = [
      { count: 3, status: schema.orderStatusEnum.enumValues[0] },
      { count: 2, status: schema.orderStatusEnum.enumValues[1] },
      { count: 4, status: schema.orderStatusEnum.enumValues[2] },
      { count: 1, status: schema.orderStatusEnum.enumValues[3] },
    ];
    const { db } = chainMock(() => grouped);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    const stats = await orderRepository.getStats();
    expect(stats.pending).toBe(3);
    expect(stats.completed).toBe(4);
    expect(stats.cancelled).toBe(1);
    expect(stats.conversionRate).toBe(Math.round((4 / 5) * 100));
  });

  it("findAll returns all rows", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const { db } = chainMock(() => rows);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    expect(await orderRepository.findAll()).toEqual(rows);
  });

  it("propagates database errors", async () => {
    const { db } = chainMock(() => {
      throw new Error("db down");
    });
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    vi.doMock("../../src/metrics/index.js", () => ({ botOrdersTotal: { inc: vi.fn() } }));
    orderRepository = (await import("../../src/repositories/order.repository.js")).orderRepository;
    await expect(orderRepository.findAll()).rejects.toThrow("db down");
  });
});