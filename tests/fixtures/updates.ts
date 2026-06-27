import type { Bot } from "grammy";

export interface FakeMessage {
  message_id: number;
  date: number;
  chat: { id: number; type: string; first_name?: string };
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    language_code?: string;
    username?: string;
  };
  text?: string;
  entities?: { offset: number; length: number; type: string }[];
  contact?: { phone_number: string; user_id?: number };
}

let updateCounter = 1;

function nextId(): number {
  const id = updateCounter;
  updateCounter++;
  return id;
}

function makeFrom(opts: {
  fromId?: number;
  languageCode?: string;
  username?: string;
  firstName?: string;
}) {
  return {
    id: opts.fromId ?? 1000,
    is_bot: false,
    first_name: opts.firstName ?? "Tester",
    language_code: opts.languageCode ?? "en",
    username: opts.username ?? "tester",
  };
}

export function makeMessageUpdate(
  text: string,
  opts: {
    fromId?: number;
    chatId?: number;
    languageCode?: string;
    username?: string;
    firstName?: string;
    contact?: { phone_number: string; user_id?: number };
    entities?: { offset: number; length: number; type: string }[];
  } = {},
) {
  const fromId = opts.fromId ?? 1000;
  const chatId = opts.chatId ?? fromId;
  const message: FakeMessage = {
    message_id: nextId(),
    date: Math.floor(Date.now() / 1000),
    chat: { id: chatId, type: "private", first_name: opts.firstName ?? "Tester" },
    from: makeFrom(opts),
    text: opts.contact ? undefined : text,
    contact: opts.contact,
    entities: opts.entities,
  };
  return { update_id: nextId() + 10000, message };
}

export function makeCommandUpdate(
  command: string,
  opts: {
    fromId?: number;
    chatId?: number;
    languageCode?: string;
    username?: string;
    firstName?: string;
    args?: string;
  } = {},
) {
  const text = `/${command}${opts.args ? ` ${opts.args}` : ""}`;
  const cmdLen = command.length + 1; // include leading slash
  return makeMessageUpdate(text, {
    ...opts,
    entities: [{ offset: 0, length: cmdLen, type: "bot_command" }],
  });
}

export function makeCallbackUpdate(
  callbackData: string,
  opts: {
    fromId?: number;
    chatId?: number;
    languageCode?: string;
    username?: string;
    messageId?: number;
    firstName?: string;
  } = {},
) {
  const fromId = opts.fromId ?? 1000;
  const chatId = opts.chatId ?? fromId;
  return {
    update_id: nextId() + 10000,
    callback_query: {
      id: `cb${nextId()}`,
      from: makeFrom(opts),
      message: {
        message_id: opts.messageId ?? 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: "private" },
        text: "admin",
      },
      chat_instance: "-1",
      data: callbackData,
    },
  };
}

export type RecordedApiCall = {
  method: string;
  payload: Record<string, unknown>;
};

/**
 * Installs a transformer on the given bot which records every outgoing API
 * call and short-circuits it with a fake success response. Returns the list of
 * recorded calls and a function to clear them.
 */
export function captureApi(bot: Bot): {
  calls: RecordedApiCall[];
  clear: () => void;
} {
  const calls: RecordedApiCall[] = [];
  bot.api.config.use((prev, method, payload, _signal) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve(
      method === "getMe"
        ? { ok: true, result: { id: 1, is_bot: true, first_name: "TestBot" } }
        : {
            ok: true,
            result: { message_id: 1, date: 0, chat: { id: 0, type: "private" } },
          },
    ) as never;
  });
  return { calls, clear: () => calls.splice(0, calls.length) };
}