export type LoggerMsg = string | Error | (string | Error)[];

const formatMsg = (msg: LoggerMsg): string[] =>
  Array.isArray(msg)
    ? msg.map((m) => (m instanceof Error ? m.message : m))
    : [msg instanceof Error ? msg.message : msg];

export interface ILogger {
  info: (msg: LoggerMsg) => void;
  warn: (msg: LoggerMsg) => void;
  error: (msg: LoggerMsg) => void;
  profile: (label: string) => () => void;
}

export const Logger: ILogger = {
  info: loggerInfo,
  warn: loggerWarn,
  error: loggerError,
  profile: loggerProfile,
};

function loggerInfo(msg: LoggerMsg): void {
  console.log("INFO:", ...formatMsg(msg));
}

function loggerWarn(msg: LoggerMsg): void {
  console.warn("WARN:", ...formatMsg(msg));
}

function loggerError(msg: LoggerMsg): void {
  console.error("ERROR:", ...formatMsg(msg));
}

function loggerProfile(label: string): () => void {
  const startedAt = Date.now();

  return () => {
    const elapsedMs = Date.now() - startedAt;
    loggerInfo([`${label} took ${elapsedMs}ms`]);
  };
}