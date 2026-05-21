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

1. SessionStart 훅: 정적 정책(ratio, intervention_strength, keywords) 1회 주입.
2. UserPromptSubmit 훅: 동적 상태(현재 분포, provider 활성 상태) 매 턴 주입.
3. Claude가 정책 + 작업 성격을 종합해 provider 결정.
4. 해당 provider 스킬(`/codex` / `/gemini`) 호출.
5. 스킬이 MCP `start_conversation` 또는 `continue_conversation` 호출. `provider` 인자 명시 필수.
6. MCP가 provider별 dispatcher 함수로 위임.
7. Dispatcher가 외부 CLI를 자식 프로세스로 실행, JSONL/stdout 파싱.
8. 정규화된 `ConversationResponse` 를 Claude로 반환. 카운터 +1 (성공/실패 무관).
9. Claude는 응답의 `session_id` 만으로 이어가기 판단 (직전 응답에 명시 존재).

## 정책 모델

### Ratio (비율)
- 두 정수 (예: gemini 7, codex 3). 분모는 합.
- 호출 분배 의도. 강제 아님. Claude 판단의 참고 수치.
- 카운터 기준: 시도 수 (성공/실패 무관).
- 스코프: 동일 부모 PID 동안 누적. 부모 PID 변경 감지 시 리셋.

### Intervention strength (개입 강도)
- `-2 | -1 | 0 | +1 | +2`. 보수 ↔ 적극.
- 메커니즘: 매 턴 훅의 가이드 문구 톤만 조절. 강제 라우팅 없음.

### Keywords (키워드 매핑)
- provider별 자유 문자열. 예: `codex: "coding, review"`, `gemini: "youtube, research, search"`.
- 훅이 템플릿에 join 하여 주입. Claude 판단 참고용.

## Provider 디스패치 정책

- 호출 실패 시 자동 provider 전환 없음. `error` 필드로 Claude에 반환.
- 카운터는 실패도 포함 (시도 기준).
- 예산/캡은 MCP에서 추적하지 않음 (외부 CLI 실패로 인지).
- `session_id` 는 실패 시에도 발급 (재시도 슬롯 예약, 후속 호출 가능).

## 세션 모델

- MCP는 메타데이터만 보유. 컨텍스트는 외부 CLI에 위임.
- `continue_conversation` 은 Claude 전용 후속 호출 인터페이스.
- `session_id` 는 항상 명시적으로 전달. 자동 폴백 없음.
- 보관 기간: 72시간 (`last_used_at` 기준, `config.session_ttl_hours` 로 조정).
- 만료된 세션 파일은 다음 MCP 기동 시 정리.

## 명시적 비채택

- 외부 LLM → Claude 재귀 호출 차단 (복잡도 대비 빈도 낮음).
- MCP 측 예산/캡 추적.
- 활성 세션 목록 매 턴 주입 (직전 응답에 `session_id` 있음).
- Provider 비율의 하드 캡.
- 자동 provider 전환 폴백 (비율 의도 보존).
- 세션 목록 조회 도구 (Claude 전용 인터페이스라 불필요).
