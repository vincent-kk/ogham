import type { LifecycleEvent } from '../types/lifecycle.js';

/** Lifecycle dispatcher 가 허용하는 hook event 이름 셋. */
export const VALID_LIFECYCLE_EVENTS: ReadonlySet<LifecycleEvent> =
  new Set<LifecycleEvent>([
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'SessionEnd',
  ]);
