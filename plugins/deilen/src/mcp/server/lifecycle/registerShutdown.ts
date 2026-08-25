import { settleAllResolvers } from "../../../core/sessionStore/index.js";
import { getHttpServer } from "../../httpServer/index.js";

let registered = false;
let exiting = false;

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const;

const shutdown = (): void => {
  settleAllResolvers();
  void getHttpServer()?.close();
};

const exitAfterShutdown = (): void => {
  if (exiting) return;
  exiting = true;
  shutdown();
  process.exit(0);
};

/**
 * Register one cleanup path for process termination and stdin EOF. The SDK
 * transport does not surface EOF as `onclose`, so the framework-owned default
 * is `process.stdin`; `input` lets tests inject a stream.
 *
 * @param input The readable stream whose EOF ends the MCP process.
 * @returns Nothing.
 */
export function registerShutdown(
  input: NodeJS.ReadableStream = process.stdin,
): void {
  if (registered) return;
  registered = true;
  process.once("exit", shutdown);
  for (const signal of SHUTDOWN_SIGNALS)
    process.once(signal, exitAfterShutdown);
  input.once("end", exitAfterShutdown);
  input.once("close", exitAfterShutdown);
}
