import { FAILURE_CHAIN_THRESHOLD } from './failureChain.js';

/** Remedy shown when failed-command stdout cannot be observed. */
export const UNOBSERVABLE_HINT =
  'stdout is not visible after a non-zero exit; make the CHECK exit 0 (append || true) or EXPECT against stderr';

/** Follow-up attached to proof written by an agent invocation. */
export const AGENT_MET_HINT = 'driver re-run clears the marker';

/** Workflow owner reminder for one open task ledger. */
export const LEDGER_OWNER_ONE = '`/seiri:execute` owns it.';

/** Workflow owner reminder for multiple open task ledgers. */
export const LEDGER_OWNER_MANY = '`/seiri:execute` owns them.';

/** Failure-chain ownership hint appended at the configured threshold. */
export const CHAIN_HINT = `${FAILURE_CHAIN_THRESHOLD}rd consecutive; \`/seiri:trace-cause\` owns it`;
