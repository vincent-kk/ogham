# Spec — Responsibilities & Data Flow

## 컴포넌트 책임

| 컴포넌트                                 | 역할                                                                       | 위치                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Hooks                                    | MCP 상태 → Claude 컨텍스트 주입 (read-only 어댑터)                         | `hooks/`                             |
| Claude                                   | provider 선택 및 위임 여부 판단 (판단 주체)                                | —                                    |
| Skill `codex` / `gemini` / `antigravity` | Claude 결정 → MCP 도구 호출 매핑                                           | `skills/{codex,gemini,antigravity}/` |
| Skill `crosscheck`                       | codex + antigravity 병렬 호출 + 응답 합성                                  | `skills/crosscheck/`                 |
| Skill `setup`                            | `open_settings` 호출 → 브라우저 안내                                       | `skills/setup/`                      |
| MCP Server `tools`                       | provider 디스패치, config/counter/session 보유                             | `src/mcp/`                           |
| Provider Dispatcher                      | `codex-cli`, `gemini-cli`, `agy` 자식 프로세스 실행 + JSON envelope 정규화 | `src/dispatcher/`                    |
| External CLI                             | 실제 LLM 호출                                                              | 시스템 PATH                          |
| Web UI                                   | 사용자 설정 편집                                                           | `src/mcp/pages/settings/`            |

## 디스패치 흐름

1. SessionStart 훅: 정적 정책 1회 주입.
2. UserPromptSubmit 훅: 동적 상태 매 턴 주입.
3. Claude 가 정책 + 작업 성격을 종합해 provider 결정.
4. `/codex`, `/gemini`, 또는 `/antigravity` 스킬 호출.
5. 스킬이 MCP `start_conversation` 또는 `continue_conversation` 호출.
6. MCP 가 provider별 dispatcher 로 위임.
7. Dispatcher 가 외부 CLI 자식 프로세스 실행, stdout/JSONL 파싱.
8. 정규화된 `ConversationResponse` 반환. 카운터 +1 (성공/실패 무관).
9. Claude 는 응답의 `session_id` 만으로 이어가기 판단 (직전 응답에 명시).

## 정책 모델

### Ratio (비율)

- 세 정수 (codex / gemini / antigravity). 분모는 합.
- 호출 분배 의도. 강제 아님.
- 카운터 기준: 시도 수 (성공/실패 무관).
- 스코프: 동일 부모 PID 동안 누적. 부모 PID 변경 감지 시 리셋.
- gemini 와 antigravity 는 상호 배타적 Google 엔진 — 동시 활성화 불가.

### Intervention strength (개입 강도)

- `-2 | -1 | 0 | +1 | +2`.
- 메커니즘: 매 턴 훅의 가이드 문구 톤만 조절. 강제 라우팅 없음.

### Keywords (키워드 매핑)

- provider별 자유 문자열 (codex / gemini / antigravity).
- 훅이 템플릿에 join 하여 주입. Claude 판단 참고용.

### Options (확장 자리)

- `start_conversation` 의 `options` 객체 — `multi_agent` 등 provider별 지원 옵션.
- v1 화이트리스트는 비어 있다 (모든 옵션 ignored). 각 dispatcher 가 `supportedOptions` 집합으로 관리하며, 미지원 키는 `meta.ignored_options[]` 로 보고.

### option_flags (provider별 플래그)

- `gemini`: `yolo`, `sandbox` (boolean), `sandbox_backend` (auto/docker/podman/sandbox-exec)
- `codex`: `yolo` (boolean), `sandbox` (read-only/workspace-write/danger-full-access/off)
- `antigravity`: `sandbox` (boolean — terminal-only 모드), `skip_permissions` (boolean — `--dangerously-skip-permissions`)

### preamble (프리앰블)

- provider별 자유 문자열 (codex / gemini / antigravity).
- 각 provider 의 프롬프트 앞에 prepend.

### recency_factor (최신성 주입)

- provider별 (codex / gemini / antigravity): `off | auto | strict`.
- `auto`: 쿼리에 날짜 힌트 자동 삽입. `strict`: 강한 최신성 요구 문구 추가.

## Provider 디스패치 정책

- 호출 실패 시 자동 provider 전환 없음. `error` 필드로 Claude 에 반환.
- 카운터는 실패도 포함.
- 예산/캡은 MCP 가 추적하지 않음 (외부 CLI 실패로 인지).
- `session_id` 는 실패 시에도 발급.

## Google 엔진 상호 배타성

gemini 와 antigravity 는 동일 Google 계정 기반 엔진으로 상호 배타적이다. Gemini CLI 서비스는 2026-06-18 에 종료되며, cogair 는 antigravity (`agy` CLI) 로 전환한다.

- `ConfigSchema` superRefine: 두 엔진이 동시 활성화이면 Zod validation error.
- `configManager.normalizeMutualExclusion`: 레거시 파일 로드 시 antigravity 우선으로 자동 보정.
- 훅의 `activeGoogleEngine()`: antigravity.enabled 가 참이면 antigravity 반환, 그 다음 gemini 확인. 결과가 null 이면 Google 엔진 비활성.

## Antigravity Dispatcher

`agy` CLI 어댑터. `src/dispatcher/antigravity/`.

### CLI 호출 규약

- 기본 플래그: `agy -p <prompt> --output-format json`
- 옵션 플래그: `--sandbox` (terminal-only), `--dangerously-skip-permissions`
- resume: `agy --continue -p <prompt> --output-format json [flags]`
- 모델 지정: `-m <model>` (model_map 에서 tier 해석, `auto` 이면 생략)

### 세션 격리 (cwd)

- `agy` 는 headless conversation-id 를 발급하지 않는다 (Issue #7).
- 세션마다 격리된 cwd (`~/.claude/plugins/cogair/runtime/agy/<sessionId>/`) 를 생성.
- `externalSessionRef = cwd` — 이 경로가 cogair 세션과 agy 대화 이력의 단일 핸들.
- resume 은 동일 sessionId → 동일 cwd 의 `--continue` 로 구현.
- start() 타임아웃 시 cwd 삭제. resume() 타임아웃 시 cwd 보존 (대화 이력 유지).

### stdout 처리 (Issue #76)

agy 가 non-TTY 환경에서 stdout 을 무음 drop 하는 버그:

1. `parseJsonOutput(stdout)`: JSON object → 응답 키 탐색 (`response`, `output`, `text`, `message`, `result`); 순수 JSON 문자열이면 직접 반환; non-JSON 이면 trimmed text 반환; empty → `null`.
2. `parseJsonOutput` 이 null 이면 `resolveTranscript(cwd, since)` 시도 (transcript fallback).
3. transcript 도 null 이면 `cli_error` 반환.

### 모델 해석

- `resolveAntigravityModel(alias, map)`: config `model_map.antigravity` (high/mid/low) 에서 구체 모델명 해석.
- `auto` 또는 map 없음 → `-m` 생략, agy 기본값 사용.
- 모델명 하드코딩 없음 — 전적으로 config 에 위임.

## model_map.antigravity

config 의 `model_map.antigravity` 는 tier → concrete model name 매핑이다.

```json
{
  "model_map": {
    "antigravity": {
      "high": "<agy-model-full-name>",
      "mid": "<agy-model-full-name>",
      "low": "<agy-model-full-name>"
    }
  }
}
```

codex / gemini 는 환경변수 기반 modelAlias 해석을 유지하며 `model_map` 에 등장하지 않는다.

## core/agyModels — Antigravity 모델 캐시

`agy models` 출력을 파싱·캐싱해 사용 가능한 모델 풀네임 목록을 제공한다.

- 캐시 파일: `runtime/agy-models.json` (`{ models, fetched_at }`), TTL 1시간.
- TTL 초과 → `agy models` 재실행 → 실패 시 stale 캐시 → stale 없으면 빈 배열.
- 어떤 실패도 throw 하지 않는다.

## MCP 도구 목록 (4개)

| 도구                      | 설명                                              |
| ------------------------- | ------------------------------------------------- |
| `start_conversation`      | 새 대화 시작, provider 선택                       |
| `continue_conversation`   | 기존 세션 이어가기                                |
| `open_settings`           | 설정 UI 브라우저 열기                             |
| `list_antigravity_models` | `agy models` 캐시 조회 → 사용 가능 모델 목록 반환 |

## 세션 모델

- MCP 는 메타데이터만 보유. 컨텍스트는 외부 CLI 에 위임.
- `continue_conversation` 은 **현재 `project_hash` (cwd 기반)** 의 세션만 조회. 다른 cwd 에서 시작된 세션 ID 는 `error.code = 'unknown'` 반환.
- `session_id` 는 항상 명시 전달. 자동 폴백 없음.
- 보관 기간: `config.session_ttl_hours` (기본 72).
- 만료된 cogair 세션 파일은 다음 MCP 기동 시 정리. **외부 CLI (`$CODEX_HOME/sessions/`, antigravity 의 agy cwd) 의 자체 세션 파일은 손대지 않는다** — 외부 CLI 자체 관리에 위임.

## Settings UI — Google 엔진 토글 및 모델 설정

- `/GET /provider-status`: `antigravity`, `gemini`, `codex` 바이너리 가용 여부 + `agyModels` (agy 바이너리 있을 때만 조회).
- Google 엔진 토글: antigravity / gemini 중 하나만 활성화. 저장 시 ConfigSchema mutual-exclusion refinement 로 검증.
- Antigravity 모델 드롭다운: `agyModels` 목록으로 high/mid/low 티어별 선택. `auto` 항목 포함.

## 명시적 비채택

- 외부 LLM → Claude 재귀 호출 차단.
- MCP 측 예산/캡 추적.
- 활성 세션 목록 매 턴 주입.
- Provider 비율의 하드 캡.
- 자동 provider 전환 폴백.
- 세션 목록 조회 도구.
- 다른 cwd 의 세션 자동 fallback 검색 (엄격한 project 경계 유지).
- TTL 만료 시 외부 CLI 세션 파일 동반 삭제.
- antigravity sandbox-backend 선택 (codex/gemini 와 달리 backend 옵션 없음).
