import { cancelAllJobs } from "../../../core/index.js";

let registered = false;

/**
 * On process termination, abort every in-flight R job so no Rscript child
 * outlives the MCP process. Registered once across exit / SIGINT / SIGTERM.
 */
export function registerShutdown(): void {
  if (registered) return;
  registered = true;
  process.once("exit", cancelAllJobs);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      cancelAllJobs();
      process.exit(0);
    });
}
