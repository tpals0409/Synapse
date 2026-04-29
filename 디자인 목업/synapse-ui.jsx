// synapse-ui.jsx — building blocks for Synapse chat UI
// Bubbles, Recall surfaces, synapse pulse, capture animation

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Synapse glyph — animated neural pulse
// ─────────────────────────────────────────────────────────────
function SynapseGlyph({ size = 28, active = true, hue = "var(--synapse)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="sg-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={hue} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={hue} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {active && <circle cx="16" cy="16" r="14" fill="url(#sg-glow)" style={{ animation: "synapse-pulse 2.6s ease-in-out infinite" }}/>}
      <line x1="6" y1="10" x2="16" y2="16" stroke={hue} strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
      <line x1="26" y1="10" x2="16" y2="16" stroke={hue} strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
      <line x1="6" y1="22" x2="16" y2="16" stroke={hue} strokeWidth="0.9" strokeLinecap="round" opacity="0.4"/>
      <line x1="26" y1="22" x2="16" y2="16" stroke={hue} strokeWidth="0.9" strokeLinecap="round" opacity="0.4"/>
      <circle cx="6" cy="10" r="1.4" fill={hue} opacity="0.7"/>
      <circle cx="26" cy="10" r="1.4" fill={hue} opacity="0.7"/>
      <circle cx="6" cy="22" r="1.4" fill={hue} opacity="0.55"/>
      <circle cx="26" cy="22" r="1.4" fill={hue} opacity="0.55"/>
      <circle cx="16" cy="16" r="2.6" fill={hue}/>
      {active && <circle cx="16" cy="16" r="3" fill="none" stroke={hue} strokeWidth="1.2" style={{ animation: "synapse-ripple 2.2s ease-out infinite", transformOrigin: "16px 16px" }}/>}
    </svg>
  );
}

// Tiny inline pulse dot
function PulseDot({ color = "var(--synapse)", size = 6 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: color, position: "relative", animation: "synapse-pulse 2s ease-in-out infinite",
      boxShadow: `0 0 8px ${color}`,
    }}/>
  );
}

// ─────────────────────────────────────────────────────────────
// Header — chat title with pulse
// ─────────────────────────────────────────────────────────────
function ChatHeader({ title, subtitle, density = 0, lang = "ko" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "60px 18px 14px", borderBottom: "0.5px solid var(--rule)",
      background: "var(--paper)", position: "relative", zIndex: 5,
    }}>
      <SynapseGlyph size={26}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 1, letterSpacing: 0.2, textTransform: "uppercase" }}>
          {subtitle}
        </div>
      </div>
      {density > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 3, height: 12 - i*1.5, borderRadius: 1,
                background: i < density ? "var(--synapse)" : "var(--rule)",
                opacity: i < density ? 1 : 0.6,
              }}/>
            ))}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--ink-mute)", letterSpacing: 0.4 }}>
            {lang === "ko" ? "그래프 밀도" : "DENSITY"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Message bubbles — paper journal style
// ─────────────────────────────────────────────────────────────
function UserBubble({ children, time }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 16px", animation: "ink-rise 0.4s ease-out both" }}>
      <div style={{ maxWidth: "78%" }}>
        <div style={{
          background: "var(--ink)", color: "var(--paper)",
          fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.5, letterSpacing: -0.1,
          padding: "10px 14px", borderRadius: "18px 18px 4px 18px",
          textWrap: "pretty",
        }}>{children}</div>
        {time && <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)", textAlign: "right", marginTop: 2, marginRight: 4 }}>{time}</div>}
      </div>
    </div>
  );
}

function AIBubble({ children, time, hasMemory = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", padding: "6px 16px", animation: "ink-rise 0.4s ease-out both", gap: 8 }}>
      <div style={{ width: 22, flexShrink: 0, paddingTop: 4 }}>
        <SynapseGlyph size={20}/>
      </div>
      <div style={{ maxWidth: "78%" }}>
        <div style={{
          color: "var(--ink)",
          fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.55, letterSpacing: -0.1,
          padding: "8px 2px", textWrap: "pretty",
        }}>{children}</div>
        {hasMemory && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, paddingLeft: 2 }}>
            <PulseDot size={5}/>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-mute)", letterSpacing: 0.3, textTransform: "uppercase" }}>
              memory linked
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", padding: "8px 16px", gap: 8, alignItems: "center" }}>
      <SynapseGlyph size={20}/>
      <div style={{ display: "flex", gap: 4, padding: "8px 2px" }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: "var(--ink-mute)",
            display: "inline-block", animation: `typing-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Memory Capture toast — "방금 뭔가 기억됨"
// ─────────────────────────────────────────────────────────────
function CaptureToast({ concepts, label, sublabel }) {
  return (
    <div style={{
      margin: "4px 16px 8px", padding: "8px 12px",
      borderRadius: 12, background: "var(--synapse-mist)",
      display: "flex", alignItems: "center", gap: 10,
      animation: "ink-rise 0.5s ease-out both",
      border: "0.5px solid color-mix(in oklch, var(--synapse) 25%, transparent)",
    }}>
      <div style={{ position: "relative", width: 22, height: 22, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--synapse)", opacity: 0.18, animation: "synapse-ripple 2s ease-out infinite" }}/>
        <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "var(--synapse)", boxShadow: "0 0 10px var(--synapse-glow)" }}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--synapse-deep)", letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: "var(--ink)", lineHeight: 1.4, marginTop: 2, fontStyle: "italic" }}>
          {concepts}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ghost Hint — under-input faded suggestion (Level 1)
// ─────────────────────────────────────────────────────────────
function GhostHint({ text, days, label }) {
  return (
    <div style={{
      padding: "6px 18px 4px",
      display: "flex", alignItems: "flex-start", gap: 8,
      animation: "ghost-breathe 3s ease-in-out infinite",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="7" cy="7" r="2" fill="var(--synapse)" opacity="0.6"/>
        <circle cx="7" cy="7" r="5" fill="none" stroke="var(--synapse)" strokeWidth="0.5" strokeDasharray="1 2" opacity="0.4"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--synapse-deep)", letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
          {days && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)" }}>· {days}</span>}
        </div>
        <div style={{
          fontFamily: "var(--serif)", fontSize: 13.5, color: "var(--ink-mute)",
          lineHeight: 1.45, fontStyle: "italic", marginTop: 1,
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {text}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Suggestion card — inline, post-send (Level 2)
// ─────────────────────────────────────────────────────────────
function SuggestionCard({ concept, text, days, label, onDismiss, onExpand, dismissText, expandText }) {
  return (
    <div style={{
      margin: "8px 16px 8px 44px", position: "relative",
      animation: "recall-emerge 0.6s cubic-bezier(.2,.7,.3,1) both",
    }}>
      {/* thread connecting up to AI bubble */}
      <svg width="20" height="18" viewBox="0 0 20 18" style={{ position: "absolute", top: -14, left: -28 }}>
        <path d="M3 0 Q 3 10, 18 14" stroke="var(--synapse)" strokeWidth="0.8" fill="none" strokeDasharray="1.5 2" opacity="0.5"/>
        <circle cx="18" cy="14" r="2" fill="var(--synapse)"/>
      </svg>
      <div style={{
        background: "var(--paper-deep)", borderRadius: 14,
        padding: "10px 12px", border: "0.5px solid var(--rule)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <PulseDot size={5}/>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--synapse-deep)", letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-mute)" }}>{days}</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.1 }}>
          {concept}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.45, marginTop: 3, fontStyle: "italic" }}>
          "{text}"
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onExpand} style={{
            fontFamily: "var(--sans)", fontSize: 11, color: "var(--synapse-deep)",
            background: "transparent", border: "none", padding: "2px 0", cursor: "pointer",
            fontWeight: 500, letterSpacing: 0.1,
          }}>{expandText} →</button>
          <button onClick={onDismiss} style={{
            fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-mute)",
            background: "transparent", border: "none", padding: "2px 0", cursor: "pointer",
            marginLeft: "auto", letterSpacing: 0.1,
          }}>{dismissText}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Strong Recall — full memory bubble (Level 3)
// ─────────────────────────────────────────────────────────────
function StrongRecall({ concept, text, days, label, why }) {
  return (
    <div style={{
      margin: "10px 16px", animation: "recall-emerge 0.7s cubic-bezier(.2,.7,.3,1) both",
    }}>
      <div style={{
        position: "relative", borderRadius: 18, padding: "14px 14px 12px",
        background: "linear-gradient(180deg, var(--synapse-mist), var(--paper-deep))",
        border: "0.5px solid color-mix(in oklch, var(--synapse) 30%, transparent)",
        boxShadow: "0 0 0 6px color-mix(in oklch, var(--synapse) 6%, transparent), 0 6px 20px color-mix(in oklch, var(--synapse) 12%, transparent)",
      }}>
        {/* corner mark — past */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="3" fill="var(--synapse)"/>
            <circle cx="7" cy="7" r="6" fill="none" stroke="var(--synapse)" strokeWidth="0.6" opacity="0.5"/>
          </svg>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--synapse-deep)", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--synapse-deep)", fontWeight: 500 }}>{days}</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.1, marginBottom: 4 }}>
          {concept}
        </div>
        <blockquote style={{
          fontFamily: "var(--serif)", fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5,
          margin: 0, paddingLeft: 10, borderLeft: "2px solid var(--synapse)",
          fontStyle: "italic", letterSpacing: -0.1,
        }}>
          {text}
        </blockquote>
        {why && (
          <div style={{ marginTop: 8, fontFamily: "var(--sans)", fontSize: 10.5, color: "var(--ink-mute)", lineHeight: 1.4 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--synapse-deep)", letterSpacing: 0.3, textTransform: "uppercase", marginRight: 6 }}>why</span>
            {why}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hyper-Recall — the centerpiece moment
// Past + Present meet → cross-domain bridge, temporal contrast
// ─────────────────────────────────────────────────────────────
function HyperRecall({ days, pastConcept, pastText, bridges, why, label, daysLabel, whyLabel, sourcesLabel }) {
  return (
    <div style={{
      margin: "12px 12px", animation: "recall-emerge 0.9s cubic-bezier(.2,.7,.3,1) both",
    }}>
      <div style={{
        position: "relative", borderRadius: 22, padding: "16px 16px 14px",
        background: "var(--paper)",
        border: "0.5px solid color-mix(in oklch, var(--synapse) 35%, transparent)",
        boxShadow:
          "0 0 0 8px color-mix(in oklch, var(--synapse) 5%, transparent)," +
          "0 0 0 16px color-mix(in oklch, var(--synapse) 2%, transparent)," +
          "0 12px 36px color-mix(in oklch, var(--synapse) 16%, transparent)",
        overflow: "hidden",
      }}>
        {/* shimmer header line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, var(--synapse) 20%, var(--synapse-glow) 50%, var(--synapse) 80%, transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer-line 3s linear infinite",
        }}/>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <SynapseGlyph size={22}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--synapse-deep)", letterSpacing: 0.7, textTransform: "uppercase", fontWeight: 700 }}>
              {label}
            </div>
          </div>
        </div>

        {/* Temporal bridge visual: past ↔ now */}
        <TemporalBridge days={days} daysLabel={daysLabel}/>

        {/* Past memory */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.1 }}>
            {pastConcept}
          </div>
          <blockquote style={{
            fontFamily: "var(--serif)", fontSize: 14.5, color: "var(--ink)", lineHeight: 1.55,
            margin: "4px 0 0", paddingLeft: 10, borderLeft: "2px solid var(--synapse)",
            fontStyle: "italic", letterSpacing: -0.1, textWrap: "pretty",
          }}>
            {pastText}
          </blockquote>
        </div>

        {/* Bridge concepts */}
        {bridges && bridges.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-mute)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6 }}>
              {sourcesLabel}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {bridges.map((b, i) => (
                <span key={i} style={{
                  fontFamily: "var(--sans)", fontSize: 11, fontWeight: 500,
                  color: "var(--synapse-deep)",
                  background: "color-mix(in oklch, var(--synapse) 12%, transparent)",
                  padding: "3px 8px", borderRadius: 999,
                  border: "0.5px solid color-mix(in oklch, var(--synapse) 25%, transparent)",
                }}>{b}</span>
              ))}
            </div>
          </div>
        )}

        {/* Why */}
        {why && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--synapse-deep)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 3, fontWeight: 600 }}>
              {whyLabel}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.45 }}>
              {why}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Visual: past node ←—threads—→ present node, with day count
function TemporalBridge({ days, daysLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      {/* past node */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 60 }}>
        <div style={{ position: "relative", width: 22, height: 22 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "color-mix(in oklch, var(--synapse) 25%, transparent)" }}/>
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "var(--synapse)" }}/>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--ink-mute)", letterSpacing: 0.3, textTransform: "uppercase" }}>past</div>
      </div>

      {/* thread + day count */}
      <div style={{ flex: 1, position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
          <path d="M0 16 Q 50 4, 100 16 T 200 16" stroke="var(--synapse)" strokeWidth="0.8" fill="none" strokeDasharray="2 3" opacity="0.6"/>
          <path d="M0 16 Q 50 28, 100 16 T 200 16" stroke="var(--synapse-glow)" strokeWidth="0.6" fill="none" strokeDasharray="1.5 3" opacity="0.4"/>
        </svg>
        <div style={{
          position: "relative", zIndex: 1,
          fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--synapse-deep)",
          background: "var(--paper)", padding: "0 8px", letterSpacing: -0.3,
        }}>
          {days}<span style={{ fontFamily: "var(--mono)", fontSize: 9, marginLeft: 3, color: "var(--ink-mute)", fontWeight: 500, letterSpacing: 0.3, textTransform: "uppercase" }}>{daysLabel}</span>
        </div>
      </div>

      {/* present node */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 60 }}>
        <div style={{ position: "relative", width: 22, height: 22 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "color-mix(in oklch, var(--synapse) 25%, transparent)", animation: "synapse-pulse 2s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "var(--synapse-deep)", boxShadow: "0 0 10px var(--synapse-glow)" }}/>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--synapse-deep)", letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 600 }}>now</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Humble Retraction
// ─────────────────────────────────────────────────────────────
function HumbleRetraction({ text }) {
  return (
    <div style={{
      margin: "4px 16px 8px 44px", padding: "8px 12px",
      borderRadius: 12, background: "var(--paper-shade)",
      animation: "ink-rise 0.4s ease-out both",
      display: "flex", alignItems: "center", gap: 8,
      border: "0.5px dashed var(--ink-faint)",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
        <line x1="3" y1="3" x2="11" y2="11" stroke="var(--ink-mute)" strokeWidth="1" strokeLinecap="round"/>
        <line x1="11" y1="3" x2="3" y2="11" stroke="var(--ink-mute)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      <span style={{ fontFamily: "var(--serif)", fontSize: 12.5, color: "var(--ink-mute)", fontStyle: "italic" }}>
        {text}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composer — input bar with optional ghost-hint area above
// ─────────────────────────────────────────────────────────────
function Composer({ value, onChange, onSend, placeholder, ghostHint, sendIcon = true }) {
  return (
    <div style={{ background: "var(--paper)", borderTop: "0.5px solid var(--rule)" }}>
      {ghostHint && (
        <div style={{ borderBottom: "0.5px solid var(--rule)", background: "var(--paper-deep)" }}>
          {ghostHint}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 12px 14px" }}>
        <button style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "var(--paper-deep)", border: "0.5px solid var(--rule)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="12" stroke="var(--ink-mute)" strokeWidth="1.4" strokeLinecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="var(--ink-mute)" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
        <div style={{
          flex: 1, minHeight: 32, maxHeight: 80,
          background: "var(--paper-deep)", borderRadius: 18,
          padding: "7px 14px", display: "flex", alignItems: "center",
          fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink)",
          border: "0.5px solid var(--rule)",
          letterSpacing: -0.1,
        }}>
          {value ? value : <span style={{ color: "var(--ink-faint)" }}>{placeholder}</span>}
          {value !== undefined && <span style={{ display: "inline-block", width: 1.5, height: 16, background: "var(--synapse)", marginLeft: 1, animation: "caret-blink 1s steps(2) infinite" }}/>}
        </div>
        <button onClick={onSend} style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: value ? "var(--synapse)" : "var(--paper-deep)",
          border: value ? "none" : "0.5px solid var(--rule)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0, transition: "background .2s",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 11V3M3 7l4-4 4 4" stroke={value ? "var(--paper)" : "var(--ink-mute)"} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  SynapseGlyph, PulseDot, ChatHeader,
  UserBubble, AIBubble, TypingBubble,
  CaptureToast, GhostHint, SuggestionCard, StrongRecall, HyperRecall,
  HumbleRetraction, Composer, TemporalBridge,
});
