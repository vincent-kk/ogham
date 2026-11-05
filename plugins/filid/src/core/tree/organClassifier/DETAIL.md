# organClassifier — Contract

## Requirements

- 문서가 있으면 explicit fractal 선언이 모든 자동 convention보다 우선한다.
- configured known organ name과 infrastructure pattern은 entry point보다 우선한다.
- leaf directory는 organ이고 non-leaf proven-pure directory만 pure-function 후보가 된다.

## API Contracts

- 분류는 순수 metadata 판정이며 filesystem이나 생태계 파일명을 해석하지 않는다.
- entry descriptor는 adapter가 소유하는 증거이므로 classifier가 이름 규칙을 복제하지 않는다.

## Acceptance Criteria

### AC-classification-priority — override 순서

- 분류 우선순위와 기본 분류는 table test가 고정한다.
- organ 안의 descendant는 독립 입력으로 다시 분류할 수 있다.

### AC-classification-neutrality — 생태계 중립

- classifier 입력과 구현에 특정 entry filename/extension이 없다.

## Boundary Exemptions

### organClassifier.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

문서·organ·module 증거의 분류 우선순위, purity 한계나 훅 번들 면제가 바뀔 때 갱신한다.
