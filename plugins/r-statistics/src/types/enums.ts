// Single source of truth for r-statistics' domain string-constant value sets.
// Pure `as const` objects with no zod/node imports; server schemas build on
// these via z.nativeEnum. Inline string literals are forbidden elsewhere — every
// value set lives here.

/** Async R job lifecycle status (run_r / get_r_job / cancel_r_job). */
export const JobStatus = {
  Queued: "queued",
  Running: "running",
  Succeeded: "succeeded",
  Failed: "failed",
  Timeout: "timeout",
  Cancelled: "cancelled",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Execution-safety error codes surfaced by run_r (not statistical policy). */
export const RErrorCode = {
  RNotFound: "R_NOT_FOUND",
  ProcessFailed: "PROCESS_FAILED",
  Timeout: "TIMEOUT",
  ArtifactPolicyFailed: "ARTIFACT_POLICY_FAILED",
  OutputDecodeFailed: "OUTPUT_DECODE_FAILED",
  CommandBlocked: "COMMAND_BLOCKED",
} as const;
export type RErrorCode = (typeof RErrorCode)[keyof typeof RErrorCode];

/** Rule severity inside meta.yaml / the assert ruleset. */
export const Severity = {
  Hard: "hard",
  Soft: "soft",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

/** assert_analysis_plan verdict severity. */
export const AssertSeverity = {
  Ok: "ok",
  SoftWarning: "soft_warning",
  HardBlock: "hard_block",
} as const;
export type AssertSeverity =
  (typeof AssertSeverity)[keyof typeof AssertSeverity];

/** Dispatcher execution mode (analyze skill flag). */
export const ExecutionMode = {
  Interactive: "interactive",
  Auto: "auto",
} as const;
export type ExecutionMode = (typeof ExecutionMode)[keyof typeof ExecutionMode];

/** run_r sync (await) vs async (poll) execution. */
export const RunMode = {
  Sync: "sync",
  Async: "async",
} as const;
export type RunMode = (typeof RunMode)[keyof typeof RunMode];

/** Intent classification (analyze Dispatcher CLASSIFY state). */
export const Intent = {
  FullAnalysis: "full-analysis",
  PartialStep: "partial-step",
  Troubleshoot: "troubleshoot",
  MethodologyQuery: "methodology-query",
  NeedsClarification: "needs-clarification",
} as const;
export type Intent = (typeof Intent)[keyof typeof Intent];

/** Dispatcher pipeline state machine states. */
export const PipelineState = {
  Intake: "INTAKE",
  Classify: "CLASSIFY",
  StatisticianPlan: "STATISTICIAN_PLAN",
  AssertPlan: "ASSERT_PLAN",
  RExecution: "R_EXECUTION",
  Validation: "VALIDATION",
  Reporting: "REPORTING",
  Complete: "COMPLETE",
  Failed: "FAILED",
  BlockedNeedsUser: "BLOCKED_NEEDS_USER",
} as const;
export type PipelineState = (typeof PipelineState)[keyof typeof PipelineState];

/** Collected artifact kind (manifest.json + run_r output). */
export const ArtifactKind = {
  Plot: "plot",
  Table: "table",
  Model: "model",
  AssumptionCheck: "assumption_check",
  Report: "report",
  Data: "data",
  Log: "log",
} as const;
export type ArtifactKind = (typeof ArtifactKind)[keyof typeof ArtifactKind];

/** Statistical method family. */
export const MethodFamily = {
  Parametric: "parametric",
  Nonparametric: "nonparametric",
  Regression: "regression",
  Survival: "survival",
  Categorical: "categorical",
  Correlation: "correlation",
} as const;
export type MethodFamily = (typeof MethodFamily)[keyof typeof MethodFamily];

/** Outcome (dependent variable) type for method ↔ outcome matching. */
export const OutcomeType = {
  Continuous: "continuous",
  Binary: "binary",
  Categorical: "categorical",
  Count: "count",
  TimeToEvent: "time_to_event",
} as const;
export type OutcomeType = (typeof OutcomeType)[keyof typeof OutcomeType];

/** Statistical assumption identifiers (assumption-check ↔ assert linkage). */
export const AssumptionId = {
  Normality: "normality",
  Homogeneity: "homogeneity",
  NormalityOfDiff: "normality_of_diff",
  ResidualNormality: "residual_normality",
  Independence: "independence",
  Linearity: "linearity",
  Homoscedasticity: "homoscedasticity",
  NoMulticollinearity: "no_multicollinearity",
  LogitLinearity: "logit_linearity",
  EpvGe10: "epv_ge_10",
  MeanEqualsVariance: "mean_equals_variance",
  ProportionalHazards: "proportional_hazards",
  Loglinearity: "loglinearity",
  ExpectedCountGe5: "expected_count_ge_5",
} as const;
export type AssumptionId = (typeof AssumptionId)[keyof typeof AssumptionId];

/** Deterministic hard-block rule codes (always block in interactive + auto). */
export const HardRuleCode = {
  OutcomeMethodMismatch: "OUTCOME_METHOD_MISMATCH",
  SampleTooSmall: "SAMPLE_TOO_SMALL",
  ExpectedCountLow: "EXPECTED_COUNT_LOW",
  MissingRequiredInput: "MISSING_REQUIRED_INPUT",
} as const;
export type HardRuleCode = (typeof HardRuleCode)[keyof typeof HardRuleCode];

/** Supported input data formats (RDataRef). */
export const DataFormat = {
  Csv: "csv",
  Parquet: "parquet",
  Feather: "feather",
  Rds: "rds",
  Json: "json",
} as const;
export type DataFormat = (typeof DataFormat)[keyof typeof DataFormat];

/** Character encodings for input data / output decoding. */
export const Encoding = {
  Utf8: "UTF-8",
  Cp949: "CP949",
  EucKr: "EUC-KR",
} as const;
export type Encoding = (typeof Encoding)[keyof typeof Encoding];

/** Host platform. */
export const Platform = {
  Windows: "windows",
  Macos: "macos",
  Linux: "linux",
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

/** cancel_r_job outcome. */
export const CancelStatus = {
  Cancelled: "cancelled",
  AlreadyFinished: "already_finished",
  NotFound: "not_found",
} as const;
export type CancelStatus = (typeof CancelStatus)[keyof typeof CancelStatus];
