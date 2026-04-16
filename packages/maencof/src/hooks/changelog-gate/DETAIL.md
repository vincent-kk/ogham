# changelog-gate — DETAIL

## Requirements

- Stop 이벤트에서 `WATCHED_PATHS` 에 속한 경로에 커밋되지 않은 git 변경이 있으면 세션 종료를 차단하고, 사용자에게 changelog 기록을 유도한다.
- `.omc/.changelog-gate-passed` 마커가 존재하면 즉시 통과 (세션 내 이미 한 번 통과한 경우).
- `.maencof-meta/migration.lock` 이 **현 세션에서 유효하게 진행 중**인 경우에만 통과시키고, 그 외(TTL 만료 / session 불일치)의 lock 은 자동 unlink 하여 향후 세션을 블록하지 못하게 한다.

## API Contracts

### Input (stdin)

```ts
interface ChangelogGateInput {
  session_id?: string;
  cwd?: string;
}
```

### Output envelope

```ts
interface ChangelogGateResult {
  continue: boolean;
  reason?: string; // 차단 시 사용자에게 표시할 메시지
}
```

### Migration lock invariant (P2 / OQ-6)

- `lock exists ∧ TTL 유효 ∧ (sessionId 없음 | sessionId = 현 세션)` → 통과, lock 보존.
- 그 외(TTL 만료 / session 불일치 / JSON parse 실패) → `unlinkSync(lockPath)` 시도 후 일반 게이트 로직 진행.
- cleanup venue 는 본 훅의 **entry 시점** 이며 SessionStart 에서는 수행하지 않는다 (rationale: 세션 부팅 비용 절감 + orphan lock 이 다음 세션의 첫 Stop 까지 self-heal).

## Last Updated

2026-04-16 (PR α — P2 migration lock orphan cleanup)
