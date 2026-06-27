import { describe, it, expect, vi, beforeEach } from "vitest";

const { orderRepoMock, userRepoMock } = vi.hoisted(() => {
  const orderRepoMock = {
    create: vi.fn().mockResolvedValue({ id: 9, userId: 1, status: "pending" }),
  };
  const userRepoMock = {
    findByTelegramId: vi
      .fn()
      .mockResolvedValue({ id: 1, telegramId: "7777", languageCode: "en" }),
    updatePhone: vi.fn().mockResolvedValue({ id: 1, phone: "+380501234567" }),
  };
  return { orderRepoMock, userRepoMock };
});

vi.mock("../../src/repositories/order.repository.js", () => ({
  orderRepository: orderRepoMock,
}));
vi.mock("../../src/repositories/user.repository.js", () => ({
  userRepository: userRepoMock,
}));

import { bot, withCapturedApi } from "../helpers/harness.ts";
import { makeMessageUpdate, makeCommandUpdate } from "../fixtures/updates.ts";

const CHAT = 7777;

function replies(text: string[]) {
  return text.join("\n");
}

describe("order conversation flow via handleUpdate", () => {
  let harness: ReturnType<typeof withCapturedApi>;

  beforeEach(() => {
    orderRepoMock.create.mockClear();
    userRepoMock.findByTelegramId.mockClear();
    userRepoMock.updatePhone.mockClear();
    harness = withCapturedApi();
    harness.clear();
  });

  it("completes a valid order with service, description and phone", async () => {
    // 1. /order enters the conversation
    await harness.send(makeCommandUpdate("order", { fromId: CHAT, chatId: CHAT }));
    // 2. valid service type
    await harness.send(
      makeMessageUpdate("plumbing", { fromId: CHAT, chatId: CHAT }),
    );
    // 3. valid description
    await harness.send(
      makeMessageUpdate("the kitchen sink is leaking badly", {
        fromId: CHAT,
        chatId: CHAT,
      }),
    );
    // 4. valid phone (as contact)
    await harness.send(
      makeMessageUpdate("", {
        fromId: CHAT,
        chatId: CHAT,
        contact: { phone_number: "+380501234567", user_id: CHAT },
      }),
    );

    expect(userRepoMock.updatePhone).toHaveBeenCalledWith(
      "7777",
      "+380501234567",
    );
    expect(orderRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: "plumbing",
        status: "pending",
      }),
    );
    // Conversation replies go via the per-update Api (intercepted by the fake
    // fetch), not via captureApi. Assert that replies were issued.
    const fetchCalls = (
      bot.api as unknown as { options: { fetch: { calls: number } } }
    ).options.fetch.calls;
    expect(fetchCalls).toBeGreaterThan(0);
  });

  it("retries on invalid service type then accepts a valid one", async () => {
    await harness.send(makeCommandUpdate("order", { fromId: 7778, chatId: 7778 }));
    // too short
    await harness.send(makeMessageUpdate("ab", { fromId: 7778, chatId: 7778 }));
    // valid
    await harness.send(
      makeMessageUpdate("cleaning service", { fromId: 7778, chatId: 7778 }),
    );
    // description
    await harness.send(
      makeMessageUpdate("need full apartment cleaning", {
        fromId: 7778,
        chatId: 7778,
      }),
    );
    // phone invalid
    await harness.send(
      makeMessageUpdate("123", { fromId: 7778, chatId: 7778 }),
    );
    // phone valid
    await harness.send(
      makeMessageUpdate("", {
        fromId: 7778,
        chatId: 7778,
        contact: { phone_number: "+380671234567", user_id: 7778 },
      }),
    );
    expect(orderRepoMock.create).toHaveBeenCalled();
    void replies;
  });
});