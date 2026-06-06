## Purpose

`runtime/counter.json` 으로 provider(gemini / codex / antigravity) 호출 횟수 추적. 파일의 `parent_pid` 가 현재 세션 PID 와 다르면 카운트를 0/0/0 으로 간주하고 다음 write 시 갱신 — 세션마다 자동 격리.

## Structure

| 파일                              | 역할                                                      |
| --------------------------------- | --------------------------------------------------------- |
| `operations/loadCounter.ts`       | 파일 read + `parent_pid` 비교 + 불일치·누락 시 0 fallback |
| `operations/getCounter.ts`        | `loadCounter` 호출 후 현재 카운트 반환                    |
| `operations/incrementCounter.ts`  | 지정 provider +1 증가 후 `atomicWrite` 저장               |
| `index.ts`                        | barrel: `getCounter`, `incrementCounter`                  |

## Conventions

- 디스크 JSON 키는 snake_case (`gemini`, `codex`, `antigravity`, `parent_pid`)
- `parent_pid` 미스매치 시 카운트는 0/0 으로 취급하고 다음 write 에서 현재 pid 로 갱신
- +1 은 호출 시도 기준 — CLI 성공·실패 결과와 무관
- 모든 write 는 `atomicWrite` 경유 (tmp → rename)

## Boundaries

### Always do

- `parent_pid` 불일치 시 `{ gemini: 0, codex: 0, antigravity: 0 }` 반환 후 다음 write 에서 pid 갱신
- `incrementCounter` 는 `loadCounter` → 수정 → `atomicWrite` 순서로 실행

### Ask first

- counter 디스크 스키마 확장 (새 provider 추가 등)
- 카운트 정책 변경 (시도 기준 → 성공 기준 전환 등)

### Never do

- 락 없이 동시 write — MCP 단일 프로세스 가정 하에 직렬 처리
- 외부에서 `runtime/counter.json` 직접 mutation
- `parent_pid` 불일치 상태에서 이전 카운트 값 사용

## Dependencies

- `node:fs/promises`
- `../../lib/atomicWrite`
- `../../utils/parentPid`
- `../../constants/paths` (`COUNTER_PATH`)
