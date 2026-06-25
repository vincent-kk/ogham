export { httpRequest, validateUrl } from "./httpClient/index.js";
export { resolveDb, buildBaseUrl } from "./sourceResolver/index.js";
export {
  loadConfig,
  saveConfig,
  loadCredentials,
  saveCredentials,
  resolveRateLimit,
} from "./config/index.js";
export type { ResolvedRateLimit } from "./config/index.js";
export { mergeRecords, dedupKey, normalizeTitle, tagHitBy } from "./union/index.js";
export { bucketByDate, probeCount, planSegments } from "./segmenter/index.js";
export type {
  DateBucket,
  CountFn,
  CountRange,
  SegmentPlanOptions,
} from "./segmenter/index.js";
export { lintQuery, checkParens, checkFieldTags } from "./queryLint/index.js";
export { shouldRespell, runEspell } from "./espell/index.js";
export type { ShouldRespellParams, EspellFn } from "./espell/index.js";
export {
  createJob,
  getJob,
  updateJob,
  pollResults,
} from "./searchJob/index.js";
export type {
  CreateJobOptions,
  JobPathOptions,
  UpdateJobOptions,
  PollOptions,
  PollResult,
} from "./searchJob/index.js";
