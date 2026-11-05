# lcaCalculator — Contract

## Requirements

- file 또는 directory consumer를 snapshot tree의 가장 깊은 소유 node로 해석한다.
- organ과 pure-function의 owner는 `parentFractalPath`이며 fractal은 자신이 owner다.
- multi-consumer LCA는 pairwise 후보가 아니라 모든 owner ancestor chain의 교집합에서 가장 깊은 `fractal`이다.
- Windows drive/UNC와 POSIX path의 separator·case 의미를 현재 host와 독립적으로 보존한다.

## API Contracts

- 알 수 없는 consumer가 하나라도 있으면 임의 root로 대체하지 않는다. 누락된 owner를 추정하면 잘못된 공통 배치를 확정하게 된다.
- 반환 경로는 snapshot의 canonical 경로이며 host별 문자열 prefix로 ownership을 추정하지 않는다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Last Updated

소비자 owner의 공통 조상 판정, 미확정 owner 처리나 portable path identity가 바뀔 때 갱신한다.
