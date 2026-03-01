---
created: 2026-02-28
updated: 2026-02-28
tags: [registry, versioning, discovery, custom-skill]
layer: design-area-4
---

# 스킬/에이전트 등록 및 버전 관리

## 개요

컨벤션 기반 자동 발견으로 등록 오버헤드를 최소화.
사용자 정의 확장을 지식 트리 내에서 관리한다.

관련 문서: [스킬 명세](./18-skills.md) | [에이전트 명세](./19-agents.md) | [플러그인 아키텍처](./16-plugin-architecture.md)

---

## 1. 등록 메커니즘

**파일명 = 이름** 컨벤션으로 자동 발견.

```
packages/maencof/
├── skills/{skill-name}.md      → /maencof:{skill-name}
└── agents/{agent-name}.md      → 에이전트 이름으로 호출
```

`plugin.json`의 `"skills"` 필드가 디렉토리를 지정. 별도 등록 불필요.

---

## 2. 발견 경로 (우선순위 순)

| 우선순위 | 위치 | 유형 |
|---------|------|------|
| 1 | `.maencof-meta/custom-skills/` | 사용자 정의 스킬 |
| 2 | `.maencof-meta/custom-agents/` | 사용자 정의 에이전트 |
| 3 | `packages/maencof/skills/` | 내장 스킬 |
| 4 | `packages/maencof/agents/` | 내장 에이전트 |

동일 이름 시 우선순위 높은 것이 오버라이드.

---

## 3. 버전 관리

Frontmatter에 `version` 포함:
```yaml
version: "1.0.0"
created: 2026-02-28
updated: 2026-02-28
```

- 변경 이력: git으로 추적 (별도 시스템 불필요)
- 사용자 정의 스킬: 지식 트리와 함께 백업
- 내장 스킬: 패키지 릴리즈 버전 연동

---

## 4. 사용자 정의 스킬 생성

```
/maencof:create-skill 호출 → 인터뷰 (이름, 목적, context_layers)
  → .maencof-meta/custom-skills/{이름}.md 생성
  → 즉시 /maencof:{이름} 사용 가능
```

사용자 정의 스킬도 내장과 동일한 Autonomy 제약. 상세: [22-autonomy-levels.md](./22-autonomy-levels.md)
