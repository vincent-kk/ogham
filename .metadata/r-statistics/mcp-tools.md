# r-statistics — MCP 도구

도메인 무지·stateless 실행 레이어. 4종. 등록은 `src/mcp/server/lifecycle/createServer.ts`에서 `server.registerTool(name, {description, inputSchema, annotations}, wrapHandler(handler))` (deilen 패턴).

| 도구                   | 핸들러                                           | 역할                                      |
| ---------------------- | ------------------------------------------------ | ----------------------------------------- |
| `run_r`                | `tools/runR/runR.ts`                             | 크로스플랫폼 Rscript 실행 + 아티팩트 수집 |
| `get_r_job`            | `tools/getRJob/getRJob.ts`                       | async 잡 상태·결과 폴링                   |
| `cancel_r_job`         | `tools/cancelRJob/cancelRJob.ts`                 | 잡 취소                                   |
| `assert_analysis_plan` | `tools/assertAnalysisPlan/assertAnalysisPlan.ts` | 통계 hard gate (결정론적)                 |

## `run_r`

LLM이 생성한 R 코드를 temp 격리 환경에서 `Rscript` subprocess로 실행. 임베딩(Rserve) 아님.

```ts
interface RunRInput {
  scriptCode: string; // R 코드 (temp .R 파일로 기록 후 spawn)
  dataRefs?: RDataRef[]; // 입력 데이터 (MCP가 resolve; LLM이 경로 생성 X)
  workspaceId?: string; // 세션 격리 (옵션)
  sessionMode?: "stateless" | "workspace_files"; // 기본 stateless(실행마다 초기화). workspace_files=workspaceId 필수, data/·artifacts/ 호출 간 영속
  executionMode?: "sync" | "async"; // 기본 async
  timeoutMs?: number;
}
interface RDataRef {
  id: string;
  format: "csv" | "parquet" | "feather" | "rds" | "json";
  encoding?: "UTF-8" | "CP949" | "EUC-KR";
  sha256?: string;
}

interface RunROutput {
  jobId: string;
  status: RJobStatus;
  result?: RExecutionResult;
}
type RJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "timeout"
  | "cancelled"; // → enums.ts
interface RExecutionResult {
  exitCode: number | null;
  stdout: { text: string; truncated: boolean; encodingUsed: string };
  stderr: { text: string; truncated: boolean; encodingUsed: string };
  artifacts: RArtifact[];
  manifest?: RArtifactManifest; // ARTIFACTS_DIR/manifest.json 파싱
  runtime: {
    rscriptPath: string;
    rVersion?: string;
    platform: "windows" | "macos" | "linux";
  };
  error?: { code: RErrorCode; message: string; retryable: boolean };
}
type RErrorCode =
  | "R_NOT_FOUND"
  | "PROCESS_FAILED"
  | "TIMEOUT"
  | "ARTIFACT_POLICY_FAILED"
  | "OUTPUT_DECODE_FAILED"
  | "COMMAND_BLOCKED";
interface RArtifact {
  id: string;
  kind:
    | "plot"
    | "table"
    | "model"
    | "assumption_check"
    | "report"
    | "data"
    | "log";
  path: string;
  mimeType: string;
  sha256: string;
}
```

### 실행 계약 (wrapper)

MCP가 user code를 래퍼로 감쌈 (`shared/contract.R` 골격 주입):

- `options(encoding="UTF-8")`, locale 강제, `set.seed(seed)`
- `ARTIFACTS_DIR` env 전달 → 산출물은 여기에만
- `manifest.json` 기록 헬퍼 (`add_artifact`, `write_json_artifact`, `save_plot_artifact`)
- 종료 시 `sessionInfo()` 기록

### 크로스플랫폼 (core/rRuntime)

- **Rscript 탐색**: config → env → PATH → 공통 경로 → **Windows 레지스트리 `HKLM\SOFTWARE\R-core\R`**. 실패 시 `R_NOT_FOUND` → `r-setup` 스킬 안내.
- **spawn**: `child_process.spawn(rscriptPath, ["--vanilla", scriptPath], { shell: false })` — 셸 미경유(이스케이프/인젝션 회피).
- **인코딩**: 스크립트 UTF-8 기록 + CRLF→LF. 출력 디코딩 **UTF-8 우선 → CP949 fallback**(한글 Windows).

### 보안 (실행 안전만; 통계 정책 아님)

정적 차단: `system`/`system2`/`shell`/`pipe`/`install.packages`/`setwd`/`unlink`. 네트워크 차단. `ARTIFACTS_DIR` 외 쓰기 거부. 경로 traversal·symlink 탈출 거부. 패키지는 사전구축 화이트리스트(renv lockfile).

## `get_r_job` / `cancel_r_job`

```ts
interface GetRJobInput {
  jobId: string;
  includeStdout?: boolean;
}
interface GetRJobOutput {
  jobId: string;
  status: RJobStatus;
  result?: RExecutionResult;
}
interface CancelRJobInput {
  jobId: string;
}
interface CancelRJobOutput {
  jobId: string;
  status: "cancelled" | "already_finished" | "not_found";
}
```

## `assert_analysis_plan`

통계 hard gate. 정규화 필드로 결정론적 검증(자연어 아님). 룰셋 [assert-rules.md](./assert-rules.md).

```ts
interface AssertInput {
  method: {
    technique: string;
    family:
      | "parametric"
      | "nonparametric"
      | "regression"
      | "survival"
      | "categorical"
      | "correlation";
    paired?: boolean;
  };
  datasetMeta: {
    outcomeType:
      | "continuous"
      | "binary"
      | "categorical"
      | "count"
      | "time_to_event";
    groupCount?: number;
    sampleSize?: number;
  };
  assumptionArtifacts?: {
    assumptionId: AssumptionId;
    artifactPath: string;
    passed: boolean;
  }[]; // assumption-check 산출
  mode: "interactive" | "auto";
}
interface AssertOutput {
  allowed: boolean;
  severity: "ok" | "soft_warning" | "hard_block";
  reasons: { code: string; severity: "hard" | "soft"; message: string }[];
  recommendedAlternatives?: string[]; // 예: ["mann_whitney","welch_t_test"]
}
```

- `hard_block` → `allowed:false` (interactive·auto 모두 차단 → statistician 재선택)
- `soft_warning` → interactive: `allowed:true`+경고(대화) / auto: `allowed:false`(엄격 재선택)

## 도구 annotations

| 도구                 | readOnly | destructive | idempotent |
| -------------------- | :------: | :---------: | :--------: |
| run_r                |  false   |    false    |   false    |
| get_r_job            |   true   |    false    |    true    |
| cancel_r_job         |  false   |    false    |    true    |
| assert_analysis_plan |   true   |    false    |    true    |
