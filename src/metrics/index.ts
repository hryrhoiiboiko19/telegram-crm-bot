import { Counter, Histogram, collectDefaultMetrics, Registry } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

export const botCommandsTotal = new Counter({
  name: "crm_bot_commands_total",
  help: "Total bot commands received",
  labelNames: ["command"],
  registers: [metricsRegistry],
});

export const botCallbacksTotal = new Counter({
  name: "crm_bot_callbacks_total",
  help: "Total bot callback queries received",
  labelNames: ["action"],
  registers: [metricsRegistry],
});

export const botOrdersTotal = new Counter({
  name: "crm_bot_orders_total",
  help: "Total orders created, confirmed, or cancelled",
  labelNames: ["status"],
  registers: [metricsRegistry],
});

export const botNotificationsTotal = new Counter({
  name: "crm_bot_notifications_total",
  help: "Total notification jobs dispatched and their result",
  labelNames: ["result"],
  registers: [metricsRegistry],
});

export const botRateLimitRejectionsTotal = new Counter({
  name: "crm_bot_rate_limit_rejections_total",
  help: "Total requests rejected by the rate limiter",
  registers: [metricsRegistry],
});

export const botErrorsTotal = new Counter({
  name: "crm_bot_errors_total",
  help: "Total bot errors intercepted by the error boundary",
  labelNames: ["type"],
  registers: [metricsRegistry],
});

export const httpRequestsDurationSeconds = new Histogram({
  name: "crm_http_request_duration_seconds",
  help: "HTTP request duration for metrics and health endpoints",
  labelNames: ["route", "method", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const queueJobsTotal = new Counter({
  name: "crm_queue_jobs_total",
  help: "Total queue jobs processed",
  labelNames: ["queue", "state"],
  registers: [metricsRegistry],
});

export const queueJobsProcessedTotal = new Counter({
  name: "crm_queue_jobs_processed_total",
  help: "Total queue jobs processed with result",
  labelNames: ["queue", "result"],
  registers: [metricsRegistry],
});

export const queueJobDurationSeconds = new Histogram({
  name: "crm_queue_job_duration_seconds",
  help: "Queue job processing duration",
  labelNames: ["queue"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export { Counter, Histogram };