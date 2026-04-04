# content-dedup

## Purpose

문서 콘텐츠 중복 제거. frontmatter 자동 생성 키 기반 필터링.

## Boundaries

### Always do

- yaml-parser 재사용
- AUTO_GENERATED_FM_KEYS 참조

### Ask first

- 중복 판정 기준 변경

### Never do

- 원본 콘텐츠 손실 가능한 변환
