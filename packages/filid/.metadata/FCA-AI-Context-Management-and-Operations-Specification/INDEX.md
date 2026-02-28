# 프랙탈 컨텍스트 아키텍처(FCA-AI) 기반 자율형 소프트웨어 공학: 다중 에이전트 시스템의 맥락 관리 및 운영 명세 심층 분석

## 요약

본 문서는 AI 에이전트를 위한 프랙탈 컨텍스트 아키텍처(FCA-AI)를 기반으로 작동하는 다중 에이전트 시스템의 맥락 관리 및 운영 명세를 심층 분석한다. 컨텍스트 부패(Context Rot) 문제를 극복하기 위해 코드베이스를 프랙탈 단위로 구획하고, CLAUDE.md·SPEC.md 문서, AST 기반 동기화 파이프라인, 테스트 수명 주기 관리, 다중 에이전트 협업 체계, 자율형 PR 평가 규칙, 사용자 질의 프로토콜 등 핵심 메커니즘 전반을 포괄적으로 다룬다.

## 목차

- [서론](./00-introduction.md) — LLM 컨텍스트 윈도우 한계와 FCA-AI 아키텍처의 등장 배경 및 보고서 범위 소개
- [§1 프랙탈 구획화 및 맥락 문서의 형태와 구조적 제약](./01-fractal-partitioning-and-context-documents.md) — 프랙탈/부속품 계층 분리 원칙과 CLAUDE.md·SPEC.md의 역할, 구조, 관리 기법 상세 분석
- [§2 테스트 주도 아키텍처와 3+12 규칙에 따른 승격(Promotion) 로직](./02-test-driven-architecture-and-promotion.md) — 3+12 규칙 기반 복잡도 통제 알고리즘과 회귀 테스트 수명 주기 관리 및 승격 메커니즘
- [§3 초기 맥락 구축을 위한 대규모 프랙탈 순회 및 조립 전략](./03-initial-context-traversal-strategy.md) — 위상 정렬 기반 의존성 우선 순회 전략과 MCP를 활용한 기업 아키텍처 연동
- [§4 수동 코드 수정에 대응하는 AST 기반 맥락 문서 동기화 기술](./04-ast-based-context-synchronization.md) — Tree-sitter 기반 의미론적 Diff 분석과 문맥 역전파를 통한 자율적 문서 동기화
- [§5 다중 에이전트 협업 체계: 하위 에이전트의 역할, 스킬 및 도구 명세](./05-multi-agent-collaboration.md) — Architect·Implementer·Context Manager·QA Reviewer 등 특화 에이전트 역할 분담 체계
- [§6 자율형 PR 생성 및 다차원 평가(Evaluation) 규칙 체계](./06-autonomous-pr-evaluation.md) — PR 시점 일괄 동기화 강제와 6단계 자율 검증 파이프라인 상세
- [§7 사용자 인터랙티브 질의 프로토콜 및 SPEC 업데이트 제어 기술](./07-user-interactive-query-protocol.md) — 능동적 학습 기반 객관식 질의 프로토콜과 3-Prompt Limit 메커니즘
- [결론](./08-conclusion.md) — FCA-AI 아키텍처의 핵심 가치와 자율형 소프트웨어 공학의 미래 전망
