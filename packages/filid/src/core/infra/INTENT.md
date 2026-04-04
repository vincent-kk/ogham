# infra -- 인프라 모듈

## Purpose

캐시 관리, 프로젝트 해시, 변경 큐, 설정 로더 등 FCA-AI 인프라 기능을 제공한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `cache-manager` | 세션/프롬프트 캐시, 프랙탈 맵 관리 |
| `project-hash` | 프로젝트 구조 해시 계산 |
| `change-queue` | 변경 기록 큐 |
| `config-loader` | `.filid/config.json` 로딩 및 프로젝트 초기화 |

## Boundaries

### Always do
- 캐시 파일은 `getCacheDir()` 경로에만 저장

### Ask first
- 캐시 디렉토리 구조 변경

### Never do
- 프로젝트 소스 코드 직접 수정

## Dependencies
- `../../lib/`, `../../types/`
