// screens.jsx — composed iOS frames for each Synapse moment

const { useState: useSt, useEffect: useEf, useRef: useRf } = React;

// Wrapper — just paper bg and base font
function PaperFrame({ children, dark, keyboard, lang = "ko" }) {
  // We render our own status bar + content; ios frame from starter expects nav too — skip its built-ins, use bare device.
  return (
    <IOSDevice dark={dark} keyboard={false}>
      <div className="paper-grain" style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        fontFamily: "var(--sans)",
      }}>
        {/* status bar overlay handled by IOSDevice itself */}
        {children}
      </div>
      {keyboard && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30 }}>
          <IOSKeyboard dark={dark}/>
        </div>
      )}
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Onboarding — empty state, first-run
// ─────────────────────────────────────────────────────────────
function OnboardingScreen({ lang = "ko" }) {
  const c = COPY[lang];
  return (
    <PaperFrame lang={lang}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "100px 28px 60px" }}>
        <div>
          <SynapseGlyph size={42}/>
          <h1 style={{
            fontFamily: "var(--serif)", fontSize: 40, fontWeight: 600,
            color: "var(--ink)", letterSpacing: -1.2, lineHeight: 1.05, margin: "28px 0 0",
          }}>{c.onboard.hi}</h1>
          <p style={{
            fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.4,
            color: "var(--ink-soft)", letterSpacing: -0.3, marginTop: 14,
            whiteSpace: "pre-line", textWrap: "balance",
          }}>{c.onboard.sub}</p>

          {/* hint with three faint synapse dots showing "future memories" */}
          <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--synapse)", opacity: 0.4,
                  animation: `synapse-pulse 2.4s ease-in-out ${i * 0.4}s infinite`,
                }}/>
              ))}
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: 0.4, textTransform: "uppercase" }}>
              {c.onboard.hint}
            </span>
          </div>
        </div>

        <div>
          <button style={{
            width: "100%", padding: "16px 0", borderRadius: 100,
            background: "var(--ink)", color: "var(--paper)",
            fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600,
            border: "none", letterSpacing: -0.2, cursor: "pointer",
          }}>{c.onboard.cta}</button>
          <div style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: 0.5, textTransform: "uppercase" }}>
            {c.tagline}
          </div>
        </div>
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. First conversation — capture animation
// ─────────────────────────────────────────────────────────────
function FirstChatScreen({ lang = "ko" }) {
  const c = COPY[lang];
  const conv = lang === "ko"
    ? [
      { role: "user", text: "오늘 처음으로 이 앱을 써봅니다." },
      { role: "ai", text: "환영해요. 무엇이든 떠오르는 대로 적어보세요. 정리하지 않아도 괜찮아요." },
      { role: "user", text: "최근에 일이 잘 안 풀려서, 잠깐 멈춰서 생각을 정리하고 싶어요." }
    ]
    : [
      { role: "user", text: "First time using this app." },
      { role: "ai", text: "Welcome. Write whatever comes to mind — no need to organize." },
      { role: "user", text: "Lately work hasn't been clicking. I want to pause and think." }
    ];

  return (
    <PaperFrame lang={lang} keyboard>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "첫 대화" : "first conversation"} density={1} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden", paddingBottom: 8 }}>
        {conv.map((m, i) => (
          m.role === "user" ? <UserBubble key={i}>{m.text}</UserBubble> : <AIBubble key={i}>{m.text}</AIBubble>
        ))}
        <CaptureToast
          label={c.captured}
          concepts={lang === "ko" ? "멈춤 · 일의 리듬 · 정리하고 싶음" : "pausing · rhythm of work · wanting to organize"}
        />
        <div style={{ padding: "0 16px", marginTop: 4, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)", letterSpacing: 0.4, textTransform: "uppercase" }}>
          {c.capturedSub}
        </div>
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Ghost Hint — subtle while typing
// ─────────────────────────────────────────────────────────────
function GhostHintScreen({ lang = "ko" }) {
  const c = COPY[lang];
  const userTyping = lang === "ko"
    ? "신뢰는 어떻게 만들어지는 걸까"
    : "how does trust actually get built";

  return (
    <PaperFrame lang={lang} keyboard>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "Ghost Hint · 레벨 1" : "ghost hint · level 1"} density={2} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserBubble>{lang === "ko" ? "회사에서 신뢰를 잃은 동료가 있어요." : "There's a coworker I've lost trust in."}</UserBubble>
        <AIBubble>{lang === "ko" ? "쉽지 않은 상황이네요. 어떤 점에서 신뢰가 무너졌나요?" : "That sounds hard. Where did the trust break?"}</AIBubble>
      </div>
      <Composer
        placeholder={c.placeholder}
        value={userTyping}
        ghostHint={
          <GhostHint
            label={c.ghostLabel}
            days={lang === "ko" ? "32일 전" : "32 days ago"}
            text={lang === "ko" ? "신뢰는 약속을 지키는 빈도가 아니라, 약속하지 않은 것을 지키는 빈도다." : "Trust isn't keeping promises — it's keeping the things you didn't promise."}
          />
        }
      />
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Suggestion — post-send
// ─────────────────────────────────────────────────────────────
function SuggestionScreen({ lang = "ko" }) {
  const c = COPY[lang];
  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "Suggestion · 레벨 2" : "suggestion · level 2"} density={2} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserBubble>{lang === "ko" ? "오늘 글이 잘 안 써져요." : "Can't write today."}</UserBubble>
        <AIBubble hasMemory>{lang === "ko" ? "오늘은 어떤 글을 쓰려고 했어요?" : "What were you trying to write?"}</AIBubble>
        <SuggestionCard
          label={c.suggestionLabel}
          concept={lang === "ko" ? "글쓰기의 리듬" : "Rhythm of writing"}
          text={lang === "ko" ? "아침에 쓴 글은 다르다 — 더 단단하다." : "Morning prose is different — firmer."}
          days={lang === "ko" ? "8일 전" : "8 days ago"}
          dismissText={c.dismiss}
          expandText={c.expand}
        />
        <UserBubble>{lang === "ko" ? "마케팅 메시지 초안이요." : "A marketing message draft."}</UserBubble>
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Strong Recall — full bubble
// ─────────────────────────────────────────────────────────────
function StrongRecallScreen({ lang = "ko" }) {
  const c = COPY[lang];
  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "Strong Recall · 레벨 3" : "strong recall · level 3"} density={3} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserBubble>{lang === "ko" ? "이직 제안을 받았는데 결정을 빨리 해야 해요." : "Got a job offer and need to decide fast."}</UserBubble>
        <AIBubble hasMemory>{lang === "ko" ? "잠시만요 — 예전에 비슷한 상황에서 남긴 생각이 있어요." : "One moment — you've left a thought about a moment like this before."}</AIBubble>
        <StrongRecall
          label={c.strongLabel}
          concept={lang === "ko" ? "조급함" : "On hurry"}
          text={lang === "ko" ? "조급할 때 결정한 건 거의 다 후회했다." : "Almost every decision I made in a hurry, I regretted."}
          days={lang === "ko" ? "47일 전" : "47 days ago"}
          why={lang === "ko" ? "'빨리 결정해야 한다'는 표현이 47일 전 메모와 강하게 연결됐어요." : "The phrase 'decide fast' linked strongly to a note from 47 days ago."}
        />
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Hyper-Recall — the centerpiece
// ─────────────────────────────────────────────────────────────
function HyperRecallScreen({ lang = "ko" }) {
  const c = COPY[lang];
  const demo = lang === "ko" ? DEMO_KO : DEMO_EN;
  const hyper = demo.find(d => d.kind === "hyper");
  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "Hyper-Recall" : "hyper-recall"} density={4} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserBubble>{demo[0].text}</UserBubble>
        <AIBubble hasMemory>{demo[3].text}</AIBubble>
        <HyperRecall
          label={c.hyperLabel}
          days={hyper.days}
          daysLabel={lang === "ko" ? "일 전" : "days ago"}
          pastConcept={hyper.pastConcept}
          pastText={hyper.pastText}
          bridges={hyper.bridges}
          why={hyper.why}
          whyLabel={c.why}
          sourcesLabel={c.sources}
        />
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Memory Inspector — list/feed of remembered concepts
// ─────────────────────────────────────────────────────────────
function InspectorScreen({ lang = "ko" }) {
  const c = COPY[lang];
  const mems = lang === "ko" ? MEMORIES_KO : MEMORIES_EN;
  const kindLabel = (k) => {
    const map = lang === "ko"
      ? { reflection: "성찰", question: "질문", insight: "인사이트", rule: "원칙", source: "출처", idea: "아이디어" }
      : { reflection: "reflection", question: "question", insight: "insight", rule: "rule", source: "source", idea: "idea" };
    return map[k] || k;
  };
  return (
    <PaperFrame lang={lang}>
      <div style={{
        padding: "60px 18px 14px", borderBottom: "0.5px solid var(--rule)",
        background: "var(--paper)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <SynapseGlyph size={22}/>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: 0.5, textTransform: "uppercase" }}>{c.appName}</span>
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.8, margin: 0, lineHeight: 1.1 }}>{c.inspector}</h1>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13.5, color: "var(--ink-mute)", marginTop: 4, fontStyle: "italic" }}>{c.inspectorSub}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600, color: "var(--synapse-deep)", letterSpacing: -0.5 }}>{mems.length}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-mute)", letterSpacing: 0.4, textTransform: "uppercase" }}>{lang === "ko" ? "기억" : "memories"}</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600, color: "var(--synapse-deep)", letterSpacing: -0.5, marginLeft: 12 }}>{mems.reduce((s,m) => s + m.links, 0)}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-mute)", letterSpacing: 0.4, textTransform: "uppercase" }}>{lang === "ko" ? "연결" : "links"}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0 32px" }}>
        {mems.map((m, i) => (
          <div key={m.id} style={{
            padding: "14px 18px", borderBottom: "0.5px solid var(--rule)",
            position: "relative",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--synapse-deep)", letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>
                {kindLabel(m.kind)}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)" }}>·</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-mute)" }}>{m.date}</span>
              <span style={{ flex: 1 }}/>
              {/* density bars */}
              <div style={{ display: "flex", gap: 2 }}>
                {[0,1,2,3].map(d => (
                  <span key={d} style={{
                    width: 2.5, height: 8, borderRadius: 1,
                    background: d < m.density ? "var(--synapse)" : "var(--rule)",
                    opacity: d < m.density ? 1 : 0.5,
                  }}/>
                ))}
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-mute)", marginLeft: 4 }}>·{m.links}</span>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.2, marginBottom: 2 }}>
              {m.concept}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.45, fontStyle: "italic", textWrap: "pretty" }}>
              "{m.text}"
            </div>
          </div>
        ))}
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Empty / Loading / Error states
// ─────────────────────────────────────────────────────────────
function EmptyStateScreen({ lang = "ko", state = "empty" }) {
  const c = COPY[lang];
  if (state === "empty") {
    return (
      <PaperFrame lang={lang}>
        <ChatHeader title={c.inspector} subtitle={lang === "ko" ? "비어 있음" : "empty"} lang={lang}/>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          {/* faint dotted circle — empty graph */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", border: "1px dashed var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SynapseGlyph size={28} active={false} hue="var(--ink-faint)"/>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", fontWeight: 600, letterSpacing: -0.3 }}>{c.empty}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 13.5, color: "var(--ink-mute)", marginTop: 4, fontStyle: "italic" }}>{c.emptySub}</div>
          </div>
        </div>
      </PaperFrame>
    );
  }
  if (state === "loading") {
    return (
      <PaperFrame lang={lang}>
        <ChatHeader title={c.appName} subtitle={lang === "ko" ? "그래프 탐색 중" : "searching graph"} lang={lang} density={2}/>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 18 }}>
          {/* orbiting nodes */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--synapse)", boxShadow: "0 0 14px var(--synapse-glow)" }}/>
            </div>
            {[0, 0.4, 0.8, 1.2, 1.6].map((d, i) => (
              <div key={i} style={{ position: "absolute", inset: 0, animation: `node-orbit 2.4s linear ${d}s infinite`, transformOrigin: "center" }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: "50%", background: "var(--synapse)", opacity: 0.5 }}/>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: 0.6, textTransform: "uppercase" }}>
            {lang === "ko" ? "관련 기억 찾는 중" : "finding related"}
          </div>
        </div>
      </PaperFrame>
    );
  }
  // error
  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "오류" : "error"} lang={lang}/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--ink-faint)" }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <line x1="10" y1="10" x2="26" y2="26" stroke="var(--ink-mute)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3"/>
            <circle cx="10" cy="10" r="2" fill="var(--ink-faint)"/>
            <circle cx="26" cy="26" r="2" fill="var(--ink-faint)"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)", fontWeight: 600, letterSpacing: -0.3 }}>{c.error}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink-mute)", marginTop: 3, fontStyle: "italic" }}>{c.errorSub}</div>
        </div>
        <button style={{
          padding: "10px 22px", borderRadius: 100, background: "var(--ink)", color: "var(--paper)",
          fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", letterSpacing: -0.1,
        }}>{c.retry}</button>
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. Humble Retraction
// ─────────────────────────────────────────────────────────────
function HumbleScreen({ lang = "ko" }) {
  const c = COPY[lang];
  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "Humble Retraction" : "humble retraction"} density={2} lang={lang}/>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserBubble>{lang === "ko" ? "오늘 발표 어떻게 했어요?" : "How was today's presentation?"}</UserBubble>
        <AIBubble hasMemory>{lang === "ko" ? "발표 후의 안도감을 자주 적어두셨죠. 이번엔 어떠셨어요?" : "You often write about the relief after a talk. How was it this time?"}</AIBubble>
        <SuggestionCard
          label={c.suggestionLabel}
          concept={lang === "ko" ? "주말의 리듬" : "Weekend rhythm"}
          text={lang === "ko" ? "토요일 오전은 비워두는 게 가장 생산적이다." : "Empty Saturday mornings are the most productive."}
          days={lang === "ko" ? "76일 전" : "76 days ago"}
          dismissText={c.dismiss}
          expandText={c.expand}
        />
        <HumbleRetraction text={c.humble}/>
        <UserBubble>{lang === "ko" ? "괜찮아요." : "It's okay."}</UserBubble>
      </div>
    </PaperFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. Live demo screen — replays scripted conversation
// ─────────────────────────────────────────────────────────────
function DemoScreen({ lang = "ko", playToken = 0 }) {
  const c = COPY[lang];
  const demo = lang === "ko" ? DEMO_KO : DEMO_EN;
  const [step, setStep] = useSt(0);
  const scrollRef = useRf(null);

  useEf(() => {
    setStep(0);
    const timeouts = [];
    let t = 800;
    demo.forEach((d, i) => {
      const wait = d.kind === "typing" ? 1100 : d.kind === "hyper" ? 1900 : d.kind === "capture" ? 1100 : d.kind === "msg" && d.role === "ai" ? 1500 : 1300;
      timeouts.push(setTimeout(() => setStep(i + 1), t));
      t += wait;
    });
    // loop
    timeouts.push(setTimeout(() => setStep(0), t + 4000));
    return () => timeouts.forEach(clearTimeout);
  }, [playToken, lang]);

  useEf(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step]);

  // Filter typing → only show one at a time
  const visible = demo.slice(0, step);
  // Replace the typing item with a typing bubble component, then once next msg appears, drop it
  const items = [];
  visible.forEach((d, i) => {
    if (d.kind === "typing") {
      // only render typing if it's the last visible item
      if (i === visible.length - 1) items.push({ ...d, _i: i });
    } else {
      items.push({ ...d, _i: i });
    }
  });

  return (
    <PaperFrame lang={lang}>
      <ChatHeader title={c.appName} subtitle={lang === "ko" ? "데모 · 자동 재생" : "demo · auto-playing"} density={Math.min(4, Math.max(1, Math.floor(step / 1.5)))} lang={lang}/>
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", paddingBottom: 12, scrollBehavior: "smooth" }}>
        {items.map((d) => {
          if (d.kind === "msg" && d.role === "user") return <UserBubble key={d._i}>{d.text}</UserBubble>;
          if (d.kind === "msg" && d.role === "ai") return <AIBubble key={d._i} hasMemory>{d.text}</AIBubble>;
          if (d.kind === "typing") return <TypingBubble key={d._i}/>;
          if (d.kind === "capture") return (
            <CaptureToast key={d._i} label={c.captured} concepts={d.text}/>
          );
          if (d.kind === "hyper") return (
            <HyperRecall
              key={d._i}
              label={c.hyperLabel}
              days={d.days}
              daysLabel={lang === "ko" ? "일 전" : "days ago"}
              pastConcept={d.pastConcept}
              pastText={d.pastText}
              bridges={d.bridges}
              why={d.why}
              whyLabel={c.why}
              sourcesLabel={c.sources}
            />
          );
          return null;
        })}
      </div>
    </PaperFrame>
  );
}

Object.assign(window, {
  OnboardingScreen, FirstChatScreen, GhostHintScreen, SuggestionScreen,
  StrongRecallScreen, HyperRecallScreen, InspectorScreen,
  EmptyStateScreen, HumbleScreen, DemoScreen, PaperFrame,
});
