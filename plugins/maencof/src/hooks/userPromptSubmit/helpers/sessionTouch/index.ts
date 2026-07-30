// Entry point for the sessionTouch helper. The userPromptSubmit hook bundle
// imports `sessionTouch.ts` directly rather than through this barrel, so esbuild
// never pulls the re-export graph into the hook bundle.
export { runSessionTouch } from './sessionTouch.js';
export type { SessionTouchInput, SessionTouchResult } from './sessionTouch.js';
