# Task 06: 피드백 학습 루프 구현

## Problem

현재 파이프라인은 capture→store→analyze까지만 자동화. 적용 결과가 다음 판단에 피드백되지 않는 단방향 구조.

```
capture → store → analyze → recommend → execute → [결과 소실]
```

8개 Gap 해소하여 폐쇄 루프를 완성한다.

## Scope

### A. 측정 (G1, G8)

`src/core/insight-stats/insight-stats.ts`에 promote/archive 증분 함수 추가.

```typescript
export async function updatePromotionStats(
  cwd: string,
  action: 'promoted' | 'archived',
): Promise<void>
```

- `l5_promoted` 또는 `l5_archived` 증분 후 `auto-insight-stats.json`에 저장
- `maencof-organize` SKILL.md의 기존 지시(line 103)와 연결

### B. 전이 결과 영속화 (G2, G3, G7)

`.maencof-meta/transition-history.json`에 outcome 저장.

```typescript
// src/types/agent.ts — TransitionDirective에 추가
outcome?: 'executed' | 'rejected' | 'failed';
resolvedAt?: string; // ISO timestamp

// 신규 타입
interface TransitionHistoryEntry {
  directive: TransitionDirective;
  sessionId: string;
  timestamp: string;
}
```

- `src/core/transition-history/transition-history.ts` 신규 모듈
  - `appendTransition(cwd, entry)` — 히스토리에 추가
  - `readTransitionHistory(cwd)` — 전체 읽기
  - `getRejectCount(cwd, path, direction)` — 특정 문서+방향 거부 횟수
- judge 모듈 가이드: 동일 문서+방향 거부 2회 → confidence에 -0.3 페널티
- 히스토리 최대 500건, 초과 시 오래된 항목부터 제거

### C. Hook 에러 로깅 (G4)

`.maencof-meta/error-log.json`에 운영 에러 기록.

```typescript
// src/core/error-log/error-log.ts 신규 모듈
interface ErrorLogEntry {
  hook: string;
  error: string;
  timestamp: string;
}

export async function appendErrorLog(cwd: string, entry: ErrorLogEntry): Promise<void>
```

- 15+ silent catch를 `catch (e) { await appendErrorLog(cwd, { hook, error: String(e), timestamp }); }`로 교체
- 에러 로그 최대 200건, 초과 시 오래된 항목부터 제거
- `maencof-checkup`에서 에러 로그 읽어 반복 패턴 진단 가능

### D. Precision 기반 sensitivity 자동 조정 (G6)

`session-start` hook에서 precision 계산 후 sensitivity 자동 조정.

```
precision = l5_promoted / (l5_promoted + l5_archived)
- denominator == 0 → skip (데이터 부족)
- precision < 0.3 → sensitivity 하향 (high→medium→low)
- precision > 0.8 → sensitivity 상향 (low→medium→high)
- 0.3~0.8 → 유지
```

- `src/core/insight-stats/insight-stats.ts`에 `calculatePrecision(stats)` 함수 추가
- `src/core/insight-stats/insight-stats.ts`에 `autoAdjustSensitivity(cwd)` 함수 추가
- `session-start` hook에서 `autoAdjustSensitivity()` 호출
- AutonomyLevel 0-1에서는 권고 메시지만 출력, 2 이상에서 자동 적용

### E. AutonomyLevel runtime 게이트 (G5)

`.maencof-meta/autonomy-config.json`에 현재 레벨 저장 + runtime 검사.

```typescript
// src/core/autonomy/autonomy.ts 신규 모듈
interface AutonomyConfig {
  level: AutonomyLevel; // 0 | 1 | 2 | 3
  updatedAt: string;
}

export async function readAutonomyLevel(cwd: string): Promise<AutonomyLevel>
export async function setAutonomyLevel(cwd: string, level: AutonomyLevel): Promise<void>
export function canAutoExecute(current: AutonomyLevel, required: AutonomyLevel): boolean
```

- agent 실행 전 `canAutoExecute()` 검사
- AutonomyLevel 2 승격 제안 조건: precision > 0.7이 5회 연속 세션 유지
- 승격은 자동 적용하지 않고 사용자에게 제안만 함

## Files (변경/신규)

| Action | Path |
|--------|------|
| modify | `src/core/insight-stats/insight-stats.ts` |
| modify | `src/types/agent.ts` |
| modify | `src/types/insight.ts` (precision 관련 타입 필요시) |
| modify | `src/hooks/session-start/session-start.ts` |
| modify | `src/hooks/session-end/session-end.ts` |
| modify | `src/hooks/index-invalidator/index-invalidator.ts` |
| modify | `src/hooks/dailynote-recorder/dailynote-recorder.ts` |
| modify | `src/hooks/cache-updater/cache-updater.ts` |
| modify | `skills/maencof-organize/SKILL.md` |
| modify | `skills/maencof-reflect/SKILL.md` |
| modify | `skills/maencof-checkup/SKILL.md` |
| modify | `agents/memory-organizer.md` |
| create | `src/core/transition-history/transition-history.ts` |
| create | `src/core/error-log/error-log.ts` |
| create | `src/core/autonomy/autonomy.ts` |
| create | `src/__tests__/unit/core/transition-history.test.ts` |
| create | `src/__tests__/unit/core/error-log.test.ts` |
| create | `src/__tests__/unit/core/autonomy.test.ts` |

## Verify

```bash
yarn maencof test:run
yarn maencof typecheck
```

전체 테스트 통과 + 타입 에러 없음.
