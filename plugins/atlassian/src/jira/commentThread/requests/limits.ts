/** Comment list page size in all-pages mode. */
export const PAGE_SIZE = 100;

/** Hard stop for all-pages mode; a warning reports the cap. */
export const MAX_COMMENTS = 1000;

/** Root comments whose properties are fetched per read. */
export const MAX_PROPERTY_ROOTS = 50;

/** Property requests in flight at once. */
export const PROPERTY_CONCURRENCY = 4;

/** JQL page size for scan. */
export const SCAN_PAGE = 50;

/** Issues scanned when `max_issues` is absent. */
export const SCAN_DEFAULT = 100;

/** Hard cap for `max_issues`. */
export const SCAN_CAP = 500;
