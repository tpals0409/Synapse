# Sprint 0 — Scaffolding

> 첫 스프린트. N-1 이 부재하므로 `/start` 는 `기획서.md` + `CLAUDE.md` (프로젝트 부트스트랩 섹션) + `디자인 목업/` 을 N-1 대용으로 사용한다.

## 1. Goal
모노레포 부팅, RN+Expo Hello, 로컬 Gemma 호출 가능, sqlite-vec 마이그레이션 완료. 첫 메시지가 LLM 응답 후 SQLite 에 적재되는 종단 흐름이 동작한다.

## 2. Deliverable & Receipt
**Deliverable:**
- pnpm 모노레포 (`pnpm-workspace.yaml`, 루트 `package.json`)
- `apps/mobile` (Expo Router, RN, TypeScript) — 빈 화면이라도 부팅
- `packages/{conversation,llm,engine,orchestrator,storage,design-system,protocol}` 빈 골격 + 각 `index.ts`
- 로컬 Gemma 런타임 셋업 가이드 (`docs/setup/gemma.md`) + `packages/llm/gemma.ts` Hello-World 호출
- SQLite + sqlite-vec 첫 마이그레이션 (`packages/storage/schema/0001_init.sql`) + `messages` 테이블
- Receipt 스크립트 (`scripts/receipt/sprint-0.sh`)

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` 성공
- `pnpm test` exit 0
- `pnpm --filter mobile start` 가 부팅 (헤드리스 검증: bundle 빌드 성공)
- `bash scripts/receipt/sprint-0.sh` 가 다음 시나리오 통과: 입력 "안녕" → 로컬 Gemma 응답 텍스트 1개 이상 → `messages` 테이블에 user/assistant 두 row 적재 → exit 0

## 3. Scope
**In:**
- 모노레포/앱 부팅 인프라
- 로컬 Gemma 호출 1 회 성공 (Ollama 또는 llama.cpp 중 결정 — `Decisions Made` 에 기록)
- SQLite + sqlite-vec 첫 스키마, 마이그레이션 러너
- 8 개 에이전트 정의 + `/start`·`/end` 커맨드 동작 확인
- 디자인 토큰 *최소* 셋 (paper, ink, synapse, 기본 폰트)

**Out:**
- Concept 추출 (Sprint 2)
- 어떤 형태든 Recall (Sprint 3+)
- 디자인 충실도 — 풀 9 화면은 Sprint 1+ 에서 점진
- Android 호환성 (Sprint 7)
- 프로덕션 보안/배포

## 4. Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        apps/mobile (Expo RN)                     │
│  Hello 화면 → 입력 "안녕" → conversation.send()                  │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│  packages/conversation                                           │
│   send(text) →                                                   │
│     1) storage.appendMessage({role:"user", content:text})        │
│     2) llm.gemma.complete(text)  → Ollama HTTP @11434            │
│     3) storage.appendMessage({role:"assistant", content:reply})  │
│     4) return reply                                              │
└──────────────────────────────────────────────────────────────────┘
        ↓                                       ↓
┌──────────────────────┐              ┌──────────────────────────┐
│  packages/llm        │              │  packages/storage        │
│   gemma.ts (Ollama)  │              │   sqlite + sqlite-vec    │
│   model: gemma3:4b   │              │   schema/0001_init.sql   │
│                      │              │   migrate.ts             │
└──────────────────────┘              └──────────────────────────┘

(Sprint 0 에서는 골격만 — 실제 동작 검증은 receipt 시나리오)
packages/{engine, orchestrator, design-system, protocol} 은
인터페이스 선언과 빈 export 만. 실제 로직은 Sprint 1+.
```

**Receipt 종단 흐름**: `scripts/receipt/sprint-0.sh` 가 `node` 진입점으로 conversation.send("안녕") 호출 → SQLite 두 row 검증 → exit 0.

**Gemma 런타임 결정**: Ollama (`gemma3:4b` Q4_K_M). EmbeddingGemma 는 의존성만 깔아둠 (Sprint 2 사용).

## 5. File Ownership

| Agent | Files |
|---|---|
| team-leader | `pnpm-workspace.yaml`, 루트 `package.json`, `tsconfig.base.json`, `.gitignore`, `packages/protocol/{package.json,index.ts,src/message.ts}`, `SPRINTS.md` |
| storage | `packages/storage/{package.json,index.ts,src/db.ts,src/migrate.ts,schema/0001_init.sql,__tests__/db.test.ts}` |
| conversation | `packages/llm/{package.json,index.ts,src/gemma.ts,__tests__/gemma.test.ts}`, `packages/conversation/{package.json,index.ts,src/loop.ts,__tests__/loop.test.ts}`, `docs/setup/gemma.md` |
| engine | `packages/engine/{package.json,index.ts,src/types.ts}` |
| orchestrator | `packages/orchestrator/{package.json,index.ts,src/types.ts}` |
| designer | `packages/design-system/{package.json,index.ts,src/tokens.ts,src/fonts.ts}` |
| mobile | `apps/mobile/{package.json,app.json,tsconfig.json,babel.config.js,app/_layout.tsx,app/index.tsx}` |
| tester | `scripts/receipt/sprint-0.sh`, `e2e/scenarios/.gitkeep`, 각 패키지에 placeholder 테스트 추가 검증 |

## 6. Tasks

| ID | Description | Owner | Blocked By |
|---|---|---|---|
| T0 | Repo bootstrap: `git init`, `.gitignore`, `pnpm-workspace.yaml`, 루트 `package.json` (scripts: `test`, `build`), `tsconfig.base.json` | team-leader | — |
| T1 | `packages/protocol`: `Message = {id, role:'user'\|'assistant', content, ts}` 타입 export | team-leader | T0 |
| T2 | `packages/storage`: SQLite + sqlite-vec 의존, `0001_init.sql`(messages 테이블 + messages_vec virtual table placeholder), `migrate.ts`, `appendMessage`/`listMessages` API | storage | T0, T1 |
| T3 | `packages/llm`: Ollama HTTP 어댑터 `gemma.complete(prompt): Promise<string>`, 모델 `gemma3:4b`, `docs/setup/gemma.md` | conversation | T0 |
| T4 | `packages/conversation`: `send(text): Promise<string>` — storage.appendMessage(user) → llm.complete → storage.appendMessage(assistant) | conversation | T2, T3 |
| T5 | `packages/engine`: `Concept`, `GraphEdge`, `RecallCandidate` 타입 선언만 + 빈 함수 stub | engine | T1 |
| T6 | `packages/orchestrator`: `decide(input): {act:'silence'\|'recall', reason}` 시그니처 선언 + `silence` 고정 반환 stub | orchestrator | T1 |
| T7 | `packages/design-system`: oklch paper/ink/synapse light+dark 토큰, Source Serif 4 / Inter / JetBrains Mono font face 상수 | designer | T0 |
| T8 | `apps/mobile`: Expo Router + TS 부팅, Hello 화면 1개, design-system 토큰 1회 import, bundle 빌드 통과 | mobile | T0, T7 |
| T9 | `scripts/receipt/sprint-0.sh`: `pnpm install` → `pnpm test` → mobile bundle 빌드 → conversation.send("안녕") → SQLite row 검증 | tester | T2, T4, T8 |
| T10 | 각 패키지 `__tests__/*.test.ts` 1개 placeholder + `pnpm test` exit 0 보장 | tester | T2, T3, T4, T5, T6, T7 |
| T11 | Sprint 0 dev doc 라이브 갱신 (§7 Interfaces, §8 Test Scenarios) — 모든 에이전트 협업 | team-leader | T2, T3, T4 |

## 7. Interfaces / Contracts
*(라이브 갱신)*

**`@synapse/protocol`** (확정 — T1):
```ts
type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; content: string; ts: number };
```

**`@synapse/storage`** (T2 확정):
```ts
import type { Message } from '@synapse/protocol';
import type Database from 'better-sqlite3';

export function openDb(path: string): Database.Database;
// WAL 모드 + busy_timeout=5000ms + sqlite-vec extension 로드된 better-sqlite3 인스턴스 반환

export function migrate(db: Database.Database): void;
// schema/*.sql 사전순 순차 적용, _migrations(name PK) 로 멱등 보장

export function appendMessage(db: Database.Database, msg: Message): void;
export function listMessages(db: Database.Database): Message[]; // ts ASC
```
- 스키마: `schema/0001_init.sql`
  - `messages(id TEXT PK, role TEXT CHECK in ('user','assistant'), content TEXT, ts INTEGER)` + `idx_messages_ts`
  - `messages_vec` virtual table `vec0(message_id TEXT PK, embedding float[768])` — Sprint 0 placeholder, Sprint 2 부터 적재
- 결정: 임베딩 차원 768 (EmbeddingGemma), 거리 메트릭 cosine
- 직접 import 정책: 모바일에서 직접 import 금지 — engine/conversation 어댑터를 거쳐야 함

**`@synapse/llm`** (T3 확정):
```ts
// packages/llm/index.ts
export * as gemma from './src/gemma.ts';

// gemma 네임스페이스
gemma.complete(prompt: string): Promise<string>   // Ollama POST /api/generate, stream:false
gemma.isAvailable(): Promise<boolean>             // GET /api/tags 헬스체크
gemma.config: { model: string; endpoint: string } // 런타임 노출 (테스트/디버깅용)
```
- 기본 모델: `gemma3:4b` (env `SYNAPSE_GEMMA_MODEL` 오버라이드)
- 기본 엔드포인트: `http://localhost:11434` (env `SYNAPSE_OLLAMA_URL` 오버라이드)
- 스트리밍은 Sprint 1 에서 추가 (현재 `stream: false` 단발 호출)
- 셋업 가이드: `docs/setup/gemma.md`

**`@synapse/conversation`** (T4 확정):
```ts
import type { Database } from '@synapse/storage';

export type SendDeps = {
  db: Database;
  complete?: (prompt: string) => Promise<string>; // 미주입시 gemma.complete 사용
};

export function send(text: string, deps: SendDeps): Promise<string>;
```
- 흐름: `appendMessage(user)` → `complete(text)` → `appendMessage(assistant)` → return reply.
- `id = crypto.randomUUID()`, `ts = Date.now()`.
- LLM 실패시 user row 는 보존되고 에러 전파 (assistant row 미적재).
- `complete` 옵션은 테스트/대안 LLM 주입용 (DI). 프로덕션은 기본 `gemma.complete` (env: `SYNAPSE_GEMMA_MODEL`, `SYNAPSE_OLLAMA_URL`).
- 스트리밍 / 컨텍스트 조립 / Recall 합성은 Sprint 1+ — 현재는 prompt = 사용자 입력 그대로.

**`@synapse/orchestrator`** (T6 확정 — 침묵 디폴트):
```ts
import type { RecallCandidate } from '@synapse/engine';
import type { Message } from '@synapse/protocol';

type DecisionAct = 'silence' | 'ghost' | 'suggestion' | 'strong';
// 기획서 §7.4 Recall Trigger Levels 1:1 매핑.
// Sprint 0: 'silence' 만 사용. ghost/suggestion/strong 은 Sprint 3 에서 활성.

type Decision = {
  act: DecisionAct;
  reason: string;                 // 결정 근거 (로깅/retro 용)
  candidates?: RecallCandidate[]; // ghost/suggestion/strong 에서만 채워짐
};

type DecideInput = {
  text: string;
  recentMessages?: Message[];
  candidates?: RecallCandidate[]; // engine 이 후보를 제공한 경우
};

decide(input: DecideInput): Decision
// Sprint 0: 항상 { act: 'silence', reason: 'sprint-0-default-silence' } 반환.
//          헌법 §16.3 "필요한 순간에만 개입, 나머지는 침묵" 적용.
```

**`@synapse/engine`** (T5 확정 — 타입 + stub):
```ts
// packages/engine/src/types.ts
type Concept = {
  id: string;
  label: string;
  embedding?: number[];           // 768-dim (EmbeddingGemma), Sprint 2 채움
  createdAt: number;
};
type EdgeKind = 'co_occur' | 'semantic' | 'bridge' | 'temporal';
type GraphEdge = { from: string; to: string; weight: number; kind: EdgeKind };
type RecallReason = 'semantic' | 'bridge' | 'temporal' | 'domain_crossing';
type RecallCandidate = {
  conceptId: string;
  score: number;
  reason: RecallReason;
  sourceMessageId?: string;
};

// packages/engine/src/recall.ts
type RecallContext = { recentMessages: import('@synapse/protocol').Message[] };

// 함수 시그니처 — Sprint 0 은 모두 throws 'engine.<fn>: not implemented in sprint 0'
extractConcepts(text: string): Promise<Concept[]>          // Sprint 2: LLM 함수 호출 (발화당 ≤3, 기획서 §7.4)
buildEdges(concepts: Concept[]): GraphEdge[]               // Sprint 2: co_occur, Sprint 5: bridge/temporal
recall(context: RecallContext): Promise<RecallCandidate[]> // Sprint 3: L1~L3, Sprint 5: hyper-recall
```
- 의존성: `@synapse/protocol` (Message), `@synapse/storage` (Sprint 2+ graph repo) — 둘 다 workspace:*.
- `RecallCandidate` 는 본 패키지가 단일 진실원 — `@synapse/orchestrator` 가 import 함 (Decision.candidates).
- 후보 점수의 *제시 여부* 는 항상 `orchestrator.decide` 통과 후 결정 (기획서 §16). engine 은 *무엇을* 골라낼지에 집중.

**`@synapse/design-system`** (T7 확정):
```ts
// packages/design-system/index.ts
export const colors: {
  light: { paper: string; ink: string; synapse: string };  // oklch 문자열
  dark:  { paper: string; ink: string; synapse: string };
};
export type ThemeName = 'light' | 'dark';
export type ColorToken = 'paper' | 'ink' | 'synapse';

export const fonts: { serif: 'Source Serif 4'; sans: 'Inter'; mono: 'JetBrains Mono' };
export const role:  { heading: 'Source Serif 4'; body: 'Source Serif 4'; ui: 'Inter'; meta: 'JetBrains Mono' };
export type FontFamily = 'serif' | 'sans' | 'mono';
export type FontRole = 'heading' | 'body' | 'ui' | 'meta';
```
- 단일 진실원: `디자인 목업/styles.css` (oklch) — 정확한 값은 §11 Decisions 참조.
- mobile 부팅 검증용으로 1회 import (예: `import { colors } from '@synapse/design-system'`).
- spacing/radius/shadow/motion + extended palette + COPY/i18n 은 Sprint 1+ 에서 점진 추기.

**`@synapse/mobile` (T8 확정)**:
```
apps/mobile/
├── package.json          # name=@synapse/mobile, scripts.start=expo start, build=expo export --platform web
├── app.json              # expo: { name, slug, scheme=synapse, newArchEnabled=true, ios.bundleIdentifier=com.synapse.app }
├── tsconfig.json         # extends ../../tsconfig.base.json, jsx=react-jsx, types=[node, expo]
├── babel.config.js       # presets: ['babel-preset-expo']
├── metro.config.js       # monorepo 인식 (watchFolders=[root], nodeModulesPaths, unstable_enableSymlinks/PackageExports)
├── .gitignore            # .expo/, node_modules/, dist/, web-build/
└── app/
    ├── _layout.tsx       # Stack (expo-router), headerShown=false
    └── index.tsx         # Home — `<Text>Synapse</Text>`, design-system colors/fonts 1회 import
```
- 진입점: `expo-router/entry` (package.json `main`).
- Sprint 0 receipt: `pnpm --filter @synapse/mobile run build` (= `expo export --platform web`) 가 exit 0 → `apps/mobile/dist/` 에 web bundle 생성.
- design-system 사용: `import { colors, fonts } from '@synapse/design-system'` 1회 — RN 의 oklch 미지원으로 backgroundColor/color 는 inline hex (`#F5F0E8`, `#2A2620`) 로 폴백, fonts.serif 는 그대로 사용.
- conversation/engine 호출은 Sprint 1+ 에서 추가 (현재 화면은 정적).

## 8. Test Scenarios
*(라이브 갱신)*

**`@synapse/llm` (T3)** — `packages/llm/__tests__/gemma.test.ts`:
1. `gemma.config` 노출 검증 (model 문자열, endpoint http URL) — 항상 실행.
2. Ollama 미가용시 `t.skip('ollama not running')`. 가용시 `complete('hello')` 호출 후 `typeof reply === 'string'` 및 `length > 0` 검증. 타임아웃 30s.

**`@synapse/storage` (T2)** — `packages/storage/__tests__/db.test.ts`:
1. `openDb(tmpfile)` → `migrate(db)` 후 `sqlite_master` 에 `messages` + `messages_vec` 존재 확인. 두 개의 `appendMessage` (역순 ts 로 삽입) 후 `listMessages` 가 ts ASC 정렬로 반환되는지, role/content/id 필드 round-trip 검증.
2. `migrate(db)` 두 번 호출해도 `_migrations` 행이 1 개로 유지되는 멱등성 검증.

**`@synapse/engine` (T5)** — `packages/engine/__tests__/types.test.ts` (7 tests, 모두 통과):
1. `Concept` 필수 필드 (`id`, `label`, `createdAt`) 컴파일 검증.
2. `Concept.embedding` 768-dim optional 허용 검증.
3. `GraphEdge.kind` 4 종 enum (`co_occur`/`semantic`/`bridge`/`temporal`) 모두 컴파일.
4. `RecallCandidate.reason` 4 종 enum (`semantic`/`bridge`/`temporal`/`domain_crossing`) 모두 컴파일 + `sourceMessageId` optional.
5. `extractConcepts('hello')` 가 `not implemented in sprint 0` 메시지로 reject.
6. `buildEdges([])` 가 동일 메시지로 throw.
7. `recall({ recentMessages: [] })` 가 동일 메시지로 reject.

**`@synapse/design-system` (T7)** — `packages/design-system/__tests__/tokens.test.ts`:
1. `colors.{light,dark}.{paper,ink,synapse}` 가 모두 `oklch` 로 시작하는 문자열인지 검증.
2. `colors.light.paper === 'oklch(96.5% 0.012 75)'` 정확 매칭 (styles.css `:root --paper` 와 1:1).
3. `colors.light.synapse === colors.dark.synapse` (styles.css `[data-theme="dark"]` 가 `--synapse` 를 재정의하지 않음).
4. `fonts.serif/sans/mono` 가 각각 `'Source Serif 4'`/`'Inter'`/`'JetBrains Mono'`.
5. `role` 매핑: heading/body→serif, ui→sans, meta→mono.

**`@synapse/conversation` (T4)** — `packages/conversation/__tests__/loop.test.ts`:
1. **golden path** — `openDb(':memory:')` + `migrate(db)` 후 `send('안녕', { db, complete: fakeReply })` → `listMessages(db)` 가 `[user, assistant]` 두 row 반환, role/content 일치, `user.ts ≤ assistant.ts`. mock 이 받은 prompt 가 입력과 동일한지 검증.
2. **error path** — `complete` 가 throw 시 `send` reject + `/gemma down/` 매칭, user row 보존 (`listMessages.length === 1`), assistant row 미적재.

**`@synapse/protocol` (T1, placeholder T10)** — `packages/protocol/__tests__/message.test.ts`:
1. `Message` 타입 컴파일 + `id/role/content/ts` 구조 검증.
2. `Role` union 이 `'user' | 'assistant'` 두 값을 수용 (그 외 값은 컴파일 거부).

**Receipt (T9)** — `scripts/receipt/sprint-0.sh` 5단계, 실패 시 어느 단계인지 명시적 echo + non-zero exit:
1. **[1/5] pnpm install** — `--frozen-lockfile=false` 워크스페이스 의존성 설치.
2. **[2/5] pnpm -r test** — 모든 패키지 단위 테스트 exit 0 (Ollama 미가동 시 llm e2e 1건만 skip).
3. **[3/5] mobile bundle build** — `pnpm --filter @synapse/mobile run build` exit 0 (Expo `export --platform web`, 산출물 `apps/mobile/dist/` ~913kB).
4. **[4/5] e2e: 안녕 → Gemma** — 임시 DB + `packages/conversation/.receipt-runner/send.mjs` (trap 으로 정리). pnpm 워크스페이스 별칭은 *진입 스크립트의 디렉토리* 기반 resolve 라 conversation 패키지 *내부* 에 진입점을 둔다. Ollama `/api/tags` 헬스체크 실패 시 `brew services start ollama` 가이드 echo + exit 1.
5. **[5/5] SQLite verify** — 같은 위치의 `verify.mjs` 가 `listMessages(db)` 호출, `role==='user'` ≥1 AND `role==='assistant'` ≥1 검증. 미달 시 실제 카운트 echo 후 fail.

자가 검증 (Ollama 미가동 환경, 2026-04-29):
- step 1, 2, 3 실제 통과 확인 (pnpm install / 21 tests pass / mobile dist exported).
- step 4 가 정확히 `❌ [4/5] Ollama 미가동` 메시지로 exit 1 — 의도한 friendly fail.
- mock LLM (complete: () => '안녕하세요') 로 `send.mjs`/`verify.mjs` 인라인 실행 시 messages 테이블 `user=1 assistant=1` 적재 round-trip 확인.

**T10 placeholder coverage** (모든 패키지 `pnpm -r test` 통과 보장):
- `protocol`: 이번 스프린트에 신규 추가 (위 §8 참조).
- `storage` / `llm` / `engine` / `orchestrator` / `design-system`: 이미 패키지별 테스트 존재 (위 §8 covered).
- `conversation`: T4 산출물의 `__tests__/loop.test.ts` 가 send 의 storage append × 2 + Gemma mock 영속화를 검증 (책임: conversation 에이전트).
- `apps/mobile`: 빌드 검증으로 갈음, 테스트 스크립트는 `echo skip` (Sprint 1 부터 RN Testing Library 도입).

## 9. Demo Script

전제: macOS, pnpm 9.12+, Node 20+, Ollama 설치 + 가동, `gemma3:4b` 와 `embeddinggemma` 모델 pull 완료.

```bash
# 1. 환경 확인
brew install ollama && brew services start ollama
ollama pull gemma3:4b
ollama pull embeddinggemma
curl -sf http://localhost:11434/api/tags > /dev/null && echo "Ollama up"

# 2. 의존성 설치
cd /path/to/Synapse
pnpm install

# 3. 단위 테스트 (22 pass, Ollama 가동시 0 skip)
pnpm -r test

# 4. 모바일 web bundle 빌드 (헤드리스)
pnpm --filter @synapse/mobile run build
ls apps/mobile/dist/_expo/static/js/web/entry-*.js  # ~913 kB

# 5. 종단 receipt — 입력 "안녕" → Gemma 응답 → SQLite 적재
bash scripts/receipt/sprint-0.sh
# 기대 출력 끝줄: "✅ Sprint 0 receipt PASSED"

# 6. (선택) Expo Dev Server 로 시각 확인
pnpm --filter @synapse/mobile start  # iOS Simulator: i, Web: w
# Home 화면에 "Synapse" 텍스트 (Source Serif 4, paper 배경 #F5F0E8)
```

**실 실행 예** (2026-04-29, PM 환경, Ollama + gemma3:4b 가동):
- [4/5] reply: `안녕하세요! 무엇을 도와드릴까요? 궁금한 점이 있거나, 이야기하고 싶거나, 아니면 그냥 인사하고 싶으신 건가요? 😊`
- [5/5] messages user=1 assistant=1
- ✅ exit 0

## 10. Implementation Map

**모노레포 루트**:
- `pnpm-workspace.yaml` — `apps/*`, `packages/*` glob.
- `package.json` — root scripts: `test = pnpm -r test`, `build = pnpm -r build`, `receipt:0 = bash scripts/receipt/sprint-0.sh`. `packageManager: pnpm@9.12.0`, `engines.node: >=20`.
- `tsconfig.base.json` — `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict`, `noUncheckedIndexedAccess`, `allowImportingTsExtensions`, `noEmit`, `types: ['node']`. 모든 패키지가 extends.
- `.gitignore` — node_modules, .expo, dist, *.db/.sqlite, .DS_Store, .env, .turbo, coverage.

**`packages/protocol`** (`@synapse/protocol`):
- `src/message.ts` — `type Role = 'user'|'assistant'`, `type Message = {id,role,content,ts}`.
- `index.ts` — re-export. `__tests__/message.test.ts` 2 tests.

**`packages/storage`** (`@synapse/storage`, deps: better-sqlite3, sqlite-vec):
- `schema/0001_init.sql` — `messages(id PK, role CHECK, content, ts)` + `idx_messages_ts` + `messages_vec(message_id PK, embedding float[768])`.
- `src/db.ts` — `openDb(path) → Database` (WAL + busy_timeout 5s + `sqliteVec.load(db)`).
- `src/migrate.ts` — `migrate(db)`, `_migrations(name PK, ts)` 트래킹, 사전순 적용, 멱등.
- `src/messages.ts` — `appendMessage(db, msg)`, `listMessages(db) → Message[]` (ts ASC).
- `index.ts` — re-export 모두. `__tests__/db.test.ts` 2 tests.

**`packages/llm`** (`@synapse/llm`):
- `src/gemma.ts` — `complete(prompt) → Promise<string>` (Ollama POST `/api/generate`, stream:false), `isAvailable() → Promise<boolean>` (GET `/api/tags`), `config: { model, endpoint }`. env `SYNAPSE_GEMMA_MODEL` (default `gemma3:4b`), `SYNAPSE_OLLAMA_URL` (default `http://localhost:11434`).
- `index.ts` — `export * as gemma from './src/gemma.ts'`. `__tests__/gemma.test.ts` 2 tests (config + e2e w/ skip 가드).
- `docs/setup/gemma.md` — macOS 가이드 (brew install / ollama pull / 헬스체크 / env override).

**`packages/conversation`** (`@synapse/conversation`, deps: protocol, storage, llm):
- `src/loop.ts` — `type SendDeps = { db: Database; complete?: (prompt) => Promise<string> }`, `send(text, deps) → Promise<string>`. user append → complete (default gemma) → assistant append → return reply. id=`crypto.randomUUID()`, ts=`Date.now()`. LLM 실패시 user row 보존 + reject.
- `index.ts` — `export { send } from './src/loop.ts'`.
- `__tests__/loop.test.ts` — golden + error path 2 tests.
- `.receipt-runner/{send.mjs, verify.mjs}` — Sprint 0 receipt e2e 인라인 진입점 (워크스페이스 alias resolve 함정 우회).

**`packages/engine`** (`@synapse/engine`, deps: protocol):
- `src/types.ts` — `Concept { id, label, embedding?: number[768], createdAt }`, `EdgeKind = co_occur|semantic|bridge|temporal`, `GraphEdge { from, to, weight, kind }`, `RecallReason = semantic|bridge|temporal|domain_crossing`, `RecallCandidate { conceptId, score, reason, sourceMessageId? }`.
- `src/extract.ts`, `src/graph.ts`, `src/recall.ts` — 모두 stub (`throws 'engine.<fn>: not implemented in sprint 0'`).
- `index.ts` — re-export. `__tests__/types.test.ts` 7 tests.

**`packages/orchestrator`** (`@synapse/orchestrator`, deps: protocol, engine):
- `src/types.ts` — `DecisionAct = silence|ghost|suggestion|strong`, `Decision { act, reason, candidates? }`, `DecideInput { text, recentMessages?, candidates? }`.
- `src/decide.ts` — `decide(input) → Decision` 항상 `{act:'silence', reason:'sprint-0-default-silence'}` (헌법 §16.3).
- `index.ts` — re-export. `__tests__/decide.test.ts` 2 tests.

**`packages/design-system`** (`@synapse/design-system`):
- `src/tokens.ts` — `colors.{light,dark}.{paper,ink,synapse}` (oklch 문자열, styles.css 1:1).
- `src/fonts.ts` — `fonts.{serif:'Source Serif 4',sans:'Inter',mono:'JetBrains Mono'}`, `role.{heading,body,ui,meta}`.
- `index.ts` — re-export. `__tests__/tokens.test.ts` 5 tests.

**`apps/mobile`** (`@synapse/mobile`, deps: design-system + Expo):
- `package.json` — expo@^52, expo-router@^4, react-native@0.76, react/react-dom, react-native-web, `@expo/metro-runtime`, `@babel/runtime` (pnpm 호이스팅 대응), `@synapse/design-system` workspace.
- `app.json` — name=Synapse, slug=synapse, scheme=synapse, newArchEnabled=true, ios.bundleIdentifier=com.synapse.app.
- `tsconfig.json` (extends base, jsx=react-jsx), `babel.config.js` (babel-preset-expo).
- `metro.config.js` — pnpm 모노레포 인식: watchFolders, nodeModulesPaths, unstable_enableSymlinks/PackageExports.
- `app/_layout.tsx` — Stack (expo-router), headerShown=false.
- `app/index.tsx` — Home `<Text>Synapse</Text>`, design-system colors/fonts 1회 import + RN 호환 inline hex (`#F5F0E8`/`#2A2620`).
- 빌드: `pnpm --filter @synapse/mobile run build` = `expo export --platform web` → `apps/mobile/dist/` 913kB.

**`scripts/receipt/sprint-0.sh`**:
- 5 단계 (`set -euo pipefail`): pnpm install / `pnpm -r test` / mobile bundle / e2e (Ollama 헬스 + send.mjs) / SQLite verify (verify.mjs `listMessages` role 카운트).
- 임시 DB 는 `mktemp` + trap rm 정리.

**`docs/`**:
- `sprints/_template.md` — 12 섹션 템플릿.
- `sprints/_current.txt` — `1` (이 /end 종료 직후).
- `sprints/sprint-0-scaffolding.md` — 본 문서 (마감).
- `sprints/sprint-1-conversation-loop.md` — 다음 스프린트 스켈레톤 (이 /end 가 생성).
- `setup/gemma.md` — Ollama + Gemma 셋업 가이드.

**`e2e/scenarios/`** — Sprint 1+ 시나리오 둥지 (현재 `.gitkeep` 만).

**Receipt 검증 결과 (2026-04-29, PM 환경)**:
- Status: **PASS** (5/5 단계 모두 통과).
- 22 단위 테스트 pass / 0 skip / 0 fail (Ollama 가용 환경 기준).
- Mobile web bundle 913kB exported.
- e2e: 입력 "안녕" → Gemma 첫 응답 ("안녕하세요! 무엇을 도와드릴까요? ..."), SQLite messages 두 row 적재 확인.

## 11. Decisions Made / Open Issues

**Decisions Made:**
- **Gemma 런타임: Ollama** (llama.cpp 보류). 모델 관리·HTTP API 단순성 우선.
- **Chat 모델: `gemma3:4b` (Q4_K_M)**. 8GB+ Mac 적합, 128K context. 16GB+ 면 12B 업그레이드 자유.
- **Embedding 모델: `embeddinggemma` (308M)**. Sprint 0 은 의존성만, 실사용은 Sprint 2.
- **패키지 매니저**: pnpm 모노레포 (`CLAUDE.md` 결정 그대로).
- **Apple Silicon MLX** 최적화는 Sprint 7 Polish 에서 재평가.
- **Orchestrator DecisionAct enum** (T6): `'silence' | 'ghost' | 'suggestion' | 'strong'`. 기획서 §7.4 Recall Trigger Levels 1:1 매핑 (ghost=Lv1, suggestion=Lv2, strong=Lv3). Sprint 0 은 헌법 §16.3 *침묵 디폴트* 로 `silence` 고정. 나머지 act 는 Sprint 3 활성. `Decision.reason` 은 retrospective/로그용 (Sprint 4 storage 영속화 예정).
- **Storage 임베딩 차원** (T2): **768** (EmbeddingGemma 와 일치). `messages_vec` 은 Sprint 0 placeholder — Sprint 2 부터 적재.
- **Storage 거리 메트릭** (T2): **cosine** (sqlite-vec 디폴트). recall similarity 도 동일.
- **Storage 동시성** (T2): WAL 모드 + `busy_timeout = 5000ms`.
- **Storage 마이그레이션 트래킹** (T2): `_migrations(name TEXT PK, ts INTEGER)`. `schema/*.sql` 사전순 트랜잭션 적용, 멱등 보장. 다운그레이드 경로 없음.
- **Design tokens 단일 진실원** (T7): `디자인 목업/styles.css` (oklch) + `content.jsx` (COPY, Sprint 1+).
- **Sprint 0 토큰 범위** (T7): 컬러 3종 × light/dark + 폰트 family 3종. 추출 값:
  - light: paper=`oklch(96.5% 0.012 75)`, ink=`oklch(22% 0.018 60)`, synapse=`oklch(64% 0.14 55)`
  - dark: paper=`oklch(20% 0.012 60)`, ink=`oklch(94% 0.012 70)`, synapse=`oklch(64% 0.14 55)` (styles.css `[data-theme="dark"]` 가 `--synapse` 미재정의 → light 값 유지)
  - 부속(spacing/radius/shadow/motion/extended palette/`role` Expo Font 로딩)은 Sprint 1+.
- **Engine — Concept embedding 차원** (T5): **768** (storage 와 일치).
- **Engine — `GraphEdge.kind` enum** (T5): `co_occur | semantic | bridge | temporal`. 기획서 §7.5 매핑.
- **Engine — `RecallCandidate.reason` enum** (T5): `semantic | bridge | temporal | domain_crossing`. orchestrator.Decision.candidates 가 동일 타입 공유.
- **Mobile — Expo Router** (T8): file-based routing, `newArchEnabled=true` (RN 0.76 New Architecture).
- **Mobile — Sprint 0 화면**: Home 1개. 9 화면은 Sprint 1+.
- **Mobile — RN/oklch 호환성**: RN 색 파서가 oklch 미지원. Sprint 0 은 inline hex 폴백 (paper=`#F5F0E8`, ink=`#2A2620`). Sprint 1 에서 design-system `colorsHex` dual export.
- **Mobile — Metro pnpm 호환** (T8): `metro.config.js` 에서 `watchFolders=[monorepoRoot]`, `nodeModulesPaths=[mobile, root]`, `unstable_enableSymlinks/PackageExports`. `@babel/runtime` 을 mobile 직접 dep 으로 명시.
- **Mobile — Sprint 0 빌드 타깃**: `expo export --platform web` (=receipt). iOS/Android 네이티브는 Sprint 7.
- **Receipt — pnpm workspace alias resolve 함정** (T9): pnpm 의 `@synapse/*` 별칭은 *진입 스크립트 위치* 기반 resolve. `node -e` 로는 가상 진입점이 root 라 `Cannot find package` 발생. 해법: 진입점을 `packages/conversation/.receipt-runner/{send,verify}.mjs` 에 파일로 두고 `node --experimental-strip-types <path>` 로 실행. Sprint 1+ 에서 receipt 단계 추가 시 동일 패턴 (또는 `pnpm --filter <pkg> exec node ...`).
- **테스트 러너**: node:test (`node --test --experimental-strip-types`). 외부 의존성 없이 모든 패키지 통일.
- **TS 컴파일 옵션** (루트 base): `allowImportingTsExtensions: true` + `noEmit: true`. node native TS strip mode 와 일치, 패키지별 override 불필요.

**Open Issues:**
- **[Sprint 1] design-system colorsHex dual export** — Sprint 0 은 mobile `app/index.tsx` 에 inline hex 폴백 사용. Sprint 1 시작 직후 designer 가 `colorsHex.{light,dark}.{paper,ink,synapse}` 추가, mobile 이 폴백 제거. 책임: designer + mobile.
- **[Sprint 1] Ollama 의존성 PM 환경 셋업** — Sprint 0 receipt 는 [1/5]~[3/5] + [5/5] mock LLM 자가 검증 PASS. [4/5] e2e (안녕 → Gemma) 는 PM 환경에 Ollama 설치/구동 + `gemma3:4b` pull 필요. `/end` 직전 PM 이 다음 명령으로 full PASS 확인:
  ```bash
  brew install ollama
  brew services start ollama
  ollama pull gemma3:4b
  ollama pull embeddinggemma
  bash scripts/receipt/sprint-0.sh
  ```

## 12. Carry-over + Retrospective

**Carry-over (Sprint 1 이 반드시 알아야 할 것)**:

*기술 스택/런타임* — 이미 동작 검증됨:
- **Ollama 어댑터 동작 확정**: `gemma3:4b` (default) / `embeddinggemma` (Sprint 2 사용 예정) 모두 pull 완료 + `gemma.complete` 단발 호출 평균 ~5.7s. Sprint 1 의 스트리밍은 같은 Ollama API 의 `stream:true` 모드로 확장 (현재 `stream:false`). 첫 토큰까지 latency 측정해 ghost-emerge 애니메이션 타이밍 결정 필요.
- **conversation.send 시그니처**: `send(text, { db, complete? }) → Promise<string>`. 스트리밍을 도입하려면 시그니처를 `send(text, { db, onToken? }) → Promise<string>` 또는 별도 `sendStream` 추가하는 식으로 확장 — Sprint 1 *Decisions Made* 에 결정 기록 필수.
- **SQLite messages 테이블 준비됨**: id/role/content/ts 4 필드. Sprint 1 은 conversation_id, parent_id 같은 추가 컬럼이 필요해질 수 있음 — 마이그레이션 `0002_*.sql` 로 (다운그레이드 없음).
- **`messages_vec` 비어있음**: 스키마는 있으나 적재 코드는 Sprint 2.

*디자인/UX*:
- **디자인 토큰 최소 셋만 있음**: paper/ink/synapse × light/dark + 3 폰트 family. **Sprint 1 첫 작업으로 designer 가 spacing / radius / shadow / motion / extended palette / COPY 한·영 분리 추가 필요** (디자인 목업/styles.css + content.jsx 가 진실원).
- **RN/oklch 호환성 부채**: mobile `app/index.tsx` 에 inline hex 폴백 (`#F5F0E8`/`#2A2620`) 임시 사용 중. Sprint 1 시작 직후 designer 가 `colorsHex.{light,dark}.{paper,ink,synapse}` dual export 추가 + mobile 이 폴백 제거 — 이게 첫 task.
- **9 화면 미구현**: 디자인 목업의 Onboarding/FirstChat/Inspector/CaptureToast/Suggestion/Ghost/Strong/Failure/Settings 9 화면 중 Home 1개만 부팅 검증 상태. Sprint 1 의 Receipt 는 적어도 Onboarding + FirstChat 2 화면 + 채팅 입력/응답 흐름.

*아키텍처/계약*:
- **모든 인터페이스는 dev doc §7 에 픽스**. 변경 시 마이그레이션·소비측 업데이트 둘 다 필요.
- **Orchestrator 침묵 디폴트**: Sprint 1 도 `decide()` 가 항상 silence 반환하므로 conversation 은 그대로 LLM 응답을 화면에 띄우면 됨. Recall 합성은 Sprint 3 전까지 활성화 안 함. **단, Sprint 1 의 conversation.send 가 향후 Sprint 4 에서 orchestrator.decide 통과 후 화면 노출하도록 게이트 추가될 자리를 미리 표시해두면 좋음** (주석 또는 hook 포인트).
- **Engine stubs 모두 throw**: extractConcepts / buildEdges / recall 호출 금지 (Sprint 2 까지). Sprint 1 의 mobile/conversation 는 engine import 안 함.

*받침 자산*:
- **Receipt 패턴 검증됨**: pnpm install / `pnpm -r test` / mobile bundle / e2e / SQLite verify 5 단계가 동작. **Sprint 1 의 `scripts/receipt/sprint-1.sh` 는 동일 5 단계 + 새 시나리오 (예: streaming token 수신 검증, COPY i18n 키 존재 검증) 추가 형태로 확장**.
- **Workspace alias resolve 함정**: `node -e` 는 가상 진입점 root resolve. Sprint 1 receipt 가 새 inline node 호출 추가 시 진입점은 반드시 패키지 *내부* 디렉토리 (`packages/<pkg>/.receipt-runner/...mjs`) 에 둘 것.
- **테스트 러너**: node:test (`node --test --experimental-strip-types`). vitest 등 추가 도입 금지 — 이미 통일됨.
- **TS base config**: `allowImportingTsExtensions: true` + `noEmit: true`. 패키지별 override 금지.

*환경 의존*:
- **Ollama 가동 필요**: Sprint 1 receipt 도 [4/5] e2e 에서 Ollama 가동 전제. CI 도입은 Sprint 7 Polish 에서.
- **Mobile iOS Simulator/Android emulator 미검증**: Sprint 1 의 시각 확인은 Expo Web (`expo start --web`) 또는 iOS Simulator (`expo start` → `i`) 로. 디자인 충실도 검증은 Sprint 7.

**Retrospective**:

*잘 된 것*:
- 7명 워커 병렬 작업이 dependency graph (T0/T1 먼저 → T2-T8 병렬 → T9-T11 마무리) 따라 깨끗하게 흘러갔음. 라우팅 중복 알림은 모든 에이전트가 idempotent 하게 무시.
- dev doc 라이브 갱신 (§7 인터페이스 + §11 Decisions) 이 잘 동작 — 워커들이 자기 결정을 즉시 기록한 덕에 /end 가 거의 큐레이션만 하면 됐음.
- tester 의 receipt 스크립트가 Ollama 미가동 환경도 friendly fail 처리 + mock LLM round-trip 자가 검증으로 PM 환경 의존 부분을 명확히 분리.
- 디자인 토큰을 oklch 문자열로 1:1 추출한 designer 의 단일 진실원 원칙. Sprint 1 의 dual export (hex 폴백) 도 같은 원칙으로 확장 가능.
- **첫 종단 흐름 동작**: "안녕" → Gemma 한국어 응답 → SQLite 적재. 7 패키지가 같이 호흡하는 게 받쳐졌다는 게 중요.

*아팠던 것*:
- pnpm workspace alias resolve 함정 (`node -e` → root resolve → `Cannot find package`) 으로 receipt 디버깅에 한 사이클 소비. 미리 알았더라면 1단계 단축 가능.
- RN/oklch 미지원 사실을 mobile 작업 직전에야 발견 → inline hex 폴백 임시 처리 → Sprint 1 첫 task 부채로 carry. 디자인 시스템 설계 시 RN 호환성 사전 조사 필요.
- Metro + pnpm 의 symlink 호이스팅 호환 문제로 `metro.config.js` + `@babel/runtime` 직접 dep 추가 필요. Sprint 0 에서 mobile 이 ~30분 디버깅 소비.
- 라우팅 중복 task_assignment 메시지가 자주 발생 — 시스템 아티팩트로 보이나 에이전트들이 매번 idempotent 처리 보고를 해야 했음. 최소 모델은 잘 작동.

*다음에 다르게 할 것*:
- 새 패키지 도입 시 *받침 가이드 (template)* 를 한 번 만들어두기 — package.json/tsconfig/index.ts/__tests__ 셋업이 모든 패키지에서 거의 동일했는데 매번 새로 작성. Sprint 1 첫 작업으로 `packages/_template/` 또는 `pnpm create synapse-package` 스크립트 검토.
- RN 호환성 같은 *런타임-제약 사실* 은 Sprint 0 의 *Decisions Made* 가 아니라 *Open Issues* 에 명시적으로 박아두기 (이미 했지만 더 일찍).
- /end receipt 검증 시 PM 환경 셋업이 필요한 단계 (Ollama 같은 외부 의존)는 receipt 스크립트가 사전 헬스체크 + 친절한 안내를 무조건 하도록 — Sprint 0 에서 이미 했지만 패턴화 필요.
- dev doc §11 의 Decisions Made 를 카테고리별로 그룹화 (런타임 / 스키마 / 디자인 / 모바일 / 받침). Sprint 0 에서 23건이 거의 일렬로 쌓여 가독성 미세하게 떨어짐.
