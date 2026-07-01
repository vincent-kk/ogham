import { settleAllResolvers } from "../../../core/sessionStore/index.js";
import { getHttpServer } from "../../httpServer/index.js";

let registered = false;

/**
 * On process termination, settle every pending long-poll and close the HTTP
 * server so neither the resolvers nor the listener outlive the MCP process. The
 * server is also unref'd + idle-closing, so this is a best-effort fast path.
 */
export function registerShutdown(): void {
  if (registered) return;
  registered = true;
  const shutdown = (): void => {
    settleAllResolvers();
    void getHttpServer()?.close();
  };
  process.once("exit", shutdown);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      shutdown();
      process.exit(0);
    });
}
