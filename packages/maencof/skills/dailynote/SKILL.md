---
name: dailynote
user_invocable: true
description: View maencof daily activity log — shows what tools were used, documents changed, and session events for a given day
version: 1.0.0
complexity: simple
context_layers: []
orchestrator: dailynote skill
plugin: maencof
---

# dailynote — Daily Activity Log

오늘(또는 지정 날짜)의 maencof 활동 기록을 조회합니다.
maencof가 자동으로 기록한 도구 호출, 문서 변경, 세션 이벤트를 보여줍니다.

## When to Use This Skill

- 오늘 maencof에서 무슨 일이 있었는지 확인할 때
- 특정 날짜의 활동 이력을 조회할 때
- 최근 며칠간의 활동 패턴을 확인할 때

## Workflow

### Step 1 — Parse Arguments

사용자 입력에서 조회 조건을 파싱한다.

- 날짜 지정: `--date=YYYY-MM-DD` (기본: 오늘)
- 최근 N일: `--days=N` (기본: 1, 최대: 30)
- 카테고리 필터: `--category=document|search|index|config|session|diagnostic`
- 인자 없으면 오늘의 전체 활동을 표시

### Step 2 — Call dailynote_read

MCP 도구 `dailynote_read`를 호출하여 결과를 가져온다.

```
dailynote_read({
  date: "<parsed date or undefined>",
  last_days: <parsed days or undefined>,
  category: "<parsed category or undefined>"
})
```

### Step 3 — Display Results

결과를 사용자에게 보기 좋게 표시한다.

- 날짜별로 그룹핑하여 표시
- 각 엔트리는 시간, 카테고리, 설명, 경로를 포함
- 엔트리가 없으면 "해당 날짜에 기록된 활동이 없습니다." 표시
- 총 엔트리 수를 하단에 요약 표시

## Output Format

```markdown
## 📋 Dailynote — 2026-03-02

| 시간 | 카테고리 | 활동 | 경로 |
|------|----------|------|------|
| 09:15 | session | 세션 시작 | — |
| 09:16 | document | 문서 생성 (L2) | 02_Derived/... |

> 총 2건의 활동이 기록되었습니다.
```

## Error Handling

- Vault가 초기화되지 않은 경우: "Vault가 초기화되지 않았습니다. `/maencof:setup`을 실행하세요."
- dailynote 파일이 없는 경우: 빈 결과 반환 (에러 아님)
