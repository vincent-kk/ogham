---
created: 2026-03-16
updated: 2026-03-16
tags: [NPDP, design-philosophy, soul, FCA, strong-typing, performance, ogham, filid, PL-agenda]
layer: 2
title: Vincent's Development Soul — 설계 사상 선언과 강제 전략
---
# Vincent's Development Soul — 설계 사상 선언과 강제 전략

## 배경

NPDP PL 아젠다 A5 — "인간 개발자의 설계 사상과 소울 유지" 논의를 통해 도출.
AI가 대량 생성하는 코드에서도 Vincent의 설계 철학이 일관되게 반영되도록, 원칙·강제전략·비용함수를 정의한다.

## 근본 원리: 낭비 없는 정밀함

인지적 낭비(S1), 타입 정보의 낭비(S2), 연산의 낭비(S3)를 모두 거부한다.

## 3대 원칙

### S1. 프랙탈 봉인 (Fractal Encapsulation)
- 모든 단위는 프랙탈 모듈. 내부는 자유롭게 import, 외부는 `index.ts` export만 허용
- 저차원 DI (Dependency Injection) 패턴
- **미해결 과제**: 프랙탈 1개의 개념적 크기(semantic boundary) 한계 미정의
  - 현상: `utils/api` 같은 프랙탈에 모든 API 정의를 넣어도 규칙 위반이 아님
  - 필요: 프랙탈당 개념적 크기 메타데이터 or LCOM4 기반 자동 분할 트리거

### S2. 강타입 구체화 (Type Concretization)
- 이상: 하나의 input → 하부 타입이 완벽하게 구체화
- 현실적 타협 (TS greedy 추론 속도 한계):
  - `any` 사용 시 명확한 이유 + 주석 보완 필수
  - ⛔ **any 방출(emit) 절대 금지** — return을 통한 any 오염 차단
  - any는 써도 되지만 반드시 **봉인(contain)**할 것
- "타입의 프랙탈 봉인" — S1과 같은 사상

### S3. 단위성능 우선 (Per-unit Performance)
- 구조적 우아함보다 실행 효율 우선
- 반패턴: `array.filter().map().forEach()` — 다중 루프, 이터레이터 오버헤드, 함수 선언 비용
- 대안: @winglet/common-utils 등 기 구축된 고속 라이브러리 우선 사용
- FE 개발자이지만 머신 레벨 최적화 추구
- **미해결 과제**: AI가 기존 라이브러리를 찾아 쓰도록 유도하는 메커니즘 부재
  - skill 선출 문제: "winglet이 뭐냐"에는 답하지만, "이 상황에서 winglet이 필요한가?" 판단은 못함
  - 모든 컨텍스트에 winglet 주입은 컨텍스트 낭비 → 근본적 한계

## 강제 전략: 사전 가이드 + 사후 검증

### 비용 함수 (핵심 재정의)

```
cost = f(수정으로 인한 오류 발생 확률)  ← 채택
cost ≠ f(코드 변경량)                   ← 기각
```

LLM이 코드의 단위 가치를 떨어뜨렸으므로, 코드를 다시 쓰는 건 싸다.
수정 과정에서 오류가 유입될 확률 — 이것이 진짜 비용.

### 사전/사후 구분 기준

| 시점 | 도구 | 대상 | 오류 확률 근거 |
|------|------|------|---------------|
| 사전 | ogham | S1 — 프랙탈 경계 | 구조 변경 → import 체인·의존성 그래프 전체 파급 |
| 사전 | ogham | S2 — any 방출 금지 | any 오염 추적 → 타입 체인 역추적 → 연쇄 타입 에러 |
| 사후 | filid | S3 — winglet 대체 | 로컬 함수→유틸 호출 교체, 입출력 동일 → 오류 확률 낮음 |
| 사후 | filid | 네이밍, 포맷, 컨벤션 | 기계적 치환 → 오류 확률 거의 0 |

### 게이트: PR 경계

- 개별 커밋은 검증 대상 아님 — AI가 자유롭게 코딩
- PR 생성 시점에 filid가 일괄 검증
- filid 3단계: ① FCA 구성 확인 → ② FCA 준수 검증(PR 리뷰) → ③ 미준수 자동 수정

## 공통 진단: 규칙 미준수의 원인

세 원칙 모두 "규칙은 있으나 AI가 안 따른다"는 동일한 문제를 가짐.
근본 원인: **"How"는 정의했지만 "When"과 "How much"가 빠져 있다.**
이는 Context Rot이 "코드"뿐 아니라 "규칙 전달" 차원에서도 발생하는 것.

## Related
- [[03_External/topical/aac-npdp-framework.md]]
- [[03_External/structural/fca-ai-architecture.md]]
- [[03_External/structural/filid-plugin.md]]
- [[03_External/topical/aac-project-ecosystem.md]]
- [[04_Action/npdp-agenda-02-divergence-prevention.md]]
- [[04_Action/npdp-agenda-03-code-stability.md]]