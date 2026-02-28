---
created: 2026-02-28
updated: 2026-02-28
tags: [skill, context-injection, knowledge-tree]
layer: design-area-3
---

# 08. 스킬 정의

사용자가 `/coffaen:명령` 형태로 호출하는 확장 기능 단위. 지식 트리 컨텍스트를 주입하여 기억 인식 상태에서 실행된다.

관련 문서: [./14-plugin-architecture.md](./14-plugin-architecture.md) | [./09-agent-definition.md](./09-agent-definition.md) | [./13-autonomy-levels.md](./13-autonomy-levels.md)

---

## 스킬 정의 위치

```
packages/coffaen/
└── skills/
    ├── setup.md
    ├── remember.md
    ├── recall.md
    ├── organize.md
    └── reflect.md
```

`plugin.json`의 `"skills"` 필드가 `skills/` 디렉토리를 참조하여 자동 발견한다. 사용자 정의 스킬은 지식 트리 내 `.coffaen-meta/custom-skills/`에 배치한다 ([./10-registry-versioning.md](./10-registry-versioning.md) 참고).

---

## 지식 트리 컨텍스트 주입 시퀀스

```
1. 사용자가 /coffaen:스킬명 호출
        ↓
2. skills/스킬명.md에서 system prompt 로드
        ↓
3. 스킬의 context_layers 설정에 따라 관련 Layer 문서 수집
        ↓
4. BFS 2-hop으로 연관 문서 확산 탐색
        ↓
5. 수집된 컨텍스트를 스킬 프롬프트에 주입
```

**BFS 2-hop 탐색**: 문서 Frontmatter의 `related` 링크를 따라 2단계까지 확산. 토큰 예산 초과 시 Layer 1 → Layer 2 순으로 우선순위 적용.

---

## 핵심 스킬 목록

| 스킬 | 호출 방법 | 역할 | context_layers |
|------|-----------|------|----------------|
| setup | `/coffaen:setup` | 초기 온보딩, Core Identity 수집 | L1 |
| remember | `/coffaen:remember` | 새 지식 기록 | L1, L2 |
| recall | `/coffaen:recall` | 지식 검색/회상 | L1, L2, L3 |
| organize | `/coffaen:organize` | 기억 정리/전이 | L2, L4 |
| reflect | `/coffaen:reflect` | 지식 연결/통찰 | L1, L2, L3 |

온보딩 플로우 상세: [./12-onboarding-flow.md](./12-onboarding-flow.md)

---

## Progressive Autonomy와 스킬 실행

| Level | 스킬 실행 방식 |
|-------|--------------|
| Level 0 | 모든 스킬 실행 전 승인 필요 |
| Level 1 | 모든 스킬 실행 전 승인 필요 |
| Level 2 | 스킬 자율 실행 (단, 쓰기 동작 포함 시 제안 후 확인) |
| Level 3 | 스킬 완전 자율 실행 |

Level 정의 전문: [./13-autonomy-levels.md](./13-autonomy-levels.md)
