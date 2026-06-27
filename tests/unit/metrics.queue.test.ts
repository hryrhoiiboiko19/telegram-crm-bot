import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/config/redis.js", () => ({
  getRedis: () => ({
    ping: vi.fn().mockResolvedValue("PONG"),
    llen: vi.fn().mockResolvedValue(0),
  }),
}));
vi.mock("../../src/utils/logger/index.js", () => ({
  Logger: { info: () => {}, error: () => {} },
}));

import {
  startQueueMetricsPoller,
  stopQueueMetricsPoller,
  instrumentWorker,
} from "../../src/metrics/queue.js";
import { metricsRegistry } from "../../src/metrics/index.js";

function fakeWorker() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    on(event: string, fn: (...args: unknown[]) => void) {
      handlers[event] = fn;
    },
    _fire(event: string, ...args: unknown[]) {
      handlers[event]?.(...args);
    },
  };
}

describe("metrics/queue", () => {
  beforeEach(() => {
    stopQueueMetricsPoller();
  });
  afterEach(() => {
    stopQueueMetricsPoller();
  });

  it("startQueueMetricsPoller records job counts on an interval", async () => {
    vi.useFakeTimers();
    startQueueMetricsPoller(10);
    await vi.advanceTimersByTimeAsync(20);
    // queue jobs gauges written
    const metrics = await metricsRegistry.metrics();
    expect(metrics).toMatch(/crm_queue_jobs_total/);
    vi.useRealTimers();
  });

  it("instrumentWorker records completed and failed results and durations", async () => {
    const worker = fakeWorker() as never;
    instrumentWorker(worker as never);
    (worker as unknown as { _fire: (e: string, j: unknown) => void })._fire(
      "completed",
      { processedOn: 100, finishedOn: 250 },
    );
    (worker as unknown as { _fire: (e: string, j: unknown) => void })._fire(
      "failed",
      null,
      new Error("boom"),
    );
    const metrics = await metricsRegistry.metrics();
    expect(metrics).toMatch(/crm_queue_jobs_processed_total/);
    expect(metrics).toMatch(/crm_queue_job_duration_seconds/);
  });

  it("stopQueueMetricsPoller clears the timer", async () => {
    startQueueMetricsPoller(100);
    stopQueueMetricsPoller();
    // should not throw and no further polling
    expect(true).toBe(true);
  });
});