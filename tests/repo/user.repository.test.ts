import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;

function chainMock(provider: () => Row[]) {
  const chain: Record<string, unknown> = {};
  const resolve = () => Promise.resolve(provider());
  Object.assign(chain, {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    offset: () => chain,
    limit: () => chain,
    values: () => chain,
    set: () => chain,
    returning: () => chain,
    then: (onF: (v: Row[]) => unknown) => resolve().then(onF),
  });
  const db = {
    insert: () => chain,
    select: () => chain,
    update: () => chain,
  };
  return { db };
}

let userRepository: typeof import("../../src/repositories/user.repository.js").userRepository;

describe("userRepository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("findByTelegramId returns user or null", async () => {
    const user = { id: 1, telegramId: "1000" };
    const { db } = chainMock(() => [user]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.findByTelegramId("1000")).toEqual(user);
  });

  it("findByTelegramId returns null when not found", async () => {
    const { db } = chainMock(() => []);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.findByTelegramId("999")).toBeNull();
  });

  it("create inserts and returns the new user", async () => {
    const user = { id: 5, telegramId: "555" };
    const { db } = chainMock(() => [user]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.create({ telegramId: "555" } as never)).toEqual(user);
  });

  it("updatePhone returns updated user or null", async () => {
    const { db } = chainMock(() => [{ id: 1, phone: "+380501234567" }]);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.updatePhone("1", "+380501234567")).toEqual({
      id: 1,
      phone: "+380501234567",
    });
  });

  it("updatePhone returns null when user does not exist", async () => {
    const { db } = chainMock(() => []);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.updatePhone("x", "+380501234567")).toBeNull();
  });

  it("findAll returns all users", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const { db } = chainMock(() => rows);
    vi.doMock("../../src/config/database.js", () => ({ db, pool: {} }));
    userRepository = (await import("../../src/repositories/user.repository.js")).userRepository;
    expect(await userRepository.findAll()).toEqual(rows);
  });
});