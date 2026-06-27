import { vi, beforeAll } from "vitest";

// Provide test environment defaults before any module imports run.
process.env.BOT_TOKEN = "123456:TEST";
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/crm_db";
process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://example.com/webhook";
process.env.ADMIN_IDS = "111,222";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "";
process.env.PORT = "3000";
process.env.METRICS_PORT = "9100";
process.env.WEBHOOK_SECRET = "secret";
process.env.NODE_ENV = "test";

// ---------------------------------------------------------------------------
// Mock ioredis: in-memory stub.
// ---------------------------------------------------------------------------
class FakeRedis {
  private store = new Map<string, string>();
  public incrCalls = 0;
  public listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  async incr(key: string): Promise<number> {
    this.incrCalls++;
    const next = Number(this.store.get(key) ?? "0") + 1;
    this.store.set(key, String(next));
    return next;
  }
  async expire(key: string, seconds: number): Promise<number> {
    void seconds;
    void key;
    return 1;
  }
  async ping(): Promise<string> {
    return "PONG";
  }
  async quit(): Promise<string> {
    return "OK";
  }
  async llen(key: string): Promise<number> {
    return Number(this.store.get(`len:${key}`) ?? "0");
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    return "OK";
  }
  on(event: string, fn: (...args: unknown[]) => void): this {
    (this.listeners[event] ??= []).push(fn);
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    (this.listeners[event] ?? []).forEach((fn) => fn(...args));
  }
  // helpers used by tests
  _setIncr(key: string, value: number): void {
    this.store.set(key, String(value));
  }
  _reset(): void {
    this.store.clear();
    this.incrCalls = 0;
  }
}

const fakeRedisStore = new FakeRedis();

vi.mock("ioredis", () => {
  return {
    Redis: class FakeRedisExport {
      constructor() {
        return fakeRedisStore;
      }
    },
  };
});

// ---------------------------------------------------------------------------
// Mock node-fetch (used by grammY's API client and by the webhook server).
// Returns a fake successful Telegram-style response. The real method name is
// encoded as the last path segment of the request URL.
// ---------------------------------------------------------------------------
const fakeNodeFetch = vi.fn().mockImplementation((url: string | URL) => {
  const urlStr = typeof url === "string" ? url : url.toString();
  const method = urlStr.split("/").pop() ?? "unknown";
  const result =
    method === "getMe"
      ? { id: 1, is_bot: true, first_name: "TestBot" }
      : { message_id: 1, date: 0, chat: { id: 0, type: "private" } };
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true, result }),
  });
});
vi.mock("node-fetch", () => ({ default: fakeNodeFetch }));
(globalThis as unknown as { __fakeNodeFetch: typeof fakeNodeFetch }).__fakeNodeFetch =
  fakeNodeFetch;

// Expose for tests
(globalThis as unknown as { __fakeRedis: FakeRedis }).__fakeRedis =
  fakeRedisStore;

// ---------------------------------------------------------------------------
// Mock @grammyjs/storage-redis: in-memory session storage.
// ---------------------------------------------------------------------------
vi.mock("@grammyjs/storage-redis", () => {
  class InMemoryAdapter {
    private store = new Map<string, unknown>();
    async read(key: string): Promise<unknown | undefined> {
      return this.store.get(key);
    }
    async write(key: string, value: unknown): Promise<void> {
      this.store.set(key, value);
    }
    async delete(key: string): Promise<void> {
      this.store.delete(key);
    }
  }
  return { RedisAdapter: InMemoryAdapter };
});

// ---------------------------------------------------------------------------
// Mock pg Pool so importing config/database.ts doesn't open a real DB.
// ---------------------------------------------------------------------------
const fakePool = {
  on(): void {},
  async query(): Promise<{ rows: unknown[] }> {
    return { rows: [] };
  },
  async end(): Promise<void> {},
};
vi.mock("pg", () => {
  return {
    Pool: class FakePool {
      on(): void {}
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [] };
      }
      async end(): Promise<void> {}
    },
  };
});
(globalThis as unknown as { __fakePool: typeof fakePool }).__fakePool = fakePool;

// ---------------------------------------------------------------------------
// Mock bullmq Queue and Worker so importing notification.queue.ts / worker
// doesn't open Redis connections.
// ---------------------------------------------------------------------------
const queueAdd = vi.fn().mockResolvedValue({ id: "job-1" });
const fakeQueue: { add: typeof queueAdd; getJobCounts: () => Promise<unknown> } =
  {
    add: queueAdd,
    getJobCounts: vi.fn().mockResolvedValue({}),
  };
let workerProcessor: ((job: unknown) => Promise<unknown>) | null = null;

vi.mock("bullmq", () => {
  return {
    Queue: class FakeQueue {
      add = queueAdd;
      getJobCounts = fakeQueue.getJobCounts;
    },
    Worker: class FakeWorker {
      __handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
      __processor: ((job: unknown) => Promise<unknown>) | null = null;
on(event: string, fn: (...args: unknown[]) => void): this {
        (this.__handlers[event] ??= []).push(fn);
        return this;
      }
      async close(): Promise<void> {}
      emit(event: string, ...args: unknown[]): void {
        (this.__handlers[event] ?? []).forEach((fn) => fn(...args));
      }
      constructor(
        _name: string,
        processor: (job: unknown) => Promise<unknown>,
      ) {
        this.__processor = processor;
        workerProcessor = processor;
      }
    },
  };
});

(globalThis as unknown as { __workerProcessor: () => typeof workerProcessor }).__workerProcessor_get = () => workerProcessor;
(globalThis as unknown as { __queueAdd: typeof queueAdd }).__queueAdd = queueAdd;
(globalThis as unknown as { __fakeQueue: typeof fakeQueue }).__fakeQueue =
  fakeQueue;

beforeAll(() => {
  // ensure vitest is loaded noop
});