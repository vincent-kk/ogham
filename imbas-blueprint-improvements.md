# imbas Blueprint v1.1 논리적 검증 및 개선 제안

> `imbas` 플러그인의 상태 머신을 배제한 File I/O 기반의 멱등성 보장과 역할 분리(Analyst, Planner, Engineer, Media) 아키텍처는 매우 견고하게 설계되어 있습니다. 이 문서는 시나리오 검증 과정에서 도출된 논리적 엣지 케이스(Edge Case)를 보완하기 위한 핵심 개선 사항을 정리합니다.

## 1. Phase 3 (`devplan`) - 구현 불가능(Blocked) 리포트 경로 신설

*   **상황 및 문제**: Phase 3 단계에서 `imbas-engineer`가 코드베이스를 탐색(`read_file`, `grep_search` 등)하던 중, 기획을 구현하기 위해 선행되어야 할 핵심 종속성이 누락되거나 구조적 제약을 발견할 수 있습니다. 현재 Blueprint 설계상 Phase 3의 결과물은 `devplan-manifest.json` 생성에 집중되어 있어, 진행이 불가능한 상황에 대한 명확한 탈출 경로가 모호합니다.
*   **개선 제안**: Phase 1(`validate`)과 마찬가지로, `devplan` 스킬에도 억지로 실행 불가능한 가짜 Task를 만들지 않도록 **중단 및 차단 리포트(Blocked Report) 반환**이라는 명시적인 탈출 경로(Escape Route)를 정의해야 합니다. (예: `devplan-blocked-report.md` 생성 및 조기 종료)

## 2. Phase 4 (`manifest`) - 멱등성 보장을 위한 단건 처리 즉시 저장 (Unit Save to Disk)

*   **상황 및 문제**: `manifest` 단계는 설계 3.2항에 따라 매니페스트 자체의 `status` + `jira_key` 필드로 멱등성과 장애 복구를 보장합니다. 하지만 일괄 티켓 생성 중(예: 10개 중 4개째 생성) 네트워크 단절이나 스크립트 중단 시, 파일에 기록하지 않았다면 이미 생성된 티켓의 ID가 매니페스트에 남지 않습니다. 재실행 시 티켓 중복 생성이 발생할 위험이 있습니다.
*   **개선 제안**: `manifest` 스킬 코드 구현 시 루프 종료 후 한 번만 저장하는 것이 아니라, 각 이슈/서브태스크에 대한 외부 API(Jira/GitHub) 호출이 성공할 때마다 즉시 해당 매니페스트 JSON 파일을 디스크에 덮어쓰기(Write) 하도록 강제해야 합니다.

## 3. Phase 2 & 3 (`split`, `devplan`) - 원본(source.md) 참조를 통한 컨텍스트 유실 방지

*   **상황 및 문제**: Blueprint의 8대 원칙 중 "앵커 체인(검증된 직전 상위만 참조)"은 의존성을 분리하는 데 유용하지만, 도메인 컨텍스트 유실(Context Loss)을 유발할 수 있습니다. 예를 들어, `planner`가 기획서 원본이 아닌 Phase 1의 `validation-report.md`**만** 보고 스토리를 분할할 경우 기획적 배경(Why)이나 미묘한 뉘앙스가 누락될 수 있습니다.
*   **개선 제안**: `.imbas/.../runs/<ID>/source.md` (원본 복사본)가 존재하므로, `planner`와 `engineer` 에이전트에게 직전 단계의 산출물(Manifest/Report)을 기본 지시서(Primary Anchor)로 제공하되, 원본 기획 문서(`source.md`)를 읽기 전용 참조 컨텍스트(Read-only Reference)로 프롬프트에 함께 제공하여 논리적 비약을 막아야 합니다.

## 4. Phase 1 (`validate`) - 테스트 가능성(Testability) 강제 품질 게이트 설정

*   **상황 및 문제**: Blueprint 2.1항에 `EARS/INVEST/Given-When-Then 가이드`가 명시되어 있으나, 원본 기획 문서(`feature.md`)에 인수 조건(Acceptance Criteria)이 명확하지 않은 경우가 많습니다. Phase 1이 기능적 모순만 검증하고 통과시키면, 이후 에이전트들이 임의로 테스트 시나리오를 지어내거나(Hallucination) 모호한 Subtask를 생성하게 됩니다.
*   **개선 제안**: `imbas-analyst`의 검증 프롬프트에 **"명확하고 테스트 가능한 인수 조건(BDD/Given-When-Then 등)의 존재 여부"**를 필수 통과 조건(Quality Gate)으로 강제해야 합니다. 인수 조건이 부실할 경우 Phase 1에서 반려(Reject)하고 기획자에게 보완을 요구해야 합니다.

## 5. Phase 2 (`split`) - Story 간의 실행 의존성(`blocks`) 매핑 허용

*   **상황 및 문제**: Blueprint 7.2항(링크 타입)을 보면 `blocks` (is blocked by) 관계는 Phase 3의 **Story ↔ Task** 간에만 정의되어 있습니다. 거대한 기획이 여러 Story("API 개발", "UI 개발")로 분할될 경우, API가 UI보다 먼저 개발되어야 하는 의존성이 발생하지만 현재 설계는 이를 묶어주지 못합니다.
*   **개선 제안**: `imbas-planner`가 `stories-manifest.json`을 생성할 때, 분할된 **Story 간의 선후 관계(`blocks` / `is blocked by`)**도 스스로 판단하여 매니페스트에 명시할 수 있도록 권한을 확장해야 합니다. 이를 통해 Jira 백로그가 실행 가능한 순서(Topological Sort)로 적재될 수 있습니다.

## 6. Phase 4 (`manifest`) - 원격 상태 변경(Drift) 감지 및 조정(Reconciliation)

*   **상황 및 문제**: 매니페스트(`status: created`)를 기반으로 멱등성을 보장하는 구조이나, Jira/GitHub은 다중 사용자 환경입니다. `imbas`가 티켓을 생성한 후 누군가 웹에서 티켓을 삭제하거나 상태를 변경하면 로컬 매니페스트와 원격 상태 간에 괴리(State Drift)가 발생합니다.
*   **개선 제안**: 일괄 실행 전이나 별도 스킬(예: `/imbas:sync`)을 통해, 매니페스트에 기록된 `jira_key`들의 현재 원격 상태를 1회 Fetch(조회)하여 불일치(Drift)가 발견되면 사용자에게 경고하고 매니페스트를 동기화(Reconcile)하는 로직이 필요합니다.

## 7. Phase 4 (`manifest`) - 대화형 Dry-Run 및 최종 승인(Approval) 단계 도입

*   **상황 및 문제**: Blueprint 3.3항에 "dry-run 지원"이 언급되어 있으나, `/imbas:manifest` 실행 시 수십 개의 이슈와 링크가 한 번에 Jira에 쏟아지는 방식은 실수가 발생했을 때 되돌리기(Undo)가 매우 까다롭습니다.
*   **개선 제안**: `/imbas:manifest` 명령어는 기본적으로 **항상 Dry-Run 모드**로 동작하여 생성될 티켓 수, 링크 수 등의 **요약 테이블(Summary Table)**을 터미널에 먼저 출력해야 합니다. 그 후 사용자에게 CLI 프롬프트(예: `진행하시겠습니까? [y/N]`)로 명시적인 최종 승인을 받은 직후에만 실제 API 쓰기 작업이 수행되도록 안전 장치(Safety Catch)를 마련해야 합니다.
