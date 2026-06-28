# Spec — Responsibilities & Data Flow

## 컴포넌트 책임

| 컴포넌트                                 | 역할                                                                       | 위치                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Hooks                                    | MCP 상태 → Claude 컨텍스트 주입 (read-only 어댑터)                         | `hooks/`                             |
| Claude                                   | provider 선택 및 위임 여부 판단 (판단 주체)                                | —                                    |
| Skill `codex` / `antigravity` / `claude` | Claude 결정 → MCP 도구 호출 매핑                                           | `skills/{codex,antigravity,claude}/` |
| Skill `crosscheck`                       | codex + antigravity 병렬 호출 + 응답 합성                                  | `skills/crosscheck/`                 |
| Skill `setup`                            | `open_settings` 호출 → 브라우저 안내                                       | `skills/setup/`                      |
| MCP Server `tools`                       | provider 디스패치, config/counter/session 보유                             | `src/mcp/`                           |
| Provider Dispatcher                      | `codex-cli`, `agy`, `claude` 자식 프로세스 실행 + JSON envelope 정규화     | `src/dispatcher/`                    |
| External CLI                             | 실제 LLM 호출                                                              | 시스템 PATH                          |
| Web UI                                   | 사용자 설정 편집                                                           | `src/mcp/pages/settings/`            |

## 디스패치 흐름

1. SessionStart 훅: 정적 정책 1회 주입.
2. UserPromptSubmit 훅: 동적 상태 매 턴 주입.
3. Claude 가 정책 + 작업 성격을 종합해 provider 결정.
4. `/codex`, `/antigravity`, 또는 `/claude` 스킬 호출.
5. 스킬이 MCP `start_conversation` 또는 `continue_conversation` 호출.
6. MCP 가 provider별 dispatcher 로 위임.
7. Dispatcher 가 외부 CLI 자식 프로세스 실행, stdout/JSONL 파싱.
8. 정규화된 `ConversationResponse` 반환. 카운터 +1 (성공/실패 무관).
9. Claude 는 응답의 `session_id` 만으로 이어가기 판단 (직전 응답에 명시).

## 정책 모델

### Ratio (비율)

- 세 정수 (codex / antigravity / claude). 분모는 합.
- 호출 분배 의도. 강제 아님.
- 카운터 기준: 시도 수 (성공/실패 무관).
- 스코프: 동일 부모 PID 동안 누적. 부모 PID 변경 감지 시 리셋.

### Intervention strength (개입 강도)

- `-2 | -1 | 0 | +1 | +2`.
- 메커니즘: 매 턴 훅의 가이드 문구 톤만 조절. 강제 라우팅 없음.

### Keywords (키워드 매핑)

- provider별 자유 문자열 (codex / antigravity / claude).
- 훅이 템플릿에 join 하여 주입. Claude 판단 참고용.

### Options (확장 자리)

- `start_conversation` 의 `options` 객체 — `multi_agent` 등 provider별 지원 옵션.
- v1 화이트리스트는 비어 있다 (모든 옵션 ignored). 각 dispatcher 가 `supportedOptions` 집합으로 관리하며, 미지원 키는 `meta.ignored_options[]` 로 보고.

### option_flags (provider별 플래그)

- `codex`: `yolo` (boolean), `sandbox` (read-only/workspace-write/danger-full-access/off)
- `antigravity`: `sandbox` (boolean — 하위호환용, 항상 false 취급·미부착), `skip_permissions` (boolean — `--dangerously-skip-permissions`)
- `claude`: `permission_mode` (default/acceptEdits/auto/dontAsk/plan/bypassPermissions)

### preamble (프리앰블)

- provider별 자유 문자열 (codex / antigravity / claude).
- 각 provider 의 프롬프트 앞에 prepend.

### recency_factor (최신성 주입)

- provider별 (codex / antigravity / claude): `off | auto | strict`.
- `auto`: 쿼리에 날짜 힌트 자동 삽입. `strict`: 강한 최신성 요구 문구 추가.

## Provider 디스패치 정책

- 호출 실패 시 자동 provider 전환 없음. `error` 필드로 Claude 에 반환.
- 카운터는 실패도 포함.
- 예산/캡은 MCP 가 추적하지 않음 (외부 CLI 실패로 인지).
- `session_id` 는 실패 시에도 발급.

## Antigravity Dispatcher

`agy` CLI 어댑터. `src/dispatcher/antigravity/`.

### CLI 호출 규약

- 기본 플래그: `agy -p <prompt>` (plain text 출력 — `--output-format` 플래그 없음)
- 옵션 플래그: `--dangerously-skip-permissions` (`--sandbox` 는 #76 종결까지 미부착 — [agy-upstream-watch.md](./agy-upstream-watch.md))
- resume: `agy --continue -p <prompt> [flags]`
- 모델 지정: `--model=<name>` (model_map 에서 tier 해석)

### 세션 격리 (cwd)

- `agy` 는 headless conversation-id 를 발급하지 않는다 (Issue #7).
- 세션마다 격리된 cwd (`~/.claude/plugins/cennad/runtime/agy/<sessionId>/`) 를 생성.
- `externalSessionRef = cwd` — 이 경로가 cennad 세션과 agy 대화 이력의 단일 핸들.
- resume 은 동일 sessionId → 동일 cwd 의 `--continue` 로 구현.
- start() 타임아웃 시 cwd 삭제. resume() 타임아웃 시 cwd 보존 (대화 이력 유지).

### stdout 처리 (Issue #76)

agy 가 non-TTY 환경에서 stdout 을 무음 drop 하는 버그:

1. `parseJsonOutput(stdout)`: JSON object → 응답 키 탐색 (`response`, `output`, `text`, `message`, `result`); 순수 JSON 문자열이면 직접 반환; non-JSON 이면 trimmed text 반환; empty → `null`.
2. `parseJsonOutput` 이 null 이면 `resolveTranscript(cwd, since)` 시도 (transcript fallback).
3. transcript 도 null 이면 `cli_error` 반환.

### 모델 해석

- `resolveAntigravityModel(tier, map)`: config `model_map.antigravity` (high/mid/low) 에서 구체 모델명 해석.
- map 없음 → `-m` 생략, agy 기본값 사용.
- 모델명 하드코딩 없음 — 전적으로 config 에 위임.

## Claude Dispatcher

`claude` CLI 어댑터. `src/dispatcher/claude/`.

### CLI 호출 규약

- start: `claude -p <prompt> --output-format json --session-id <cennad sessionId> --permission-mode <m> --model <model> [--effort <e>] [--fallback-model <chain>] --strict-mcp-config --safe-mode`
- resume: `claude -p <prompt> --output-format json --resume <externalSessionRef> --permission-mode <m> --model <model> [--effort <e>] --strict-mcp-config --safe-mode` (--fallback-model 제거)
- `--strict-mcp-config` 와 `--safe-mode` 는 항상 부착 — 자식 프로세스가 부모 세션의 MCP 서버·훅·CLAUDE.md·스킬을 상속하지 못하도록 격리.

### 세션 핸들

- `externalSessionRef` = start 시 주입한 cennad `sessionId` (출력 파싱 불필요).
- 출력: 단일 JSON object, 응답은 `result` 필드.

### 모델·effort 해석

- `config.model_map.claude` (high/mid/low) → `{ model, effort }` 해석.
- env override: `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT`.

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

codex 는 reasoning effort 매핑을 쓰며 `model_map` 에 등장하지 않는다.

## model_map.claude

config 의 `model_map.claude` 는 tier → `{ model, effort }` 매핑이다. model aliases: `opus`, `sonnet`, `haiku`, `fable`, `best`, `opus[1m]`, `sonnet[1m]`. effort 스케일: `low < medium < high < xhigh < max`. 모델별 effort 상한: opus/fable/best/opus[1m] = 전체 5단계; sonnet/sonnet[1m] = low/medium/high/max (xhigh 없음); haiku = effort 없음.

```json
{
  "model_map": {
    "claude": {
      "high": { "model": "opus", "effort": "max" },
      "mid":  { "model": "opus", "effort": "high" },
      "low":  { "model": "sonnet", "effort": "high" }
    }
  }
}
```

env override: `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT`.

## core/agyModels — Antigravity 모델 캐시

`agy models` 출력을 파싱·캐싱해 사용 가능한 모델 풀네임 목록을 제공한다.

- 캐시 파일: `runtime/agy-models.json` (`{ models, fetched_at }`), TTL 1시간.
- TTL 초과 → `agy models` 재실행 → 실패 시 stale 캐시 → stale 없으면 빈 배열.
- 어떤 실패도 throw 하지 않는다.

## MCP 도구 목록 (3개)

| 도구                    | 설명                        |
| ----------------------- | --------------------------- |
| `start_conversation`    | 새 대화 시작, provider 선택 |
| `continue_conversation` | 기존 세션 이어가기          |
| `open_settings`         | 설정 UI 브라우저 열기       |

## 세션 모델

- MCP 는 메타데이터만 보유. 컨텍스트는 외부 CLI 에 위임.
- `continue_conversation` 은 **현재 `project_hash` (cwd 기반)** 의 세션만 조회. 다른 cwd 에서 시작된 세션 ID 는 `error.code = 'unknown'` 반환.
- `session_id` 는 항상 명시 전달. 자동 폴백 없음.
- 보관 기간: `config.session_ttl_hours` (기본 72).
- 만료된 cennad 세션 파일은 다음 MCP 기동 시 정리. **외부 CLI (`$CODEX_HOME/sessions/`, antigravity 의 agy cwd) 의 자체 세션 파일은 손대지 않는다** — 외부 CLI 자체 관리에 위임.

## Settings UI — 3-레인 설정

- `/GET /provider-status`: `codex`, `antigravity`, `claude` 바이너리 가용 여부 + `agyModels` (agy 바이너리 있을 때만 조회).
- 각 provider: enable 토글 + weight 슬라이더 (정규화 % 표시).
- codex: yolo / sandbox 옵션 유지.
- antigravity: sandbox 비활성화 안내 + skip_permissions + 티어별 agy 모델 드롭다운 (`agyModels` 목록).
- claude (Anthropic): permission_mode 라디오 (default/acceptEdits/auto/dontAsk/plan/bypassPermissions) + 티어별 model·effort 드롭다운 (effort 옵션은 선택 모델에 따라 조정).

## Config 무결성

- `/setup` 열기 시 `pruneConfigFile` 실행: 삭제된 provider 키 제거, 레거시 정수 ratio를 현재 스키마로 마이그레이션 (예: 구 gemini weight → antigravity 슬롯), 누락된 기본값 채움.
- `loadConfig` / `saveConfig` 도 Zod parse 시 unknown 키 자동 strip.

## 명시적 비채택

- 외부 LLM → Claude 재귀 호출 차단.
- crosscheck 에 claude 참여 (v1 에서 codex + antigravity 만).
- MCP 측 예산/캡 추적.
- 활성 세션 목록 매 턴 주입.
- Provider 비율의 하드 캡.
- 자동 provider 전환 폴백.
- 세션 목록 조회 도구.
- 다른 cwd 의 세션 자동 fallback 검색 (엄격한 project 경계 유지).
- TTL 만료 시 외부 CLI 세션 파일 동반 삭제.
- antigravity sandbox-backend 선택 (codex 와 달리 backend 옵션 없음).
