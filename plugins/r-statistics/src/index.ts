// 배포 진입점은 esbuild 가 만드는 `bridge/mcp-server.cjs`(원본 `mcp/serverEntry/`)다.
// 이 배럴은 버전 상수와 공개 타입만 노출한다 — `mcp/` 를 재노출하면
// src → mcp → server → src 의존 순환이 생긴다(`server/lifecycle/createServer.ts` 가 `version.ts` 를 참조).
export { VERSION } from "./version.js";
export {
  ArtifactKind,
  AssertSeverity,
  AssumptionId,
  CancelStatus,
  DataFormat,
  Encoding,
  ExecutionMode,
  HardRuleCode,
  Intent,
  JobStatus,
  MethodFamily,
  OutcomeType,
  PipelineState,
  Platform,
  RErrorCode,
  RunMode,
  SessionMode,
  Severity,
} from "./types/index.js";
export type {
  AssertDatasetMeta,
  AssertInput,
  AssertMethod,
  AssertOutput,
  AssertReason,
  AssumptionArtifact,
  DecodedStream,
  ManifestEntry,
  MethodAssumption,
  MethodMeta,
  RArtifact,
  RArtifactManifest,
  RDataRef,
  RExecutionError,
  RExecutionResult,
  RunRInput,
  RunROutput,
} from "./types/index.js";
