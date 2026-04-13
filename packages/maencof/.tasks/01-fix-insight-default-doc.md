# Task 01: SKILL.md max_captures_per_session 기본값 수정

## Problem

`skills/maencof-insight/SKILL.md:80`에 `max_captures_per_session: 5`로 기재되어 있으나,
실제 기본값은 `src/constants/insight.ts:6`에서 `10`이다.

## Files

- `skills/maencof-insight/SKILL.md` — line 80 부근, `max_captures_per_session: 5` → `10`

## Steps

1. `skills/maencof-insight/SKILL.md`에서 `max_captures_per_session: 5`를 `max_captures_per_session: 10`으로 변경
2. 동일 파일 내 다른 위치에도 5가 기본값으로 언급되어 있는지 확인

## Verify

```bash
grep -n 'max_captures_per_session' packages/maencof/skills/maencof-insight/SKILL.md
grep -n 'max_captures_per_session' packages/maencof/src/constants/insight.ts
```

두 값이 일치하면 완료.
