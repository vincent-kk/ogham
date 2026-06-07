/**
 * Route-segment directory name patterns per framework. Next.js App Router
 * uses directory names — route groups `(app)`, dynamic `[id]`, catch-all
 * `[...slug]`, optional catch-all `[[...slug]]`, parallel slots `@modal`,
 * intercepting routes `(.)photo`, and private folders `_components` — that
 * match no general casing convention. The `naming-convention` rule exempts
 * these names when a framework is detected.
 */
export const FRAMEWORK_ROUTE_NAME_PATTERNS: Record<string, RegExp[]> = {
  next: [
    /^\([^)]+\)$/, // route group: (app)
    /^\[[^[\].]+]$/, // dynamic segment: [id]
    /^\[\.\.\.[^[\]]+]$/, // catch-all: [...slug]
    /^\[\[\.\.\.[^[\]]+]]$/, // optional catch-all: [[...slug]]
    /^@[a-zA-Z][\w-]*$/, // parallel route slot: @modal
    /^\(\.{1,3}\)/, // intercepting route: (.)photo
    /^_[a-zA-Z]/, // private folder: _components
  ],
};
