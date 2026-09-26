# Vault Dashboard

`craft-dashboard` 로 생성된 개인 vault 대시보드입니다. Fastify(백엔드) + Vite/React 19(프런트엔드) 워크스페이스로 구성됩니다.

## 디렉토리 구조

```
.
├── dashboard-spec.json    # 인터뷰 결과 (MUTATE 모드의 입력)
├── backend/               # Fastify + chokidar + Fuse.js
└── frontend/              # Vite + React 19 + TanStack Query + Recharts
```

## 설치

```bash
make install
```

## 실행

### 프로덕션 모드 (권장)

```bash
make serve
```

빈 포트를 `5174` 부터 자동 탐색해 bind 하고(점유 시 `5175`, `5176` … 으로 자동 이동), 브라우저를 자동으로 엽니다. 실제 바인딩된 포트와 URL 은 `.dashboard-runtime.json` 에 기록됩니다. 프런트엔드 정적 자산은 `backend/app/static/` 에 빌드됩니다.

생성 시 vault 실행 skill 을 만들었다면 `/run-<name>` 으로도 동일하게 실행됩니다.

### 개발 모드 (HMR + autoreload)

```bash
# 터미널 1
make dev-backend
# 터미널 2 (dev-backend 를 먼저 띄운 뒤)
make dev-frontend
```

Vite 가 브라우저를 자동으로 엽니다. `dev-frontend` 는 백엔드가 기록한 `.dashboard-runtime.json` 을 읽어 `/api` proxy 대상 포트를 자동 정렬합니다(백엔드가 `5174` 외 포트로 이동했어도 따라갑니다). Vite 포트 `5173` 이 점유 중이면 다음 빈 포트로 자동 이동합니다.

## 환경 변수

| 변수                 | 기본          | 설명                                                                   |
| -------------------- | ------------- | ---------------------------------------------------------------------- |
| `VAULT_ROOT`         | 부모 디렉토리 | vault 절대 경로                                                        |
| `VAULT_INDEX`        | `maencof`     | `maencof` (`.maencof/*.json` read-only) 또는 `independent` (fast-glob) |
| `PORT`               | `5174`        | 백엔드 선호 포트 (점유 시 다음 빈 포트로 자동 이동)                    |
| `DASHBOARD_OPEN`     | (off)         | `1` 이면 백엔드가 bind 후 브라우저를 엽니다 (`make serve` 가 설정)     |
| `DASHBOARD_API_PORT` | `5174`        | dev 모드 Vite `/api` proxy 대상 (`make dev-frontend` 가 자동 설정)     |

## 수정 (MUTATE 모드)

대시보드 사양을 수정하려면:

```
/maencof:craft-dashboard mutate
```

`dashboard-spec.json` 을 다시 인터뷰하고, 변경된 패널/검색만 점진 적용합니다. `// USER-EDIT-START` / `END` 영역은 보존됩니다.

## 디자인 토큰

`frontend/src/styles/tokens.css` 는 빈 슬롯입니다. 본인의 UI 시스템/스킬로 채우십시오. craft-dashboard 는 디자인 토큰을 정의하지 않습니다.

## 라이선스

(프로젝트 정책에 따름)
