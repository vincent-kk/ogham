---
created: 2026-03-18
updated: 2026-03-18
tags: [NPDP, code-review, verification, PL-agenda]
layer: 4
title: NPDP 핵심 고민 — 코드 리뷰와 검증 구성
expires: 2026-04-15
---
# NPDP 핵심 고민 — 코드 리뷰와 검증 구성

## 문제 정의

NPDP Phase 4 영역. AI가 생성한 코드를 **누가, 어떤 기준으로, 어떤 프로세스로 리뷰하고 검증**할 것인가. AX-Native PRD Template 3단계에 "가상 유저 테스트"가 언급되어 있지만 코드 리뷰와의 관계가 미정의.

## PL로서 답해야 할 핵심 질문

### 리뷰 주체와 역할 분담
- 리뷰어는 인간? AI? 둘 다? — 각각의 역할은?
- AI 리뷰의 범위: 스타일 체크? 로직 검증? 보안 점검? 성능 분석?
- 인간 리뷰가 반드시 필요한 영역은 어디인가?

### 리뷰 기준
- 리뷰 기준은 어떻게 정의하고 문서화하는가?
- 자동 스코어링 시스템을 도입할 것인가?
- "나의 철학" 준수 여부도 리뷰 항목에 포함하는가? (→ Agenda #2와 연결)

### 검증 프로세스
- "가상 유저 테스트"와 코드 리뷰는 어떤 관계인가? (순차? 병렬?)
- 검증 통과 기준(acceptance criteria)은 누가 정의하는가?
- 검증 실패 시 피드백 루프는 어떻게 구성하는가? (AI에게 재작성 요청? 인간이 수정?)

## 현재 상태
- [ ] 리뷰 주체 및 역할 분담 구조 설계
- [ ] 리뷰 기준 체계 수립
- [ ] 검증 프로세스 및 피드백 루프 설계

## Related
- [[03_External/topical/aac-npdp-framework.md]]
- [[04_Action/npdp-agenda-02-divergence-prevention.md]]
- [[04_Action/npdp-agenda-03-code-stability.md]]