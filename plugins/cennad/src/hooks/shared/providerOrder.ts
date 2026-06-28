// Display order for cennad providers in injected context. Kept here so
// injectStatic and injectDynamic render lanes in one consistent order without
// importing src/types (the hook bundle forbids it).
export const PROVIDER_ORDER = ['codex', 'antigravity', 'claude'] as const;

export type HookProvider = (typeof PROVIDER_ORDER)[number];
