---
created: 2026-03-01
updated: 2026-03-02
tags: [AAC, NPDP, I2I, AX-Native, methodology, product-development, aerodrome, ogham, albatrion]
layer: 3
sub_layer: topical
title: AAC NPDP - AI 중심 제품 개발 프로세스
source: Confluence:AAC (aacraft.atlassian.net), Slack:#general
---
# AAC NPDP - AI 중심 제품 개발 프로세스

## 개요
AAC(aacraft)는 AI 중심 제품 개발 조직. NPDP(New Product Development Process)는 기존 Agile/Waterfall을 대체하는 AX-Native 제품 개발 방법론.

## I2I (Intent-to-Impact) 프레임워크
핵심 철학: "인간의 의도(Intent)가 결과물(Artifact)로 바뀌는 저항을 최소화"

### Level 1: I2I (거시적 - 비즈니스 프레임워크)
| Phase | 내용 | 영역 |
|-------|------|------|
| Phase 1. Strategic Intent | 전략과 비전 | Discovery + Strategic Growth |
| Phase 2. Generative Loop | AI Centric 제품 개발 | Discovery + Delivery |
| Phase 3. Growth & Impact | 운영과 수익화 | Delivery + Operational Profit |

- **3R** (recursive requirement refining): Phase 1에서 요구사항을 반복 정제

### Level 2: NPDP (미시적 - 제품 개발 프로세스)
| Phase | 내용 | 변환 | 도구 |
|-------|------|------|------|
| Phase 1 | 요구사항 정의 및 시나리오 구체화 | 자연어 → 기획서 | TBD |
| Phase 2 | 아키텍처 및 로직 설계 | 기획서 → 설계도 | TBD |
| Phase 3 | Hi-Fi 프로토타이핑 및 코드 생성 | 설계도 → UI/코드 | aerodrome |
| Phase 4 | 검증 및 반복적 최적화 | UI/코드 QA → 배포 | aerodrome |

## AI 기반 개발 파이프라인
상위 기획서(Intent)를 AI에게 전달하면:
1. AI가 에픽 → 이슈 → 작업 → 부작업으로 작업 분해
2. 공통 기능 pruning (중복 제거)
3. 최종 개발 대상 구성
4. auto-pilot이 consume하여 자동 개발 수행

## 개발 도구 체계

### aerodrome (개발 프레임워크, by openclaw)
AI 기반 자동 개발을 수행하는 핵심 프레임워크.
- **auto-pilot**: AI 자동 개발 실행 엔진 (by claude code)
- **catapult**: (개발 보조 도구)
- **arresting wire**: (개발 보조 도구)

### albatrion (개발 보조 재사용 모듈)
lodash, schema-form, hook 등과 같은 재사용 가능한 모듈 패키지.
- **@canard**: 재사용 모듈
- **@lerx**: 재사용 모듈
- **@winglet**: 재사용 모듈
- **@slats**: 재사용 모듈

### lumy-pack (기타 개발 보조도구)

### ogham (Claude Code용 언어체계 plug-in)
전 Phase에 걸쳐 사용되는 Claude Code 플러그인. Phase 1~4 각각에 해당하는 언어체계를 제공.
- **@PM**: coffisen
- **@개발**: ohmyclaudecode
- **@QA**: filid (코드 문서화 + AI 기반 코드 안정장치 역할)

## AX-Native PRD Template
AI 시대의 기획 문서 템플릿 (= "Intent"). 4단계 구성:
1. **Strategic Intent** — 문제 정의, 비즈니스 임팩트 (Human Only)
2. **AI Generation Context** — 핵심 Flow, AI 가드레일/제약조건 설정 (Human→AI)
3. **Generative Output & Audit** — AI 결과물 검수, 가상 유저 테스트 (AI→Human)
4. **Autonomous Impact & Ops** — 자동 배포, 임팩트 측정 (System)

## 기존 방법론과의 차이
| 구분 | 종전 (Agile/Lean) | AX-Native |
|------|------------------|-----------||
| 중심축 | 프로세스와 협업 | 의도와 결과 |
| 워크플로우 | 순차/반복적 | 동시발생적 |
| 핵심 스킬 | 도구 숙련도 | 프롬프팅, 검수 |
| 속도 단위 | 주(Weeks) 스프린트 | 시간/분 루프 |
| 성패 결정 | 실행력 | 질문력 |