type Level = "debug" | "info" | "warn" | "error";

const PREFIX = "[dalen]";

function shouldLog(level: Level): boolean {
  if (level === "debug") return Boolean(process.env.DALEN_DEBUG);
  return true;
}

function format(level: Level, message: string, meta?: unknown): string {
  if (meta === undefined) return `${PREFIX} [${level}] ${message}`;
  return `${PREFIX} [${level}] ${message} ${JSON.stringify(meta)}`;
}

function emit(level: Level, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  process.stderr.write(`${format(level, message, meta)}\n`);
}

export const logger = {
  debug: (message: string, meta?: unknown): void =>
    emit("debug", message, meta),
  info: (message: string, meta?: unknown): void => emit("info", message, meta),
  warn: (message: string, meta?: unknown): void => emit("warn", message, meta),
  error: (message: string, meta?: unknown): void =>
    emit("error", message, meta),
};
