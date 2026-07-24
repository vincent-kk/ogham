import { RequestTooLargeError } from "./parseBody.js";

/**
 * Map a `parseBody` rejection to the status and message a local server answers
 * with. The response envelope stays with the caller (`{success}` / `{ok}`) —
 * this owns only the status/message pair so the servers cannot drift apart.
 */
export function describeBodyError(err: unknown): {
  status: number;
  message: string;
} {
  if (err instanceof RequestTooLargeError)
    return { status: 413, message: err.message };
  if (err instanceof SyntaxError)
    return { status: 400, message: `Invalid JSON body: ${err.message}` };
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Internal server error",
  };
}
