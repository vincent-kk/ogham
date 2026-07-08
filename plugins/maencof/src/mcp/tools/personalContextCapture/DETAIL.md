# personalContextCapture SPEC

## Requirements

- `.maencof-meta/personal-context.json`의 states/topics 항목을 편집하는 **유일한 채널** (config 필드는
  personal-status 스킬이 직접 수정 가능 — insight-config 선례).
- KG 캐시와 무관 — `registerReadTool({ needsFreshness: false })`로 등록 (companion_edit 선례).
- 조용함: 응답은 `{ success, id?, merged?, message }` 최소형. 캡처 배너·pending 통지·세션 시작
  알림을 만들지 않으며, message는 LLM 전용으로 "Do not mention this capture"를 포함한다.

## API Contracts

입력 (플랫 — 조합별 필수는 핸들러 검증):

| 조합                | 필수                             | 선택                        | 거부                         |
| ------------------- | -------------------------------- | --------------------------- | ---------------------------- |
| `capture` + `state` | label, kind, intensity, evidence | note(≤80), ttlDays(1–60)    | due                          |
| `capture` + `topic` | label, kind                      | note(≤100), due(YYYY-MM-DD) | intensity, evidence, ttlDays |
| `resolve` (양쪽)    | label                            | —                           | (나머지 무시)                |

동작:

- capture는 upsert — `sanitizeSegment(label)` slug 일치 시 state 재강화(expiresAt 연장,
  reinforceCount++) / topic touch(lastSeenAt 갱신, resolved 재활성화).
- state 신규는 active 캡(10) 초과 시 거부 + 현황 반환. topic은 보존 캡(20) 초과 시 resolved
  우선 evict.
- `config.enabled=false`면 모든 mutation 거부.
- 검증 실패는 `success: false` + `Invalid capture: ...` (필드 절단 없음 — 저작 게이트).

설계 정본: `.metadata/maencof/Claude-Code-Plugin-Design/27-personal-context.md`
