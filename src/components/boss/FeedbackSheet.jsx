"use client";
import { useState } from "react";
import { C } from "./tokens";
import { feedback } from "../../lib/feedback";

export function FeedbackSheet({ open, type, trigger, screen, onClose }) {
  const [score, setScore] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [happened, setHappened] = useState("");
  const [doing, setDoing] = useState("");
  const [idea, setIdea] = useState("");
  const [showOffField, setShowOffField] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    setSubmitting(true);
    await feedback.submit({ type, trigger, score, message, screen });
    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setDone(false); onClose(); }, 1500);
  }

  function handleDismiss() {
    setScore(null);
    setMessage("");
    setHappened("");
    setDoing("");
    setIdea("");
    setShowOffField(false);
    onClose();
  }

  const btnStyle = {
    width: "100%", padding: "16px", borderRadius: 14, fontSize: 15,
    fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "inherit",
    marginTop: 16,
  };

  if (done) {
    return (
      <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
        <div className="anim-slide" style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "32px 24px 48px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>Thank you!</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 6 }}>Your feedback helps us make BOSS better.</div>
        </div>
      </div>
    );
  }

  if (type === "nps") {
    return (
      <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()} />
        <div className="anim-slide" onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Quick question 🙏</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, marginBottom: 20 }}>
            How likely are you to recommend BOSS to another tailor?
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 4 }}>
            {[0,1,2,3,4,5,6].map(n => (
              <button key={n} onClick={() => setScore(n)}
                style={{ width: 34, height: 40, borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", backgroundColor: score === n ? C.accent : C.s3, color: score === n ? "#fff" : C.text }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
            {[7,8,9,10].map(n => (
              <button key={n} onClick={() => setScore(n)}
                style={{ width: 44, height: 44, borderRadius: 10, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", backgroundColor: score === n ? C.accent : C.s3, color: score === n ? "#fff" : C.text }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 6px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.sub }}>Not at all</div>
            <div style={{ fontSize: 13, color: C.sub }}>Definitely yes</div>
          </div>
          {score !== null && score <= 8 && (
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="What's one thing we could do better?"
              style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 80, backgroundColor: C.s2, color: C.text, outline: "none" }} />
          )}
          <button onClick={handleSubmit} disabled={submitting || score === null}
            style={{ ...btnStyle, backgroundColor: C.accent, color: "#fff", opacity: submitting || score === null ? 0.5 : 1 }}>
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
          <button onClick={handleDismiss}
            style={{ background: "none", border: "none", fontSize: 14, color: C.sub, cursor: "pointer", fontFamily: "inherit", marginTop: 12, width: "100%", fontWeight: 600 }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (type === "bug") {
    return (
      <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()} />
        <div className="anim-slide" onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
          <button onClick={handleDismiss}
            style={{ position: "absolute", top: 16, right: 20, width: 32, height: 32, borderRadius: "50%", background: C.s3, color: C.sub, border: "none", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
            ✕
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 16 }}>Report a Problem</div>
          <textarea value={happened} onChange={e => setHappened(e.target.value)}
            placeholder="Describe what went wrong…"
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 90, backgroundColor: C.s2, color: C.text, outline: "none" }} />
          <div style={{ height: 12 }} />
          <textarea value={doing} onChange={e => setDoing(e.target.value)}
            placeholder="What were you trying to do?"
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 80, backgroundColor: C.s2, color: C.text, outline: "none" }} />
          <button onClick={async () => {
            setSubmitting(true);
            await feedback.submit({ type: "bug", trigger, score: null, message: happened + (doing ? "\n\nTrying to: " + doing : ""), screen });
            setSubmitting(false); setDone(true);
            setTimeout(() => { setDone(false); handleDismiss(); }, 1500);
          }} disabled={submitting || !happened.trim()}
            style={{ ...btnStyle, backgroundColor: C.red, color: "#fff", opacity: submitting || !happened.trim() ? 0.5 : 1 }}>
            {submitting ? "Sending…" : "Send Report"}
          </button>
          <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 10 }}>We read every report. Thank you.</div>
        </div>
      </div>
    );
  }

  if (type === "feature") {
    return (
      <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()} />
        <div className="anim-slide" onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
          <button onClick={handleDismiss}
            style={{ position: "absolute", top: 16, right: 20, width: 32, height: 32, borderRadius: "50%", background: C.s3, color: C.sub, border: "none", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
            ✕
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 16 }}>Suggest a Feature</div>
          <textarea value={idea} onChange={e => setIdea(e.target.value)}
            placeholder="I wish BOSS could…"
            style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 100, backgroundColor: C.s2, color: C.text, outline: "none" }} />
          <button onClick={async () => {
            setSubmitting(true);
            await feedback.submit({ type: "feature", trigger, score: null, message: idea, screen });
            setSubmitting(false); setDone(true);
            setTimeout(() => { setDone(false); handleDismiss(); }, 1500);
          }} disabled={submitting || !idea.trim()}
            style={{ ...btnStyle, backgroundColor: C.accent, color: "#fff", opacity: submitting || !idea.trim() ? 0.5 : 1 }}>
            {submitting ? "Sending…" : "Send Idea"}
          </button>
          <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginTop: 10 }}>Good ideas get built. We promise.</div>
        </div>
      </div>
    );
  }

  if (type === "micro") {
    if (trigger === "first_receipt") {
      return (
        <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()} />
          <div className="anim-slide" onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
            <div style={{ fontSize: 24, textAlign: "center", marginBottom: 8 }}>📲</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 6 }}>
              Receipt sent on WhatsApp!
            </div>
            <div style={{ fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
              Did everything look good to your customer?
            </div>
            {!showOffField ? (
              <>
                <button onClick={async () => {
                  await feedback.submit({ type: "micro", trigger, score: 5, message: "Looks great", screen });
                  setDone(true); setTimeout(() => { setDone(false); handleDismiss(); }, 1500);
                }} style={{ ...btnStyle, backgroundColor: C.green, color: "#fff" }}>
                  Looks great ✓
                </button>
                <div style={{ height: 10 }} />
                <button onClick={() => setShowOffField(true)}
                  style={{ ...btnStyle, backgroundColor: C.s3, color: C.text }}>
                  Something was off
                </button>
              </>
            ) : (
              <>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="What was off?"
                  style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 60, backgroundColor: C.s2, color: C.text, outline: "none" }} />
                <button onClick={async () => {
                  await feedback.submit({ type: "micro", trigger, score: 1, message: message || "Something was off", screen });
                  setDone(true); setTimeout(() => { setDone(false); handleDismiss(); }, 1500);
                }} style={{ ...btnStyle, backgroundColor: C.accent, color: "#fff" }}>
                  Send Feedback
                </button>
              </>
            )}
            <button onClick={handleDismiss}
              style={{ background: "none", border: "none", fontSize: 14, color: C.sub, cursor: "pointer", fontFamily: "inherit", marginTop: 12, width: "100%", fontWeight: 600 }}>
              Skip
            </button>
          </div>
        </div>
      );
    }

    const microTitle = trigger === "5th_order"
      ? "You've saved 5 orders! ✂️"
      : "Payment recorded! 💰";
    const microQuestion = trigger === "5th_order"
      ? "How easy was adding that order?"
      : "How easy was recording that payment?";

    return (
      <div onClick={handleDismiss} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()} />
        <div className="anim-slide" onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, background: C.s1, borderRadius: "32px 32px 0 0", padding: "28px 24px 48px", width: "100%" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{microTitle}</div>
          <div style={{ fontSize: 14, color: C.sub, marginBottom: 16 }}>{microQuestion}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setScore(n)}
                style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", opacity: score !== null && n <= score ? 1 : 0.3, transition: "opacity 0.15s", padding: 4 }}>
                ★
              </button>
            ))}
          </div>
          {score !== null && (
            <>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder={trigger === "5th_order" ? "Anything that felt difficult?" : "Anything that felt difficult?"}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "none", minHeight: 70, backgroundColor: C.s2, color: C.text, outline: "none" }} />
              <button onClick={handleSubmit} disabled={submitting}
                style={{ ...btnStyle, backgroundColor: C.accent, color: "#fff", opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "Sending…" : "Send Feedback"}
              </button>
            </>
          )}
          <button onClick={handleDismiss}
            style={{ background: "none", border: "none", fontSize: 14, color: C.sub, cursor: "pointer", fontFamily: "inherit", marginTop: 12, width: "100%", fontWeight: 600 }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
