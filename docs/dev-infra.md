# Dev Infra — 실행 표준

> Sprint 12 `D-S12-dev-infra-readme` 영구 박힘 (Sprint 10 사용자 시연 first 발견 carry-over 7 정합).
> Sprint 10 마감 시점에 사용자 시연으로 발견된 두 가지 실행 결함을 표준 명령 인덱스로 영구 보존:
> 1. `dist` 정적 export 의 SPA fallback 미설정 — `serve` 기본 모드는 `/chat` `/onboarding` `/inspector` 등 dynamic 라우트를 404 반환. `serve -s` 플래그 의무.
> 2. Ollama CORS — `OLLAMA_ORIGINS` 환경변수 미설정 시 web 빌드 (브라우저) 에서 `http://localhost:11434` 호출이 CORS 차단됨.

## 1. 모바일 web 빌드 + SPA fallback

```bash
# 1) Expo web 빌드 (정적 export)
pnpm --filter mobile build

# 2) SPA fallback 모드로 정적 export 서빙 (`-s` 플래그 의무)
npx serve -s apps/mobile/dist -l 3000
```

`serve -s` (`--single` 의 alias) 는 모든 alphabet route 를 `index.html` 로 fallback. 미설정 시 client-side 라우팅 (`/onboarding` / `/chat` / `/inspector` 등) 이 404 로 실패.

브라우저 진입: `http://localhost:3000`

## 2. Ollama CORS (web 빌드 진입 시 의무)

```bash
# Ollama 데몬을 http://localhost:3000 origin 허용 모드로 기동
OLLAMA_ORIGINS="http://localhost:3000" ollama serve
```

미설정 시 web 빌드의 `chatStore.web.ts` 의 `fetch('http://localhost:11434/api/generate', ...)` 호출이 CORS preflight 차단. 단, 현재 web 빌드는 `chatStore.web.ts` 의 데모 모드 (`DEMO_REPLY_KO` 5토큰 cycle) 활성이므로 Ollama 미연결 시에도 데모 응답으로 동작 (Sprint 1 `D-S1-*` 의도된 동작 + Sprint 12 web 빌드 데모 모드 마이크로 카피 정합).

native iOS / Android 빌드는 `chatStore.ts` 활성 → `OLLAMA_ORIGINS` 무관, 실 Gemma + SQLite 동작.

## 3. 전체 종단 명령 인덱스

```bash
# 의존성
pnpm install

# 모노레포 단위 테스트
pnpm -r test

# Sprint N receipt (자동 검증 가능한 형태)
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-N.sh

# Expo 개발 서버 (native + web 동시, hot reload)
pnpm --filter mobile start

# Expo web 정적 export
pnpm --filter mobile build

# 정적 export 서빙 (SPA fallback 의무)
npx serve -s apps/mobile/dist -l 3000

# Ollama 데몬 (web 빌드 CORS 허용)
OLLAMA_ORIGINS="http://localhost:3000" ollama serve
```

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `/onboarding` 또는 `/chat` 직접 진입 시 404 | SPA fallback 미설정 | `serve -s` 플래그 추가 |
| web 빌드에서 Ollama 응답 0 + CORS 에러 | `OLLAMA_ORIGINS` 미설정 | `OLLAMA_ORIGINS="http://localhost:3000" ollama serve` |
| 사용자 첫 진입 시 LLM 응답으로 오해되는 5토큰 cycle | `chatStore.web.ts` 데모 모드 (Sprint 1 `D-S1-*` 의도된 동작) | EmptyState 의 demoHint 마이크로 카피 가시 (Sprint 12 `D-S12-web-demo-banner-decision` 정합) |
