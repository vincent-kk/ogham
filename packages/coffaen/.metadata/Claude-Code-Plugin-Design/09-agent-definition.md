---
created: 2026-02-28
updated: 2026-02-28
tags: [agent, access-control, layer-restriction]
layer: design-area-3
---

# 09. 에이전트 정의

스킬보다 복잡한 다단계 자율 작업을 수행하는 서브에이전트. 지식 트리 접근 범위를 명시적으로 제한하여 안전성을 보장한다.

관련 문서: [./08-skill-definition.md](./08-skill-definition.md) | [./13-autonomy-levels.md](./13-autonomy-levels.md) | [./14-plugin-architecture.md](./14-plugin-architecture.md)

---

## 에이전트 정의 위치

```
packages/coffaen/
└── agents/
    ├── memory-organizer.md
    ├── knowledge-connector.md
    ├── schedule-runner.md
    └── identity-guardian.md
```

각 마크다운 파일의 Frontmatter에 `allowed_layers`, `allowed_operations`를 명시. 등록/발견 메커니즘 상세: [./10-registry-versioning.md](./10-registry-versioning.md)

---

## 에이전트-Layer 접근 매트릭스

| 에이전트 | Layer 1 | Layer 2 | Layer 3 | Layer 4 | 쓰기 범위 |
|---------|---------|---------|---------|---------|----------|
| memory-organizer | 읽기 | 읽기/쓰기 | 읽기/쓰기 | 읽기/쓰기 | 전이/정리 |
| knowledge-connector | 읽기 | 읽기 | 읽기 | 읽기 | 링크 생성만 |
| schedule-runner | 읽기 | 읽기 | - | 읽기/쓰기 | 스케줄 실행 기록 |
| identity-guardian | 읽기/쓰기 | - | - | - | Layer 1 보호/갱신 |

Layer 구조 상세: [./02-knowledge-tree-structure.md](./02-knowledge-tree-structure.md)

---

## 지식 트리 접근 방식

에이전트는 **MCP 도구를 통한 간접 접근만 허용**. 직접 파일 시스템 접근 금지.

```
에이전트 → MCP 도구 호출 → 접근 제어 검증 → 지식 트리 조작
```

에이전트 정의 파일 Frontmatter 예시:
```yaml
allowed_layers: [2, 3, 4]
allowed_operations: [read, create, update]
forbidden_operations: [delete, bulk-modify]
```

---

## Progressive Autonomy와 에이전트 실행

| Level | 에이전트 실행 방식 |
|-------|----------------|
| Level 0 | 모든 에이전트 실행 전 승인 필요 |
| Level 1 | 모든 에이전트 실행 전 승인 필요 |
| Level 2 | knowledge-connector, schedule-runner 자율 실행. memory-organizer, identity-guardian은 승인 |
| Level 3 | 파괴적 작업(대량 삭제/구조 변경)만 승인. 나머지 자율 |

긴급 잠금 시 모든 에이전트가 즉시 Level 0 제약으로 복귀. 상세: [./13-autonomy-levels.md](./13-autonomy-levels.md)
