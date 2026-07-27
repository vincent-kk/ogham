# lcaCalculator — multi-consumer lowest common fractal

## Purpose

파일·디렉터리 소비자를 소유 프랙탈로 올린 뒤 모든 owner가 공유하는 가장
깊은 fractal을 계산한다.

## Structure

| Path                           | Role                                          |
| ------------------------------ | --------------------------------------------- |
| `lcaCalculator.ts`, `index.ts` | named public barrel                           |
| `resolveOwningFractal.ts`      | portable file/directory owner 해석            |
| `findLowestCommonFractal.ts`   | 모든 owner ancestor 교집합 계산               |

## Conventions

- 판단 우선순위: 1. portable path identity 2. 모든 소비자 교집합 3. 깊이.
- owner chain은 `parentFractalPath`를 따라가며 organ을 LCA로 선택하지 않는다.
- 알 수 없는 consumer가 하나라도 있으면 임의 root fallback 대신 null이다.

## Boundaries

### Always do

- 소비자 path를 현재 host와 무관하게 정규화·비교
- 반환 path는 snapshot tree에 저장된 canonical machine path 사용
- tree를 읽기 전용으로 유지

### Ask first

- owner 또는 fractal 선택 우선순위 변경
- owner 또는 LCA 반환 DTO 변경

### Never do

- 문자열 prefix나 host-native path만으로 containment 판정
- organ, pure-function 또는 hybrid를 lowest common fractal로 반환
- 존재하지 않는 consumer를 root가 소유한다고 추측

## Dependencies

- `../../../types/fractal.js`, `../../../constants/`, `@ogham/cross-platform`
