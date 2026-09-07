# ECMAScript Review Rules

Apply each item as a falsifiable question about added or modified JavaScript or TypeScript behavior.

- **ES-1 — Floating promise**: Can a changed promise-producing call reject without being awaited, returned, explicitly detached, or otherwise handled?
- **ES-2 — Async callback loss**: Can an exception from a changed async callback escape the callback API's completion or error channel?
- **ES-3 — Equality and NaN**: Can changed `==`/`===` semantics or a direct NaN comparison select the wrong branch for a reachable value?
- **ES-4 — Default sort**: Can a changed `Array.prototype.sort()` call use lexicographic comparison where numeric or domain ordering is required?
- **ES-5 — Optional-chain assertion**: Can a changed non-null assertion after optional chaining erase a reachable nullish result and fail later?
- **ES-6 — Contract cast**: Can changed `any` usage or an `as` cast bypass a contract that external or runtime data can violate?
- **ES-7 — Circular initialization**: Can a changed circular import read an export before its module initialization has completed?
- **ES-8 — ESM/CJS default**: Can changed ESM/CommonJS interoperation select the module namespace instead of the intended default value, or the reverse?
- **ES-9 — Array for-in**: Can a changed `for...in` over an array enumerate inherited or non-index keys or treat indexes as the wrong type?
- **ES-10 — Object key order**: Does changed behavior depend on object-key enumeration order where the required order is not guaranteed by the data contract?
- **ES-11 — Date and timezone**: Can a changed date parse, format, arithmetic, or boundary calculation produce a different result across timezones or daylight-saving transitions?
- **ES-12 — Regex backtracking**: Can attacker-controlled or unbounded input make a changed regular expression take catastrophic backtracking time?
- **ES-13 — JSON validation**: Can a changed `JSON.parse` result reach typed or privileged logic without runtime shape validation?
- **ES-14 — Environment validation**: Can a missing, empty, or malformed `process.env` value reach changed behavior without validation?
- **ES-15 — Resource cleanup**: Can a changed success, failure, abort, or early-return path leave an `AbortController`, stream, or timer active?
- **ES-16 — Filesystem path**: Can changed Node `fs` path construction escape its intended root through absolute input, traversal, or normalization?
- **ES-17 — Child-process arguments**: Can untrusted input alter the executable, argument boundaries, or shell syntax of a changed `child_process` call?
