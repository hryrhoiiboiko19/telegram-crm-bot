import { Worker } from "bullmq";
import {
  queueJobsTotal,
  queueJobsProcessedTotal,
  queueJobDurationSeconds,
} from "./index.js";
import { NOTIFICATION_QUEUE_NAME } from "../queue/types.js";
import { getRedis } from "../config/redis.js";

let pollTimer: NodeJS.Timeout | null = null;

function recordJobCounts(): void {
  const redis = getRedis();
  const key = `bull:${NOTIFICATION_QUEUE_NAME}`;
  // BullMQ stores job counts in Redis under the queue name; we estimate via
  // standard BullMQ list lengths without instantiating a Queue here.
  void Promise.all([
    redis.llen(`${key}:wait`),
    redis.llen(`${key}:active`),
    redis.llen(`${key}:delayed`),
    redis.llen(`${key}:completed`),
    redis.llen(`${key}:failed`),
  ])
    .then(([waiting, active, delayed, completed, failed]) => {
      queueJobsTotal.reset();
      queueJobsTotal.inc(
        { queue: NOTIFICATION_QUEUE_NAME, state: "waiting" },
        waiting,
      );
      queueJobsTotal.inc(
        { queue: NOTIFICATION_QUEUE_NAME, state: "active" },
        active,
      );
      queueJobsTotal.inc(
        { queue: NOTIFICATION_QUEUE_NAME, state: "delayed" },
        delayed,
      );
      queueJobsTotal.inc(
        { queue: NOTIFICATION_QUEUE_NAME, state: "completed" },
        completed,
      );
      queueJobsTotal.inc(
        { queue: NOTIFICATION_QUEUE_NAME, state: "failed" },
        failed,
      );
    })
    .catch(() => {
      // ignore poll errors
    });
}

export function startQueueMetricsPoller(intervalMs = 15000): void {
  if (pollTimer) return;
  recordJobCounts();
  pollTimer = setInterval(recordJobCounts, intervalMs);
}

export function stopQueueMetricsPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function instrumentWorker(worker: Worker): void {
  worker.on("completed", (job) => {
    const duration = job.finishedOn && job.processedOn
      ? (job.finishedOn - job.processedOn) / 1000
      : 0;
    queueJobsProcessedTotal.inc(
      { queue: NOTIFICATION_QUEUE_NAME, result: "completed" },
    );
    if (duration > 0) {
      queueJobDurationSeconds.observe(
        { queue: NOTIFICATION_QUEUE_NAME },
        duration,
      );
    }
  });
  worker.on("failed", () => {
    queueJobsProcessedTotal.inc(
      { queue: NOTIFICATION_QUEUE_NAME, result: "failed" },
    );
  });
}