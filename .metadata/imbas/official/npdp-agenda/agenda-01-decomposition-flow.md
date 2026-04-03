---
created: 2026-03-18
updated: 2026-03-18
tags: [NPDP, architecture, decomposition, PL-agenda]
layer: 4
title: NPDP 핵심 고민 — 기획서→단위기능 분해 Flow
expires: 2026-04-15
---
# NPDP 핵심 고민 — 기획서→단위기능 분해 Flow

## 문제 정의

NPDP Phase 2 영역. 상위 기획서(Intent)를 단위 기능으로 분해하는 과정의 **구체적 방법론**을 설계해야 한다.

현재 NPDP 문서에는 "에픽 → 이슈 → 작업 → 부작업 분해 → 공통 기능 pruning → 최종 개발 대상 구성"이라는 What만 있고, How가 부재.

## PL로서 답해야 할 핵심 질문

### 통제 가능성
- 분해 과정에서 **인간이 통제하는 게이트**는 어디에 두는가?
- 완전 자동 vs 단계별 승인 — 어느 지점에서 인간이 개입하는 것이 최적인가?
- 분해 깊이(depth)의 기준은 무엇인가?

### 중복 기능의 일원화
- 중복 기능을 어떤 기준으로 감지하는가? (이름 기반? 의미 기반? 인터페이스 기반?)
- albatrion의 @canard/@lerx/@winglet/@slats와 어떻게 연결하는가?
- 기존 재사용 모듈과 신규 기능의 경계를 누가 판단하는가?

### 인터페이스 기반의 다형성
- 공통 인터페이스를 **누가 정의**하는가? (인간 선언→AI 구현? AI 제안→인간 승인?)
- 인터페이스 계약(contract)을 AI가 위반하지 않도록 어떻게 강제하는가?
- 다형성의 범위 — 컴포넌트 레벨? 서비스 레벨? API 레벨?

## 현재 상태
- [ ] 통제 게이트 포인트 정의
- [ ] 중복 감지 기준 확립
- [ ] 인터페이스 정의 주체와 프로세스 설계

## Related
- [[03_External/topical/aac-npdp-framework.md]]
- [[03_External/topical/aac-project-ecosystem.md]]