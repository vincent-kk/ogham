import { FAILURE_CHAIN_THRESHOLD } from './failureChain.js';

/** Remedy shown when a runnable gate omitted its success matcher. */
export const NO_EXPECT_HINT =
  'a runnable gate needs an EXPECT that only success prints';

/** Reason shown when a host delivered no output text to judge. */
export const NO_OUTPUT_REASON = 'no output';

/** Follow-up attached to proof written by an agent invocation. */
export const AGENT_MET_HINT = 'driver re-run clears the marker';

/** Workflow owner reminder for one open task ledger. */
export const LEDGER_OWNER_ONE = '`/seiri:execute` owns it.';

/** Workflow owner reminder for multiple open task ledgers. */
export const LEDGER_OWNER_MANY = '`/seiri:execute` owns them.';

/** Failure-chain ownership hint appended at the configured threshold. */
export const CHAIN_HINT = `${FAILURE_CHAIN_THRESHOLD}rd consecutive; \`/seiri:trace-cause\` owns it`;
