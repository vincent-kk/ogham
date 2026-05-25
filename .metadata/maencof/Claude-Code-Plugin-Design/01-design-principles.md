---
created: 2026-02-28
updated: 2026-02-28
tags: [principles, progressive-autonomy, theory-mapping]
layer: meta
---

# 설계 원칙 — 6대 원칙 + Progressive Autonomy + 이론-구현 매핑

## 전제

이 문서의 모든 원칙은 [런타임 제약 분석](./00-runtime-constraints.md)의 go/no-go 결과에 근거한다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [검색 엔진 개요](./07-search-engine-overview.md)

---

## 1. maencof 설계 원칙 6가지

### 원칙 1 — 이론적 일관성
연구 제안서의 4-Layer 모델을 충실히 반영한다. 축소 발생 시 명시적 근거와 fallback을 문서화한다.

### 원칙 2 — 점진적 자율성 (Progressive Autonomy)
자율성을 Level 0-3으로 단계화한다. 시스템이 임의로 레벨을 올리지 않는다.
상세: [22-autonomy-levels.md](./22-autonomy-levels.md)

### 원칙 3 — 비개발자 포용
/maencof:setup 한 번으로 시작 가능. 내부 구현은 사용자에게 노출하지 않는다.

### 원칙 4 — 런타임 제약 준수
[Phase 0 go/no-go](./00-runtime-constraints.md) 결과를 설계의 하드 경계로 삼는다.

### 원칙 5 — 인덱스는 파생물
`.maencof/` 전체를 삭제해도 정보 손실이 없어야 한다. 원본 마크다운이 항상 진실의 원천이다.

### 원칙 6 — AI 에이전트 우선
Primary persona는 AI 에이전트이며, 인간 인터페이스는 포맷팅 레이어로 파생한다.

---

## 2. 이론-구현 매핑 매트릭스

| 이론 | 연구 제안서 원형 | maencof 구현 형태 | 축소 이유 |
|------|----------------|------------------|----------|
| 확산 활성화 | 그래프 전체 전파 | SA 엔진 (configurable) | Hook 타임아웃 (C1) |
| 기억 전이 | 자동 실시간 | SessionStart 지연 전이 | 비상주 런타임 (C4) |
| 벡터 검색 | 임베딩 DB | 태그+Frontmatter 검색 | Phase 3 선택적 확장 |
| 제텔카스텐 | 완전 양방향 링크 | 단방향+backlink 인덱스 | 일관성 유지 비용 |
| 4-Layer 모델 | 이론적 계층 | 디렉토리 기반 물리적 Layer | 파일 시스템 제약 |
| 그래프 탐색 | BFS 2-hop 한정 | SA + DAG 기반 다중 홉 | 검색 엔진 통합 |

---

## 3. Progressive Autonomy 개요

- 기본 시작 레벨: Level 0 (관찰 모드)
- 레벨 상승: 사용자 명시 승인으로만 가능
- trust-level.json이 Layer 1(Core Identity)에 배치되어 영속 관리

상세: [22-autonomy-levels.md](./22-autonomy-levels.md)
