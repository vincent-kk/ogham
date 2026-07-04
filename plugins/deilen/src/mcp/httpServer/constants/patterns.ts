/** Session ids as issued by `randomId` — URL-safe alphanumerics, `_`, `-`. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Quoted `__DEILEN_STATE__` placeholder inside a built HTML template. */
export const DEILEN_STATE_PLACEHOLDER_PATTERN = /["']__DEILEN_STATE__["']/;
