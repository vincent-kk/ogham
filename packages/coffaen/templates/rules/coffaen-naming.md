---
rule_id: naming-convention
rule_name: 문서 명명 규칙
severity: warning
category: naming
auto_fix: partial
version: 1.0.0
---

# 문서 명명 규칙

## 목적

기억공간 내 문서의 일관된 명명 규칙을 강제한다.
검색 가능성과 자동화 호환성을 보장한다.

## 규칙 정의

### R1. 케밥케이스 파일명

모든 마크다운 문서는 케밥케이스(kebab-case)로 명명한다.

```
# 올바른 예
typescript-generics.md
react-hooks-guide.md
api-design-principles.md

# 위반 예
TypeScript_Generics.md    # PascalCase + 언더스코어
react hooks guide.md      # 공백 포함
apiDesignPrinciples.md    # camelCase
```

### R2. 영문 소문자 + 숫자 + 하이픈

파일명에 허용되는 문자: `a-z`, `0-9`, `-`
확장자는 `.md`만 허용한다.

```
# 올바른 예
01-getting-started.md
advanced-patterns-v2.md

# 위반 예
시작하기.md               # 한글 파일명
README.md                 # 대문자 (예외 항목)
notes.txt                 # .md 이외 확장자
```

### R3. 100줄 제한 경고

단일 문서가 100줄을 초과하면 분할을 권고한다.
지식 노드는 원자적(atomic)으로 유지하여 그래프 탐색 효율을 높인다.

```
⚠️ 문서가 100줄을 초과합니다 (현재: {lines}줄)
   대상: {path}
   분할을 고려하세요: /coffaen:organize 로 자동 분할 가능
```

### R4. 디렉토리명 규칙

Layer 하위 디렉토리는 케밥케이스로 명명한다.
Layer 루트 디렉토리는 `01_Core`, `02_Derived`, `03_External`, `04_Action` 고정.

```
# 올바른 예
02_Derived/programming/typescript-basics.md
03_External/book-notes/clean-code.md

# 위반 예
02_Derived/Programming/typescript-basics.md   # PascalCase 디렉토리
02_Derived/book_notes/clean-code.md           # 언더스코어
```

## 자동 수정

- **R1/R2 위반**: 파일명을 케밥케이스로 자동 변환 (사용자 확인 후)
- **R3 위반**: 자동 수정 불가, `/coffaen:organize` 스킬로 분할 안내
- **R4 위반**: 디렉토리명을 케밥케이스로 자동 변환 (사용자 확인 후)

## 예외

- `README.md`, `CHANGELOG.md`, `LICENSE.md` — 프로젝트 관례상 대문자 허용
- `.coffaen/`, `.coffaen-meta/` 내부 파일은 이 규칙에서 제외
- `index.md` — 인덱스 파일 허용
