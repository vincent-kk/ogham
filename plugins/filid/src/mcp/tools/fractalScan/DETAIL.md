# fractalScan — Filid 1.0 Contract

## Requirements

- `fractal_scan`은 등록 adapter로 하나의 `ProjectSnapshot`을 만들고 FCA tree 요약을 반환한다.
- 기본 detail은 `summary`이며 대형 tree를 inline하지 않는다.
- `paths`는 node path와 type·document·entry point 상태를 반환하고 `full`은 공통 envelope 예산을 따른다.
- `maxDepth`는 config의 max-depth **규칙 임계값**을 덮어쓸 뿐 탐색 한계가 아니다. tree는 언제나 완전 탐색하므로 이 값을 낮추면 노드 수는 그대로인 채 depth 규칙 위반만 늘어난다. root 밖 path는 허용하지 않는다.
- unsupported 또는 ambiguous adapter evidence를 diagnostics와 status에 보존한다.
- scan은 project source와 config를 변경하지 않는다.

## API Contracts

```ts
interface FractalScanInput {
  path: string;
  maxDepth?: number;
  detail?: 'summary' | 'paths' | 'full';
}
```

- summary는 project root, snapshot hash, node counts, violation counts, certainty와 adapter IDs를 포함한다.
- paths data는 정규화된 절대 node path와 분류 근거를 포함한다.
- full data는 snapshot/tree 증거를 포함하되 16 KiB를 넘으면 artifact로만 전달된다.
- 반환은 `ToolResultEnvelope`를 사용하며 별도 scan-specific report file 형식을 만들지 않는다.

## Acceptance Criteria

### AC-scan-summary — 작은 기본 응답

- detail 생략 시 전체 node 배열이 inline data에 포함되지 않는다.
- node 수와 status는 artifact 유무와 관계없이 summary에서 확인할 수 있다.

### AC-scan-evidence — adapter 증거

- 미지원 파일과 동률 adapter claim은 PASS로 숨겨지지 않는다.
- 동일 snapshot을 structure validation과 context resolution이 재사용할 수 있다.

### AC-scan-read-only — 비변경

- scan 전후 project file tree와 config byte content가 같다.

## Last Updated

2026-07-28 — depth 입력을 `maxDepth`로 개명하고 규칙 임계값이라는 의미를 계약에 명시했다.
