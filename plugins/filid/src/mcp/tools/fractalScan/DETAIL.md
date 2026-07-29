# fractalScan — Filid 1.0 Contract

## Requirements

- `fractal_scan`은 등록 adapter로 하나의 `ProjectSnapshot`을 만들고 FCA tree 요약을 반환한다.
- 기본 detail은 `summary`이며 대형 tree를 inline하지 않는다.
- `paths`는 node path와 type·document·entry point 상태를 반환하고 `full`은 공통 envelope 예산을 따른다.
- export 이름은 `nameFilter`로 좁힌 `paths` 투영에서만 반환한다. 이름은 node당 응답을 약 4분의 1 키우므로, 넓은 스캔에 실으면 작은 기본 응답이라는 이 도구의 약속이 깨진다. 이름이 필요한 질의는 본래 좁은 질의다.
- 좁힌 투영에서도 어댑터가 검사하지 않은 node는 필드를 생략해 "이름 없음"과 "검사 안 함"을 구분한다.
- `nameFilter`는 node 이름 완전 일치로 `paths` 투영을 좁힌다. summary count는 필터와 무관하게 전체 tree를 설명한다.
- `nameFilter`가 있으면 diagnostics도 살아남은 node 범위로 좁히고 제외 건수를 summary에 보고한다. 좁은 질의의 답이 프로젝트 크기의 payload 뒤에 실려 나가지 않게 하는 장치다.
- `maxDepth`는 config의 max-depth **규칙 임계값**을 덮어쓸 뿐 탐색 한계가 아니다. tree는 언제나 완전 탐색하므로 이 값을 낮추면 노드 수는 그대로인 채 depth 규칙 위반만 늘어난다. root 밖 path는 허용하지 않는다.
- unsupported 또는 ambiguous adapter evidence를 diagnostics와 status에 보존한다.
- scan은 project source와 config를 변경하지 않는다.

## API Contracts

```ts
interface FractalScanInput {
  path: string;
  maxDepth?: number;
  detail?: 'summary' | 'paths' | 'full';
  nameFilter?: string;
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

### AC-scan-entry-names — 진입점 export 이름

- `nameFilter`가 없는 `paths` 투영은 export 이름을 담지 않는다. node key 집합이 필터 도입 전과 같다.
- `nameFilter`가 있으면 표면이 검사된 node가 중복 없는 export 이름 목록을 담는다.
- 검사되지 않은 node는 필드를 생략하고, 검사되었으나 이름이 없는 node는 빈 배열을 담는다.

### AC-scan-name-filter — 이름 필터

- `nameFilter`는 node 이름 완전 일치로 `paths` 투영의 node를 좁힌다.
- 필터가 아무 node도 남기지 않으면 빈 목록이며 오류가 아니다.
- summary의 node count와 violation count는 필터와 무관하게 전체 tree를 설명한다.
- 필터가 있으면 살아남은 node 밖 경로를 가진 diagnostic을 제외하고 그 수를 `diagnosticsOutOfScope`로 보고한다. 필터가 없으면 이 필드가 없고 diagnostics는 그대로다.

### AC-scan-read-only — 비변경

- scan 전후 project file tree와 config byte content가 같다.

## Last Updated

2026-07-29 — `paths` 투영에 진입점 export 이름과 node 이름 필터를 추가했다.
