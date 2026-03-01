## **6\. 자율형 PR 생성 및 다차원 평가(Evaluation) 규칙 체계**

다중 에이전트 시스템이 생산해낸 코드와 수정된 맥락 문서를 메인 브랜치에 안전하게 병합하기 위해, FCA-AI는 매 커밋 단계의 동기화가 아닌 풀 리퀘스트(Pull Request, PR) 시점의 일괄 동기화(Batch Sync)를 강제한다.1 매번 컨텍스트를 동기화하는 것은 시스템 리소스 낭비이자 일시적 오류가 문맥에 스며드는 원인이 되기 때문이다.1 PR이 생성되면, 시스템은 인간 검토자가 개입하기 전에 엄격한 6단계의 자율 검증 및 평가(Evaluation) 체크리스트를 실행한다.42

1. **사전 검토 자동화 게이트 (Pre-Review Automated Gates):** 문법적 오류, 기본적인 린트(Lint) 위반, 명백한 타입 에러를 결정론적 도구(예: ruff, mypy 등)를 통해 즉각 필터링하여 인지적 낭비를 막는다.42
2. **맥락 및 의도 무결성 검증 (Codebase Context Analysis):** QA/Reviewer 에이전트가 AST 기반 Diff를 생성하여, 변경된 구현체가 SPEC.md의 기능 명세와 CLAUDE.md의 3계층 경계 원칙(Always/Ask/Never)을 완벽히 준수했는지 LLM-as-Judge 방식으로 평가한다.6
3. **테스트 및 정책 강제 (Policy and Standards Enforcement):** 새로 도입된 로직에 대한 .spec.ts 테스트가 100% 통과하는지, 그리고 해당 프랙탈의 테스트 케이스가 3+12 규칙(15개 임계값)을 초과하여 분할/압축 리팩토링이 필요한 것은 아닌지를 검사한다.1 더불어 하드코딩된 비밀 키 등 보안 위반 사항을 스캔한다.40
4. **문서 압축률 및 동기화 커버리지 확인:** 코드가 수정된 만큼 관련된 모든 상/하위 프랙탈의 CLAUDE.md 및 SPEC.md가 가역적 압축을 거쳐 최신화되었는지 상태 일치 여부를 검증한다.1
5. **리스크 기반 분류 및 라우팅 (Risk Classification and Routing):** 에이전트 내부의 예측 모델이 판단한 확신도가 임계값 미만이거나, 데이터베이스 스키마와 같은 핵심 도메인이 변경된 고위험 PR의 경우, 즉각 수동 검토 플래그를 부착하여 시니어 인간 개발자에게 알림을 발송(Routing)한다.42
6. **결과 요약 및 승인 기록 (Auditability and Merge Decision):** 모든 단계가 성공적으로 통과되면, 에이전트는 PR 설명란에 변경 사항에 대한 요약, 구조적 다이어그램, 테스트 및 문서 갱신 로그를 마크다운 형식으로 작성하여 감사(Audit) 트레일을 확립한다.24

이러한 다차원 평가 파이프라인은 PR의 검토 시간을 며칠에서 단 몇 시간 수준으로 압축하며, 인간 개발자가 단순한 오타 검증이 아닌 고차원적인 아키텍처 의사결정에만 집중할 수 있게 한다.46

#### 참고 자료

1. FCA-AI 아키텍처 심층 리서치 및 해결 방안
6. How to write a good spec for AI agents \- Addy Osmani, 2월 21, 2026에 액세스, [https://addyosmani.com/blog/good-spec/](https://addyosmani.com/blog/good-spec/)
24. Automate Multi-File Code Refactoring With AI Agents: A Step-by-Step Guide, 2월 21, 2026에 액세스, [https://www.augmentcode.com/learn/automate-multi-file-code-refactoring-with-ai-agents-a-step-by-step-guide](https://www.augmentcode.com/learn/automate-multi-file-code-refactoring-with-ai-agents-a-step-by-step-guide)
40. VoltAgent/awesome-claude-code-subagents \- GitHub, 2월 21, 2026에 액세스, [https://github.com/VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
42. How to Build an AI-Powered Pull Request Review That Scales With Development Speed?, 2월 21, 2026에 액세스, [https://www.qodo.ai/blog/ai-pull-request-review/](https://www.qodo.ai/blog/ai-pull-request-review/)
46. AI Agent Workflow Implementation Guide for Dev Teams \- Augment Code, 2월 21, 2026에 액세스, [https://www.augmentcode.com/guides/ai-agent-workflow-implementation-guide](https://www.augmentcode.com/guides/ai-agent-workflow-implementation-guide)
