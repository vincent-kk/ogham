---
created: 2026-02-28
updated: 2026-02-28
tags: [principles, progressive-autonomy, theory-mapping]
layer: meta
---

# 설계 원칙 — 철학, Progressive Autonomy, 이론-구현 매핑

## 전제

이 문서의 모든 원칙은 [런타임 제약 분석](./00-runtime-constraints.md)의 go/no-go 결과에 근거한다.
제약을 무시하는 원칙은 채택하지 않는다.

관련 문서: [플러그인 아키텍처](./14-plugin-architecture.md)

---

## 1. coffaen 설계 원칙 4가지

### 원칙 1 — 이론적 일관성

연구 제안서의 4-Layer 모델(Core / Derived / External / Action)을 충실히 반영한다.
이론적 원형에서 축소가 발생할 경우, 반드시 명시적 근거와 fallback을 문서화한다.
축소 없는 임의 변형은 허용하지 않는다.

### 원칙 2 — 점진적 자율성 (Progressive Autonomy)

자율성을 Level 0-3으로 단계화한다. 낮은 레벨에서 시작하여 사용자 신뢰가 쌓일수록
높은 레벨로 전환한다. 시스템이 임의로 레벨을 올리지 않는다.
상세 정의는 [13-autonomy-levels.md](./13-autonomy-levels.md)로 위임.

| Level | 이름 | 특징 |
|-------|------|------|
| 0 | 관찰 | 제안만, 모든 변경에 명시적 승인 필요 |
| 1 | 보조 | 안전한 읽기 작업 자율, 쓰기는 승인 |
| 2 | 협력 | 제안 후 타임아웃 확인으로 자율 실행 |
| 3 | 자율 | 구조화된 작업은 자율 실행, 감사 로그 유지 |

### 원칙 3 — 비개발자 포용

기술적 배경이 없는 사용자도 /coffaen:setup 한 번으로 시작할 수 있어야 한다.
내부 구현(Frontmatter, backlink 인덱스, Layer 구조)은 사용자에게 노출하지 않는다.
사용자가 보는 인터페이스는 자연어 스킬 명령과 제안 메시지뿐이다.

### 원칙 4 — 런타임 제약 준수

[Phase 0 go/no-go](./00-runtime-constraints.md) 결과를 설계의 하드 경계로 삼는다.
NO-GO 판정 기능은 기본 구현에서 배제하고 선택적 확장으로만 제공한다.
CONSTRAINED 판정 기능은 fallback 전략과 함께 구현한다.

---

## 2. 이론-구현 매핑 매트릭스

| 이론 | 연구 제안서 원형 | coffaen 구현 형태 | 축소 이유 |
|------|----------------|------------------|----------|
| 확산 활성화 | 그래프 전체 전파 | BFS 2-hop | Hook 타임아웃 (C1) |
| 기억 전이 | 자동 실시간 | SessionStart 지연 전이 | 비상주 런타임 (C4) |
| 벡터 검색 | 임베딩 DB | 태그+Frontmatter 검색 | 외부 DB 회피, 선택적 확장 허용 |
| 제텔카스텐 | 완전 양방향 링크 | 단방향+backlink 인덱스 | 일관성 유지 비용 절감 |
| 4-Layer 모델 | 이론적 계층 | 디렉토리 기반 물리적 Layer | 파일 시스템 제약 (C2) |

---

## 3. Progressive Autonomy 개요

coffaen은 사용자의 신뢰를 점진적으로 획득하는 반자율 시스템이다.

**핵심 원칙**
- 기본 시작 레벨: Level 0 (관찰 모드)
- 레벨 상승: 사용자 명시 승인으로만 가능
- 레벨 하강: 언제든 사용자가 요청 가능
- trust-level.json이 Layer 1(Core Identity)에 배치되어 영속 관리됨

**go/no-go와의 연결**
- Level 0-1은 사용자 승인 방식 → 런타임 제약과 무관하게 안전
- Level 2-3은 "제안 후 확인" 방식 → C1(타임아웃) 내에서만 자율 실행

상세 정의는 [13-autonomy-levels.md](./13-autonomy-levels.md) 참조.
