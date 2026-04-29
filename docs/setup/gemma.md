# 로컬 Gemma 셋업 (macOS · Ollama)

Synapse Sprint 0 은 로컬 LLM 호출을 **Ollama HTTP API** 로 표준화한다. 모델 관리·HTTP 단순성·CLI 일관성을 우선시한 결정이다 (`docs/sprints/sprint-0-scaffolding.md` §11 *Decisions Made*).

## 1. Ollama 설치

```bash
brew install ollama
```

## 2. 데몬 기동

백그라운드 서비스로 띄우거나(권장),

```bash
brew services start ollama
```

또는 포그라운드로 실행한다.

```bash
ollama serve
```

기본 엔드포인트는 `http://localhost:11434`.

## 3. 모델 받기

Sprint 0 은 다음 두 모델을 사용한다.

```bash
# 채팅 모델 (Sprint 0 부터 사용)
ollama pull gemma3:4b

# 임베딩 모델 (Sprint 0 은 의존성만, 실사용은 Sprint 2)
ollama pull embeddinggemma
```

`gemma3:4b` 는 Q4_K_M 양자화 기본. 8GB+ RAM Mac 에 적합 (128K context). 16GB+ 라면 `gemma3:12b` 로 자유 업그레이드 가능 (`SYNAPSE_GEMMA_MODEL` 오버라이드 참고).

## 4. 헬스체크

```bash
curl http://localhost:11434/api/tags
```

JSON 응답에 `gemma3:4b` 가 보이면 OK.

간단 호출 검증:

```bash
curl -s http://localhost:11434/api/generate \
  -d '{"model":"gemma3:4b","prompt":"안녕","stream":false}'
```

## 5. 환경 변수 오버라이드

`packages/llm/src/gemma.ts` 가 읽는 환경 변수.

| 변수 | 기본값 | 용도 |
|---|---|---|
| `SYNAPSE_GEMMA_MODEL` | `gemma3:4b` | 채팅 모델 변경 (예: `gemma3:12b`) |
| `SYNAPSE_OLLAMA_URL` | `http://localhost:11434` | Ollama 엔드포인트 |

예시.

```bash
export SYNAPSE_GEMMA_MODEL=gemma3:12b
pnpm --filter @synapse/llm test
```

## 6. 트러블슈팅

- **`ollama: command not found`** — `brew install ollama` 후 새 셸 열기 또는 `source ~/.zshrc`.
- **`connection refused 11434`** — 데몬 미기동. `brew services start ollama` 또는 `ollama serve`.
- **모델 다운로드 멈춤** — `ollama pull gemma3:4b` 재실행 (재시도 가능). 디스크 공간 5GB+ 확보.
- **테스트가 `skip`** — Ollama 미가용시 의도된 동작. `packages/llm/__tests__/gemma.test.ts` 는 Ollama 헬스체크 후 미가용이면 skip 한다.
- **Apple Silicon GPU 활용 확인** — `ollama ps` 로 GPU 메모리 사용량 확인. MLX 최적화는 Sprint 7 Polish 에서 재평가.
