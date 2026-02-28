---
created: 2026-02-28
updated: 2026-02-28
tags: [index, overview, navigation]
layer: meta
---

# coffaen 설계 문서 통합 목차

coffaen은 4-Layer 지식 모델 + 지식 그래프 검색 엔진 기반의 개인 지식공간 관리 Claude Code 플러그인이다.

관련 연구 문서:
- [연구 제안서](../Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/)
- [그래프 지식 발견 알고리즘](../TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm/)

---

## 문서 목록

| Part | # | 제목 | 링크 |
|------|---|------|------|
| 0 | 00 | 런타임 제약 분석 | [00](./00-runtime-constraints.md) |
| 0 | 01 | 설계 원칙 | [01](./01-design-principles.md) |
| 1 | 02 | 4-Layer 지식 모델 | [02](./02-knowledge-layers.md) |
| 1 | 03 | 트리-그래프 이중 구조 | [03](./03-tree-graph-structure.md) |
| 1 | 04 | 원자적 문서 정책 | [04](./04-atomic-document-policy.md) |
| 1 | 05 | Frontmatter 스키마 | [05](./05-frontmatter-schema.md) |
| 1 | 06 | 링크 정책 | [06](./06-link-policy.md) |
| 2 | 07 | 검색 엔진 개요 | [07](./07-search-engine-overview.md) |
| 2 | 08 | 코어 모듈 | [08](./08-core-modules.md) |
| 2 | 09 | 보조 모듈 | [09](./09-auxiliary-modules.md) |
| 2 | 10 | 확산 활성화 | [10](./10-spreading-activation.md) |
| 2 | 11 | 데이터 파이프라인 | [11](./11-data-pipeline.md) |
| 2 | 12 | 메타데이터 전략 | [12](./12-metadata-strategy.md) |
| 3 | 13 | 기억 라이프사이클 | [13](./13-memory-lifecycle.md) |
| 3 | 14 | 충돌 해소 | [14](./14-conflict-resolution.md) |
| 3 | 15 | 크래시 복구 | [15](./15-crash-recovery.md) |
| 4 | 16 | 플러그인 아키텍처 | [16](./16-plugin-architecture.md) |
| 4 | 17 | MCP 도구 명세 | [17](./17-mcp-tools.md) |
| 4 | 18 | 스킬 명세 | [18](./18-skills.md) |
| 4 | 19 | 에이전트 명세 | [19](./19-agents.md) |
| 4 | 20 | 등록 및 버전 관리 | [20](./20-registry-versioning.md) |
| 5 | 21 | Lazy Scheduling | [21](./21-lazy-scheduling.md) |
| 5 | 22 | Progressive Autonomy | [22](./22-autonomy-levels.md) |
| 5 | 23 | 온보딩 플로우 | [23](./23-onboarding-flow.md) |
| 6 | 24 | 사용 시나리오 | [24](./24-usage-scenarios.md) |
| 6 | 25 | 설계 결정 | [25](./25-design-decisions.md) |
| 6 | 26 | 한계와 제약 | [26](./26-constraints-and-limitations.md) |

---

## 권장 읽기 순서

```
Phase 0: 00 → 01
Part 1: 02 → 03 → 04 → 05 → 06
Part 2: 07 → 08 → 09 → 10 → 11 → 12
Part 3: 13 → 14 → 15
Part 4: 16 → 17 → 18 → 19 → 20
Part 5: 21 → 22 → 23
Part 6: 24 → 25 → 26
```

---

## 문서 갱신 규칙

| 변경 유형 | 갱신 필요 문서 |
|----------|--------------|
| 런타임 제약 변경 | 00, 01, 10 |
| Layer 구조 변경 | 02, 03, 05, 10 |
| 링크 정책 변경 | 06, 08 |
| 검색 엔진 변경 | 07, 08, 09, 10, 11 |
| 메타데이터 전략 변경 | 05, 12 |
| 스킬/에이전트 추가 | 17, 18, 19, 20 |
| 플러그인 아키텍처 변경 | 16, INDEX |

문서 추가 시 이 INDEX의 문서 목록과 갱신 규칙 테이블을 함께 업데이트한다.
