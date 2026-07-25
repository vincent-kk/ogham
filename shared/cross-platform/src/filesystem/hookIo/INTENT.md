## Purpose

기존 hook의 일반 UTF-8 쓰기와 sibling 백업 의미를 최소 import graph로 보존한다.

## Structure

- `index.ts`: read/write/copy 이름 있는 공개 배럴.
- `operations/`: Node 시스템 호출 하나씩을 소유하는 organ.

## Conventions

- 판단 우선순위: 1. 기존 hook 호환성 2. 번들 크기 3. 범용성.
- ENOENT 판독만 `null`로 낮추며 write/copy 오류는 그대로 전달한다.

## Boundaries

### Always do

- hook bundle이 실제로 필요한 일반 write/copy만 노출한다.
- 각 시스템 호출 함수를 별도 파일에 둔다.

### Ask first

- hook 호환 외 새 mutation 추가.

### Never do

- 범용 artifact apply에서 atomic write·lock 대신 사용.
- 잠금이나 리비전 보장을 암묵적으로 제공한다고 표현.

## Dependencies

- 내부: `filesystem/read`.
- 외부: Node `fs`.
