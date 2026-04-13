# Task 03: checkup 에이전트 이름 3곳 통일

## Problem

checkup 에이전트의 이름이 3곳에서 모두 다르다:

| 위치 | 현재 값 |
|------|---------|
| `agents/checkup.md` frontmatter `name:` | `maencof-checkup` |
| `src/types/agent.ts` AgentRole | `'checkup'` |
| `CLAUDE.md` Agents 섹션 | `maencof-checkup` |

## Decision: Option B — `checkup`으로 통일

maencof- 접두사는 skill에서만 외부 구분용으로 사용. agent는 플러그인 내부이므로 접두사 불필요.

- `agents/checkup.md` frontmatter `name:` → `checkup`
- CLAUDE.md에서 `maencof-checkup` → `checkup`
- 파일명과 AgentRole 타입은 변경 없음

## Files

- `agents/checkup.md:2` — frontmatter name 필드
- `src/types/agent.ts:11` — AgentRole union
- `CLAUDE.md` — Agents 섹션

## Verify

```bash
grep -rn 'checkup' packages/maencof/agents/ packages/maencof/src/types/agent.ts packages/maencof/CLAUDE.md
```

모든 참조가 동일한 이름을 사용하면 완료.
