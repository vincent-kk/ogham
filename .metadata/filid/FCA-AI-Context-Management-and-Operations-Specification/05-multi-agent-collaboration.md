## **5\. 다중 에이전트 협업 체계: 하위 에이전트(Sub-agent)의 역할, 스킬 및 도구 명세**

FCA-AI 아키텍처의 복잡한 맥락 관리와 코드 구현을 단일한 범용 AI 모델(Generalist)에게 전담시키는 것은 프롬프트 지시 사항 간의 충돌과 컨텍스트 윈도우 오버플로우를 유발한다.32 따라서 시스템은 계층형 다중 에이전트 아키텍처(HMAS) 원리에 따라, 특정 도메인과 도구에 특화된 '단기 하위 에이전트(Ephemeral Sub-agent)' 생태계를 동적으로 생성하고 오케스트레이션(Orchestration)한다.1

하위 에이전트들은 각자 메인 에이전트와 완벽히 분리된 \*\*고립된 컨텍스트 윈도우(Isolated Context Window)\*\*를 할당받아 작업을 수행하며, 임무가 완료되면 결과 데이터만을 반환하고 즉시 소멸하여 메인 작업 공간의 맥락 오염과 환각 누출을 구조적으로 차단한다.1 각 하위 에이전트는 부여받은 역할(Role)에 따라 접근할 수 있는 도구(Tools)와 보유한 스킬(Skills)이 엄격하게 제한된다.

| 에이전트 구분 | 주요 역할 및 책임 (Roles & Responsibilities) | 허용 도구 및 스킬 (Tools & Skills) | 작업 동작 및 운영 제약 |
| :---- | :---- | :---- | :---- |
| **Architect** (설계/계획자) | 요구사항 분석, 프랙탈 아키텍처 설계, SPEC.md 초안 작성 및 모듈 분할/압축 여부 판별 | Plan Mode 동작, MCP(Figma, 문서 서버 등), AST 구조 분석 스킬 | 파일 변경(Write/Edit) 권한이 영구 박탈된 읽기 전용 상태로 운영되며, 설계의 타당성 검토에 주력 35 |
| **Implementer** (구현자) | Architect가 승인한 SPEC.md의 제약 내에서 실제 코드를 작성하고 TDD 루프(작성-실행-수정)를 반복 | 터미널(Bash), 파일 편집(Write, Edit), Tree-sitter 렌더링 도구 | 승인된 명세를 벗어난 독단적인 아키텍처 변경이나 외부 프랙탈 영역 침투가 원천 금지됨 37 |
| **Context Manager** (맥락 관리자) | 프랙탈 순회 시 지식 그래프 구축, 인간의 수동 수정에 대한 AST 파싱, 문맥 역전파 및 가역적 압축/손실 요약 수행 | git diff, RAG 검색 도구, 텍스트 추상화 및 JSON 병합 스킬 | 애플리케이션의 비즈니스 로직에는 관여하지 않고, 오직 코드와 문서 계층 간의 상태 무결성 유지만 책임짐 38 |
| **QA / Reviewer** (품질/검토자) | 3+12 규칙 모니터링, LCOM4 및 순환 복잡도(CC) 계산, 보안 및 린트 검사, PR 검토 파이프라인 집행 | 정적 분석기(Linter), 회귀 테스트 프레임워크, 코드 커버리지 스캐너 | 직접 코드를 수정하지 않고, 오류를 감지하면 구체적인 실패 원인과 피드백 패킷을 Implementer에게 반환함 37 |

이러한 특화된 하위 에이전트 간의 통신은 문자열 텍스트 형태가 아니라 Agent-to-Agent(A2A) 프로토콜이나 MCP를 통해 구조화된 데이터 형태로 교환되므로, 전체 시스템은 하나의 교향악단처럼 조화롭게 구동된다.1

#### 참고 자료

1. FCA-AI 아키텍처 심층 리서치 및 해결 방안
32. Single-responsibility agents and multi-agent workflows in AI-powered development tools \- EPAM, 2월 21, 2026에 액세스, [https://www.epam.com/insights/ai/blogs/single-responsibility-agents-and-multi-agent-workflows](https://www.epam.com/insights/ai/blogs/single-responsibility-agents-and-multi-agent-workflows)
35. Create custom subagents \- Claude Code Docs, 2월 21, 2026에 액세스, [https://code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)
37. Build an AI Software Engineering Team using Claude Subagents in under 30 min for ANY project — part 1 | by Mateusz Kowalewski | Medium, 2월 21, 2026에 액세스, [https://awsomedevs.medium.com/complete-claude-team-of-agents-setup-for-software-engineers-and-pms-part-1-afc7aa4a02e1](https://awsomedevs.medium.com/complete-claude-team-of-agents-setup-for-software-engineers-and-pms-part-1-afc7aa4a02e1)
38. Claude Code \+ Step 3.5 Flash Best Practices Guide \- GitHub, 2월 21, 2026에 액세스, [https://github.com/stepfun-ai/Step-3.5-Flash/blob/main/cookbooks/claude-code-best-practices/README.en.md](https://github.com/stepfun-ai/Step-3.5-Flash/blob/main/cookbooks/claude-code-best-practices/README.en.md)
