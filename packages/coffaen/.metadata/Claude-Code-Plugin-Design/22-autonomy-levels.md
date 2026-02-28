---
created: 2026-02-28
updated: 2026-02-28
tags: [autonomy, trust-level, progressive-autonomy, safety]
layer: cross-cutting
---

# Progressive Autonomy Levels — Level 0-3 권한 + 전환 조건

## 개요

신뢰 수준에 따라 자율 권한을 점진적으로 확장.
모든 파괴적 작업은 최고 레벨에서도 승인 필요.

관련 문서: [온보딩 플로우](./23-onboarding-flow.md) | [스킬 명세](./18-skills.md) | [에이전트 명세](./19-agents.md)

---

## 1. 권한 매트릭스

| 동작 | Level 0 | Level 1 | Level 2 | Level 3 |
|------|---------|---------|---------|---------|
| 지식 트리 읽기 | 자율 | 자율 | 자율 | 자율 |
| 문서 CRUD | 승인 | 자율 | 자율 | 자율 |
| 링크 관리 | 승인 | 자율 | 자율 | 자율 |
| 기억 전이 | 승인 | 승인 | 제안 후 확인 | 자율 |
| 스킬 실행 | 승인 | 승인 | 자율 | 자율 |
| 에이전트 실행 | 승인 | 승인 | 승인 | 자율 |
| 대량 삭제/구조 변경 | **승인** | **승인** | **승인** | **승인** |

---

## 2. 신뢰 상승 조건

| 전환 | 상호작용 | 성공률 | 사용 기간 |
|------|---------|--------|----------|
| 0→1 | 30회 | 80%+ | 7일+ |
| 1→2 | 100회 | 90%+ | 30일+ |
| 2→3 | 300회 | 95%+ | 90일+ |

수동 승격: `/coffaen:trust-level set N`

---

## 3. 신뢰 하락 조건

- 연속 실패 5회 → 1레벨 하락
- 사용자 불만족 3회 → 1레벨 하락
- 긴급 잠금: `/coffaen:emergency-lock` → Level 0 즉시 복귀

---

## 4. trust-level.json 스키마

위치: `01_Core/trust-level.json` (identity-guardian 관리)

```json
{
  "current_level": 0,
  "interaction_count": 0,
  "success_count": 0,
  "last_escalation_date": null,
  "lock_status": false
}
```

`lock_status: true` → 수동 해제 전까지 Level 0 고정.

---

## 5. 안전장치

- 모든 레벨에서 대량 삭제/구조 변경은 반드시 승인
- Layer 1 파일은 identity-guardian만 쓰기 가능
- trust-level.json 직접 수정 금지 (MCP 도구 통해서만)
