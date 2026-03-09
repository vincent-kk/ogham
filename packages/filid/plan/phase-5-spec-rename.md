# Phase 5: SPEC.md → DETAIL.md + 스키마 재설계

> 상태: Phase 1 완료 후 착수 가능 (독립 경로)

## 목표

FCA 문서의 두 번째 파일인 `SPEC.md`를 `DETAIL.md`로 리네이밍하고,
`SpecMdSchema`를 DETAIL.md의 실제 역할에 맞게 재설계한다.

## 선행 조건

- Phase 1 완료 (INTENT.md 이름 확정)
- Phase 2-4와는 독립적 (병렬 진행 가능)

## 핵심 문제: 스키마 의미 충돌

현재 `SpecMdSchema`:
```typescript
interface SpecMdSchema {
  title: string;
  requirements: string[];     // ← "사양" 성격
  apiContracts: string[];     // ← "사양" 성격
  lastUpdated: string;
  compressionMeta?: CompressionMeta;
}
```

PLAN.md에서 DETAIL.md의 역할:
- "경로 힌트만" 제공하는 경량 문서

→ `requirements`, `apiContracts`는 "경로 힌트"가 아니라 정식 기술 사양.
이름만 바꾸면 `DetailMdSchema.requirements`라는 무의미한 조합이 됨.

## 결정 필요: DETAIL.md의 정체성

| Option | 설명 |
|--------|------|
| A. 경량 힌트 | DETAIL.md = 경로/참조 힌트만. 스키마를 `{ references: string[], notes?: string }` 수준으로 축소 |
| B. 상세 문서 | DETAIL.md = 모듈의 상세 기술 사양. 현재 스키마 유지하되 이름만 변경 |
| C. 역할 분리 | DETAIL.md = 자유 형식 마크다운. 스키마 검증 제거하고 내용만 경로 힌트로 제공 |

## 범위 (결정 후)

- ~60 파일, ~260 참조 (SPEC.md 계열)
- Phase 1과 동일한 5단계 패턴 (타입→코어→테스트→문서→빌드)

## 산출물

- `DetailMdSchema` 타입 정의 (또는 스키마 제거)
- 코드/문서 전체 SPEC.md → DETAIL.md 치환
- PLAN.md 내 DETAIL.md 언급과의 일관성 확보
