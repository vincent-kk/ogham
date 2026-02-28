---
created: 2026-02-28
updated: 2026-02-28
tags: [registry, versioning, discovery, custom-skill]
layer: design-area-3
---

# 10. 스킬/에이전트 등록 및 버전 관리

컨벤션 기반 자동 발견으로 등록 오버헤드를 최소화. 사용자 정의 확장을 지식 트리 내에서 관리한다.

관련 문서: [./08-skill-definition.md](./08-skill-definition.md) | [./09-agent-definition.md](./09-agent-definition.md) | [./14-plugin-architecture.md](./14-plugin-architecture.md)

---

## 등록 메커니즘

**파일명 = 스킬/에이전트 이름** 컨벤션으로 자동 발견.

```
packages/coffaen/
├── skills/
│   └── {skill-name}.md      → /coffaen:{skill-name} 으로 호출
└── agents/
    └── {agent-name}.md      → 에이전트 이름으로 호출
```

`plugin.json`의 `"skills"` 필드가 `skills/` 디렉토리를 지정. 별도 등록 절차 불필요 — 파일 배치만으로 자동 인식.

---

## 발견 경로 (우선순위 순)

| 우선순위 | 위치 | 유형 |
|---------|------|------|
| 1 | 지식 트리 내 `.coffaen-meta/custom-skills/` | 사용자 정의 스킬 |
| 2 | 지식 트리 내 `.coffaen-meta/custom-agents/` | 사용자 정의 에이전트 |
| 3 | `packages/coffaen/skills/` | 내장 스킬 |
| 4 | `packages/coffaen/agents/` | 내장 에이전트 |

동일 이름이 여러 경로에 존재할 경우, 우선순위가 높은 것이 우선 적용(사용자 정의가 내장을 오버라이드).

---

## 버전 관리

스킬/에이전트 정의 파일 Frontmatter에 `version` 필드를 포함:

```yaml
---
version: "1.0.0"
created: 2026-02-28
updated: 2026-02-28
---
```

- 변경 이력은 **git으로 추적** (별도 버전 관리 시스템 불필요)
- 사용자 정의 스킬은 지식 트리와 함께 백업/동기화
- 내장 스킬 버전은 패키지 릴리즈 버전과 연동

---

## 사용자 정의 스킬 생성 플로우

```
/coffaen:create-skill 호출
        ↓
인터뷰: 스킬 이름, 목적, 컨텍스트 레이어, 승인 정책
        ↓
마크다운 파일 자동 생성
        ↓
.coffaen-meta/custom-skills/{이름}.md 에 저장
        ↓
즉시 /coffaen:{이름} 으로 사용 가능
```

사용자 정의 스킬도 내장 스킬과 동일한 Progressive Autonomy 제약을 받는다. 상세: [./13-autonomy-levels.md](./13-autonomy-levels.md)
