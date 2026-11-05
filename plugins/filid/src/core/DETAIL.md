# core — Filid 1.0 Contract

## Requirements

- core는 등록된 어댑터의 증거로 언어 중립 `ProjectSnapshot`을 만든다.
- snapshot은 FCA tree, 실제 dependency graph, verification analysis, adapter ID와 content-derived hash를 함께 가진다.
- 노드는 문서, organ convention, 어댑터 entry point, leaf와 purity 증거 순서로 fractal/organ/pure-function을 분류한다. hybrid는 자동 분류하지 않는다.
- INTENT 50줄·3-tier와 DETAIL 필수 섹션·acceptance group을 검증한다.
- 15개 built-in rule은 문서, 노드, entry point, boundary, DAG, verification, legacy criteria migration 증거만 평가한다.
- context resolution은 owner에서 root까지 문서 경로만 반환하고 본문을 복제하지 않는다.
- placement는 소비자 owner의 lowest common fractal을 사용해 읽기 전용 move plan과 pre/postcondition을 만든다.
- 불확실한 adapter 분석은 `indeterminate` 또는 `unsupported`이며 PASS가 아니다.
- core는 특정 언어 파일명·확장자·framework·테스트 호출 리터럴을 포함하지 않는다.
- core는 에이전트가 제출한 파일별 사실을 보관한다. 소스 파일은 hash 계산과 문자열 존재 확인에만 byte로 읽고 구문으로 해석하지 않으며, 어떤 명령도 실행하지 않는다. 계약은 `facts/DETAIL.md`에 있다.

## API Contracts

- facts 표면(`computeResolutionEpoch`, `validateFactsRecord`, `classifyFactsFile`, `selectUnknownFiles`, 저장소 접근자)은 `core/facts` entry point가 소유한다.

## Acceptance Criteria

### AC-core-neutrality — 생태계 중립

- 새 생태계는 adapter 등록만으로 추가되고 core type, policy와 MCP DTO는 바뀌지 않는다.
- 초기 생태계의 확장자·진입점·호출 문법 리터럴이 core에 없다.

### AC-core-evidence — 실제 증거

- content 변경은 snapshot hash를 바꾸며 mtime만으로 결과를 만들지 않는다.
- 실제 dependency cycle과 외부 internal import를 증거 경로와 함께 찾는다.
- unresolved evidence가 결론에 영향을 주면 PASS 대신 indeterminate다.

### AC-core-placement — 읽기 전용 배치

- multi-consumer LCA, 공개 계약과 decision 필요 여부가 exact move plan에 반영된다.
- plan 생성은 project tree를 변경하지 않고 pre/postcondition이 이탈을 검출한다.

## Last Updated

snapshot 증거의 소유권, 생태계 중립성, 불확실성 판정이나 읽기 전용 배치 계획 계약이 바뀔 때 갱신한다.
