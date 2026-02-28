---
created: 2026-02-28
updated: 2026-02-28
tags: [agent, access-control, layer-restriction]
layer: design-area-4
---

# 에이전트 명세 — 서브에이전트 정의 + Layer 접근 매트릭스

## 개요

스킬보다 복잡한 다단계 자율 작업을 수행하는 서브에이전트.
지식 트리 접근 범위를 명시적으로 제한하여 안전성을 보장한다.

관련 문서: [스킬 명세](./18-skills.md) | [Progressive Autonomy](./22-autonomy-levels.md) | [플러그인 아키텍처](./16-plugin-architecture.md)

---

## 1. 에이전트 정의 위치

```
packages/coffaen/agents/
├── memory-organizer.md
├── knowledge-connector.md
├── schedule-runner.md
└── identity-guardian.md
```

Frontmatter에 `allowed_layers`, `allowed_operations` 명시.
등록 메커니즘: [등록 및 버전 관리](./20-registry-versioning.md)

---

## 2. 에이전트-Layer 접근 매트릭스

| 에이전트 | L1 | L2 | L3 | L4 | 쓰기 범위 |
|---------|----|----|----|----|----------|
| memory-organizer | 읽기 | 읽기/쓰기 | 읽기/쓰기 | 읽기/쓰기 | 전이/정리 |
| knowledge-connector | 읽기 | 읽기 | 읽기 | 읽기 | 링크 생성만 |
| schedule-runner | 읽기 | 읽기 | - | 읽기/쓰기 | 스케줄 실행 기록 |
| identity-guardian | 읽기/쓰기 | - | - | - | Layer 1 보호/갱신 |

---

## 3. 접근 방식

에이전트는 **MCP 도구를 통한 간접 접근만 허용**. 직접 파일 시스템 접근 금지.

```
에이전트 → MCP 도구 호출 → 접근 제어 검증 → 지식 트리 조작
```

Frontmatter 예시:
```yaml
allowed_layers: [2, 3, 4]
allowed_operations: [read, create, update]
forbidden_operations: [delete, bulk-modify]
```

---

## 4. Autonomy Level별 에이전트 실행

| Level | 실행 방식 |
|-------|---------|
| Level 0-1 | 모든 에이전트 실행 전 승인 필요 |
| Level 2 | knowledge-connector, schedule-runner 자율. 나머지 승인 |
| Level 3 | 파괴적 작업(대량 삭제/구조 변경)만 승인. 나머지 자율 |

긴급 잠금 시 Level 0 복귀. 상세: [22-autonomy-levels.md](./22-autonomy-levels.md)
