// Ambient declaration for `markdown-it-task-lists`, which ships no types and
// has no `@types/markdown-it-task-lists` package on npm. Without this shim a
// strict `tsc -p tsconfig.json` (node16 resolution) fails with TS7016 at
// body-cache.ts's `import taskLists from 'markdown-it-task-lists'`. Ships
// verbatim in templates so `npm run build` passes.
//
// `@types/markdown-it` uses `export =`, so we take the default import (the
// project sets esModuleInterop) and reach PluginWithOptions via its namespace —
// a named `import { PluginWithOptions }` would not resolve against `export =`.
declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';

  const taskLists: MarkdownIt.PluginWithOptions<{
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }>;
  export default taskLists;
}
