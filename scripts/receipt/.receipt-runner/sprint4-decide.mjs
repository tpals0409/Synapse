// Sprint 4 receipt — DecisionAct 4 원 fixture e2e.
//
// 호출:
//   node --experimental-strip-types sprint4-decide.mjs
//   → 4 원 fixture (silence / ghost / suggestion / strong) 각각 입력 →
//     `orchestrator.decide` 결과가 정확히 매칭되어야 한다.
//   → exit 0 + stdout: "decisions=4;silence=1;ghost=1;suggestion=1;strong=1"
//
// stub-only — Ollama / DB 의존 없음. RecallCandidate 만 합성.
// dev doc §3 In 의 정량 규칙 그대로 검증:
//   - candidates.length === 0   → silence
//   - max(score) ∈ [0.4, 0.6)   → ghost
//   - max(score) ∈ [0.6, 0.8)   → suggestion
//   - max(score) ≥ 0.8          → strong
//
// 약화 규칙 (tokenContext > 2000 / recencyMs < 1500) 은 본 fixture 에서 *비활성화*
// 하기 위해 tokenContext=0, recencyMs=10000 고정.

const orchestrator = await import('@synapse/orchestrator');

const fixtures = [
  {
    label: 'silence',
    ctx: {
      userMessage: '오늘 저녁 뭐 먹지',
      candidates: [],
      recencyMs: 10_000,
      tokenContext: 0,
    },
    expect: 'silence',
  },
  {
    label: 'ghost',
    ctx: {
      userMessage: '커피',
      candidates: [
        { conceptId: 'c-ghost-1', label: '카페', score: 0.45, source: 'semantic' },
      ],
      recencyMs: 10_000,
      tokenContext: 0,
    },
    expect: 'ghost',
  },
  {
    label: 'suggestion',
    ctx: {
      userMessage: '독서',
      candidates: [
        { conceptId: 'c-sug-1', label: '책', score: 0.7, source: 'semantic' },
      ],
      recencyMs: 10_000,
      tokenContext: 0,
    },
    expect: 'suggestion',
  },
  {
    label: 'strong',
    ctx: {
      userMessage: '주말 산책',
      candidates: [
        { conceptId: 'c-strong-1', label: '산책', score: 0.92, source: 'mixed' },
      ],
      recencyMs: 10_000,
      tokenContext: 0,
    },
    expect: 'strong',
  },
];

const counters = { silence: 0, ghost: 0, suggestion: 0, strong: 0 };
const failures = [];

for (const f of fixtures) {
  let result;
  try {
    result = orchestrator.decide(f.ctx);
  } catch (err) {
    failures.push(`fixture[${f.label}] threw: ${err?.message || err}`);
    continue;
  }
  const act = typeof result === 'string' ? result : result?.act;
  if (act !== f.expect) {
    failures.push(
      `fixture[${f.label}] expected act='${f.expect}', got '${act}' (raw=${JSON.stringify(result)})`,
    );
    continue;
  }
  counters[act] = (counters[act] ?? 0) + 1;
}

if (failures.length > 0) {
  for (const m of failures) console.error(m);
  process.exit(3);
}

const total =
  counters.silence + counters.ghost + counters.suggestion + counters.strong;
if (total !== 4) {
  console.error(
    `expected 4 decisions across 4 acts, got total=${total} (counters=${JSON.stringify(counters)})`,
  );
  process.exit(4);
}

process.stdout.write(
  `decisions=${total};silence=${counters.silence};ghost=${counters.ghost};suggestion=${counters.suggestion};strong=${counters.strong}`,
);
