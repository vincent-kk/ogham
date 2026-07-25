export function serializeError(error: unknown): string {
  if (error instanceof Error)
    return `${error.message}${error.stack ? `\n${error.stack}` : ""}`;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
