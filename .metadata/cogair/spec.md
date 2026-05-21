# Spec — Responsibilities & Data Flow

## 컴포넌트 책임

| 컴포넌트 | 역할 | 위치 |
|---|---|---|
| Hooks | MCP 상태 → Claude 컨텍스트 주입 (read-only 어댑터) | `hooks/` |
| Claude | provider 선택 및 위임 여부 판단 (판단 주체) | — |
| Skill `codex` / `gemini` | Claude 결정 → MCP 도구 호출 매핑 | `skills/{codex,gemini}/` |
| Skill `setup` | `open_settings` 호출 → 브라우저 안내 | `skills/setup/` |
| MCP Server `tools` | provider 디스패치, config/counter/session 보유 | `src/mcp/` |
| Provider Dispatcher | `codex-cli`, `gemini-cli` 자식 프로세스 실행 + JSON envelope 정규화 | `src/dispatcher/` |
| External CLI | 실제 LLM 호출 | 시스템 PATH |
| Web UI | 사용자 설정 편집 | `src/mcp/pages/settings/` |

## 디스패치 흐름

1. SessionStart 훅: 정적 정책 1회 주입.
2. UserPromptSubmit 훅: 동적 상태 매 턴 주입.
3. Claude 가 정책 + 작업 성격을 종합해 provider 결정.
4. `/codex` 또는 `/gemini` 스킬 호출.
5. 스킬이 MCP `start_conversation` 또는 `continue_conversation` 호출.
6. MCP 가 provider별 dispatcher 로 위임.
7. Dispatcher 가 외부 CLI 자식 프로세스 실행, stdout/JSONL 파싱.
8. 정규화된 `ConversationResponse` 반환. 카운터 +1 (성공/실패 무관).
9. Claude 는 응답의 `session_id` 만으로 이어가기 판단 (직전 응답에 명시).

## 정책 모델

### Ratio (비율)
- 두 정수. 분모는 합.
- 호출 분배 의도. 강제 아님.
- 카운터 기준: 시도 수 (성공/실패 무관).
- 스코프: 동일 부모 PID 동안 누적. 부모 PID 변경 감지 시 리셋.

### Intervention strength (개입 강도)
- `-2 | -1 | 0 | +1 | +2`.
- 메커니즘: 매 턴 훅의 가이드 문구 톤만 조절. 강제 라우팅 없음.

### Keywords (키워드 매핑)
- provider별 자유 문자열.
- 훅이 템플릿에 join 하여 주입. Claude 판단 참고용.

### Options (확장 자리)
- `start_conversation` 의 `options` 객체 — `multi_agent` 등 provider별 지원 옵션.
- v1 화이트리스트는 비어 있다 (모든 옵션 ignored). 각 dispatcher 가 `supportedOptions` 집합으로 관리하며, 미지원 키는 `meta.ignored_options[]` 로 보고.

## Provider 디스패치 정책

- 호출 실패 시 자동 provider 전환 없음. `error` 필드로 Claude 에 반환.
- 카운터는 실패도 포함.
- 예산/캡은 MCP 가 추적하지 않음 (외부 CLI 실패로 인지).
- `session_id` 는 실패 시에도 발급.

## 세션 모델

- MCP 는 메타데이터만 보유. 컨텍스트는 외부 CLI 에 위임.
- `continue_conversation` 은 **현재 `project_hash` (cwd 기반)** 의 세션만 조회. 다른 cwd 에서 시작된 세션 ID 는 `error.code = 'unknown'` 반환.
- `session_id` 는 항상 명시 전달. 자동 폴백 없음.
- 보관 기간: `config.session_ttl_hours` (기본 72).
- 만료된 cogair 세션 파일은 다음 MCP 기동 시 정리. **외부 CLI (`$CODEX_HOME/sessions/`, gemini 의 task_dir) 의 자체 세션 파일은 손대지 않는다** — 외부 CLI 자체 관리에 위임.

## 명시적 비채택

- 외부 LLM → Claude 재귀 호출 차단.
- MCP 측 예산/캡 추적.
- 활성 세션 목록 매 턴 주입.
- Provider 비율의 하드 캡.
- 자동 provider 전환 폴백.
- 세션 목록 조회 도구.
- 다른 cwd 의 세션 자동 fallback 검색 (엄격한 project 경계 유지).
- TTL 만료 시 외부 CLI 세션 파일 동반 삭제.
