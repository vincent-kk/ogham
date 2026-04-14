export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export function createLogger(prefix: string): Logger {
  const format = (level: string, message: string, args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const extra = args.length > 0 ? ' ' + args.map(String).join(' ') : '';
    return `[${timestamp}] [${prefix}] ${level}: ${message}${extra}`;
  };

  return {
    info: (message, ...args) => process.stderr.write(format('INFO', message, args) + '\n'),
    warn: (message, ...args) => process.stderr.write(format('WARN', message, args) + '\n'),
    error: (message, ...args) => process.stderr.write(format('ERROR', message, args) + '\n'),
    debug: (message, ...args) => {
      if (process.env.DEBUG) {
        process.stderr.write(format('DEBUG', message, args) + '\n');
      }
    },
  };
}
