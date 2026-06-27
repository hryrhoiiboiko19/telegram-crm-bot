import { bot } from "../../src/bot/bot.js";
import { captureApi, type RecordedApiCall } from "../fixtures/updates.ts";

export { bot };

// grammY's conversation plugin builds a fresh `Api` from `bot.api.options`.
// Set a fake `fetch` on that options object so conversation-replayed API calls
// are short-circuited with a fake successful response.
const fakeApiFetch: typeof fetch = async (input: RequestInfo | URL) => {
  const urlStr = typeof input === "string" ? input : input.toString();
  const method = urlStr.split("/").pop() ?? "unknown";
  const result =
    method === "getMe"
      ? { id: 1, is_bot: true, first_name: "TestBot" }
      : { message_id: 1, date: 0, chat: { id: 0, type: "private" } };
  fakeApiFetch.calls++;
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true, result }),
  } as unknown as Response;
};
(fakeApiFetch as unknown as { calls: number }).calls = 0;
// grammY builds a per-update `Api` from `bot.clientConfig` (used by both
// `bot.api` and the per-update context api, which the conversation plugin
// clones). Injecting a fake `fetch` here intercepts every outgoing API call,
// including those replayed inside conversations.
(bot as unknown as { clientConfig: { fetch?: typeof fetch } }).clientConfig = {
  fetch: fakeApiFetch,
};
(bot.api as unknown as { options: { fetch: typeof fetch } }).options = {
  fetch: fakeApiFetch,
};

let initialized = false;

export function withCapturedApi() {
  const captured = captureApi(bot);
  return {
    calls: captured.calls,
    clear: captured.clear,
    async send(update: Parameters<typeof bot.handleUpdate>[0]) {
      if (!initialized) {
        await bot.init();
        initialized = true;
      }
      await bot.handleUpdate(update);
      return captured.calls;
    },
  };
}

export function apiCall(
  calls: RecordedApiCall[],
  method: string,
): Record<string, unknown> | undefined {
  return calls.find((c) => c.method === method)?.payload;
}

export function allApiCalls(
  calls: RecordedApiCall[],
  method: string,
): Record<string, unknown>[] {
  return calls.filter((c) => c.method === method).map((c) => c.payload);
}