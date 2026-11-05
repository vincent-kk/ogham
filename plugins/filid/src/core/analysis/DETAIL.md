# analysis contract

## Requirements

- 실제 의존성 DAG와 multi-consumer lowest common fractal을 계산한다.
- cycle은 placeholder가 아니라 실제 directed closed route를 증거로 낸다.
- 소유 subtree 안의 organ 참조는 edge로 보존하되 cycle adjacency에서 뺀다 — 승격 인공물은 런타임 순환이 아니다.
- 그래프를 만들 수 없는 파일이 결론에 영향을 줄 수 있으면 전체 결과가 `indeterminate`다.

## API Contracts

공개 함수와 DTO는 진입점에서 확인한다. 분석은 파일을 변경하지 않으며 owner 경계에 대한 증거를 사용한다.

## Acceptance Criteria

### AC-analysis-real-cycles — 증거 있는 순환

- 보고된 cycle이 실제 경로를 담으며 placeholder PASS가 없다.

### AC-analysis-lca — 소유 프랙탈 기준 LCA

- 소비자를 소유 프랙탈로 올린 뒤 교집합을 구하며 문자열 공통 prefix를 쓰지 않는다.

## Last Updated

실제 directed cycle, organ 참조의 adjacency 제외나 다중 소비자의 LCA 판정이 바뀔 때 갱신한다.
