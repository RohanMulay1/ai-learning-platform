import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useChallengeStore } from "../../stores/store";
import { useLearnerStore } from "../../stores/learnerStore";
import { useProductivityStore } from "../../stores/productivityStore";
import { PomodoroWidget } from "../productivity/PomodoroWidget";
import { SAMPLE_CHALLENGES } from "../../data/sample";
import { cn, diffClass } from "../../lib/utils";
import { fireConfetti, showXPToast } from "../../lib/confetti";
import { generateTutorResponse, getProactiveMessage } from "../../agents/tutorAgent";
import type { TutorContext } from "../../agents/tutorAgent";
import type { ChallengeCandidate, SkillMastery } from "../../agents/recommendationAgent";

/* ── Skill graph (prerequisite map for recommendations) ─── */

const SKILL_GRAPH: SkillMastery[] = [
  { skillId: "Arrays & Hashing",   name: "Arrays & Hashing",   mastery: 0, prerequisites: [] },
  { skillId: "Two Pointers",       name: "Two Pointers",       mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Sliding Window",     name: "Sliding Window",     mastery: 0, prerequisites: ["Two Pointers"] },
  { skillId: "Stack",              name: "Stack",              mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Binary Search",      name: "Binary Search",      mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Linked List",        name: "Linked List",        mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Trees",              name: "Trees",              mastery: 0, prerequisites: ["Linked List"] },
  { skillId: "Graphs",             name: "Graphs",             mastery: 0, prerequisites: ["Trees"] },
  { skillId: "Dynamic Programming",name: "Dynamic Programming",mastery: 0, prerequisites: ["Trees", "Binary Search"] },
];

const ALL_CANDIDATES: ChallengeCandidate[] = SAMPLE_CHALLENGES.map(c => ({
  id: c.id,
  title: c.title,
  difficulty: c.difficulty as "easy" | "medium" | "hard",
  skillTags: c.skill_tags,
  expectedMs: c.estimated_time_minutes * 60_000,
  companies: c.companies,
}));

type Tab = "Problem" | "Examples" | "Hints" | "Discussion";

export function ChallengeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { code, setCode, language, setLanguage } = useChallengeStore();

  const challenge = SAMPLE_CHALLENGES.find(c => c.id === id) ?? SAMPLE_CHALLENGES[0];
  const expectedMs = challenge.estimated_time_minutes * 60_000;

  const store = useLearnerStore();
  const logActivity = useProductivityStore(s => s.logActivity);

  const [tab, setTab] = useState<Tab>("Problem");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [tutorOpen, setTutorOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; intent?: string }[]>([
    { role: "ai", text: "I'm your Socratic AI Tutor. I'll guide you with questions, not answers. What's your first thought on this problem?", intent: "opening" },
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [submitState, setSubmitState] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const chatRef = useRef<HTMLDivElement>(null);
  const sessionDepth = useRef(0);

  // ── Behavioral telemetry refs ───────────────────────────────────────────────
  const telemetryRef = useRef({
    firstCommitAt: 0 as number,         // epoch ms when first char was typed
    totalCharsTyped: 0,
    totalCharsDeleted: 0,
    executionCount: 0,
    lastActivityAt: Date.now(),
    paralysisWindows: 0,
    errorRepetitionMap: {} as Record<string, number>, // error type → count
    totalErrors: 0,
  });

  function handleEditorMount(editor: any) {
    // Track Time To First Commit and keystroke density
    editor.onDidChangeModelContent((e: any) => {
      const tel = telemetryRef.current;
      if (tel.firstCommitAt === 0) tel.firstCommitAt = Date.now();
      tel.lastActivityAt = Date.now();

      for (const change of e.changes) {
        const added = change.text.length;
        const removed = change.rangeLength;
        tel.totalCharsTyped += added;
        tel.totalCharsDeleted += removed;
      }
    });
  }

  // Idle/paralysis window detection — check every 30s if tab is visible
  useEffect(() => {
    const check = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const tel = telemetryRef.current;
      const idleSec = (Date.now() - tel.lastActivityAt) / 1000;
      if (idleSec >= 30) tel.paralysisWindows += 1;
    }, 30_000);
    return () => clearInterval(check);
  }, []);

  // Start session on mount
  useEffect(() => {
    store.startSession(challenge.id, challenge.title);
    const interval = setInterval(() => {
      setElapsedMs(e => {
        const next = e + 1000;
        store.updateSession({ lastCode: code });
        return next;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      store.endSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  // Proactive tutor nudges
  useEffect(() => {
    const check = setInterval(() => {
      const ctx: TutorContext = {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        difficulty: challenge.difficulty,
        elapsedMs,
        hintsUsed: revealedHints.length,
        submissionAttempts: store.activeSession?.submissionAttempts ?? 0,
        lastUserMessage: "",
        conversationDepth: sessionDepth.current,
        code,
      };
      const proactive = getProactiveMessage(ctx);
      if (proactive) {
        setMessages(m => {
          // Don't re-add same proactive message
          if (m.some(msg => msg.text === proactive)) return m;
          return [...m, { role: "ai", text: proactive, intent: "proactive" }];
        });
      }
    }, 30_000);
    return () => clearInterval(check);
  }, [challenge, elapsedMs, revealedHints.length, code, store.activeSession?.submissionAttempts]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const timerStr = `${String(Math.floor(elapsedMs / 60_000)).padStart(2, "0")}:${String(Math.floor((elapsedMs % 60_000) / 1000)).padStart(2, "0")}`;
  const timerColor = elapsedMs > expectedMs * 1.5 ? "text-[#f97386]" : elapsedMs > expectedMs ? "text-[#fbbf24]" : "text-[#4ae176]";

  // Live mastery estimate (rough) based on explanation quality
  const livemastery = Math.min(95, Math.max(5, (() => {
    const words = explanation.trim().split(/\s+/).length;
    const technical = ["hash", "map", "O(n)", "complement", "pointer", "window", "stack", "binary", "dp"].filter(k => explanation.toLowerCase().includes(k)).length;
    return 5 + words * 0.4 + technical * 5;
  })()));

  function revealHint(level: number) {
    if (revealedHints.includes(level)) return;
    setRevealedHints(prev => [...prev, level]);
    store.updateSession({ hintsUsed: revealedHints.length + 1 });
    setMessages(prev => [...prev, {
      role: "ai",
      text: `Hint ${level}: ${challenge.hints.find(h => h.level === level)?.content ?? "No more hints."}`,
      intent: "hint",
    }]);
    if (!tutorOpen) setTutorOpen(true);
  }

  function runCode() {
    telemetryRef.current.executionCount += 1;
    setRunning(true);
    setTimeout(() => {
      setOutput("3/3 Cases Passed · Runtime: 52ms · Memory: 16.2MB");
      setRunning(false);
    }, 800);
  }

  const handleSubmit = useCallback(() => {
    setSubmitState("running");
    const attempts = (store.activeSession?.submissionAttempts ?? 0) + 1;
    store.updateSession({ submissionAttempts: attempts, lastCode: code, lastExplanation: explanation });

    setTimeout(() => {
      const passed = code.trim().length > 30; // simulate: any non-trivial code passes
      if (!passed) {
        setSubmitState("failed");
        setOutput("0/3 Cases Passed — Review your logic and try again.");
        return;
      }

      setSubmitState("passed");
      setOutput("3/3 Cases Passed · Runtime: 52ms · Memory: 16.2MB");
      fireConfetti();
      showXPToast(50);

      // Compute behavioral telemetry signals for P_b calculation
      const tel = telemetryRef.current;
      const ttfcMs = tel.firstCommitAt > 0 ? tel.firstCommitAt - (Date.now() - elapsedMs) : 0;
      const totalEdits = tel.totalCharsTyped + tel.totalCharsDeleted;
      const rewriteDensity = totalEdits > 0 ? Math.min(1, tel.totalCharsDeleted / totalEdits) : 0;
      const errorRepFreq = tel.totalErrors > 0
        ? Object.values(tel.errorRepetitionMap).filter(n => n > 1).length / tel.totalErrors
        : 0;

      // Calculate mastery and save to store
      store.submitAttempt(
        {
          elapsedMs,
          expectedMs,
          hintsUsed: revealedHints.length,
          submissionAttempts: attempts,
          passed: true,
          explanation,
          code,
          conversationDepth: sessionDepth.current,
          challengeTitle: challenge.title,
          skillTags: challenge.skill_tags,
          difficulty: challenge.difficulty as "easy" | "medium" | "hard",
          telemetry: {
            timeToFirstCommitMs: Math.max(0, ttfcMs),
            rewriteDensityScore: rewriteDensity,
            executionFrequencyCount: tel.executionCount,
            paralysisWindowsCount: tel.paralysisWindows,
            hintVelocityRate: revealedHints.length / Math.max(1, elapsedMs / 60_000),
            errorRepetitionFrequency: errorRepFreq,
          },
        },
        ALL_CANDIDATES,
        SKILL_GRAPH
      );

      logActivity("challenges");
      // Navigate to recap after short celebration
      setTimeout(() => navigate(`/recap/${challenge.id}`), 1500);
    }, 1200);
  }, [code, explanation, elapsedMs, expectedMs, revealedHints.length, challenge, store, navigate]);

  function sendTutorMessage() {
    if (!tutorInput.trim()) return;
    const userMsg = tutorInput.trim();
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setTutorInput("");
    sessionDepth.current += 1;

    const ctx: TutorContext = {
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      difficulty: challenge.difficulty,
      elapsedMs,
      hintsUsed: revealedHints.length,
      submissionAttempts: store.activeSession?.submissionAttempts ?? 0,
      lastUserMessage: userMsg,
      conversationDepth: sessionDepth.current,
      code,
    };

    const { message, intent } = generateTutorResponse(userMsg, ctx);
    store.updateSession({ conversationDepth: sessionDepth.current });

    setTimeout(() => {
      setMessages(m => [...m, { role: "ai", text: message, intent }]);
    }, 600);
  }

  const diffColor = diffClass(challenge.difficulty);

  const INTENT_COLOR: Record<string, string> = {
    stuck: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
    asking_answer: "bg-[#f97386]/10 text-[#f97386] border-[#f97386]/20",
    showing_work: "bg-[#4ae176]/10 text-[#4ae176] border-[#4ae176]/20",
    asking_concept: "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20",
    edge_case: "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20",
    optimize: "bg-[#6c63ff]/10 text-[#6c63ff] border-[#6c63ff]/20",
    celebrate: "bg-[#4ae176]/10 text-[#4ae176] border-[#4ae176]/20",
    hint: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
    proactive: "bg-[#a8a7cf]/10 text-[#a8a7cf] border-[#a8a7cf]/20",
    opening: "bg-[#6c63ff]/10 text-[#6c63ff] border-[#6c63ff]/20",
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top bar */}
      <header className="flex justify-between items-center px-4 h-14 border-b border-[#1e1e2e] bg-[#0a0a0f] z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/challenges")}
            className="p-2 hover:bg-[#1e1e2e] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[#a8a7cf]">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-[#e2e8f0] font-bold text-base tracking-tight">{challenge.title}</h1>
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", diffColor)}>
              {challenge.difficulty}
            </span>
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              {challenge.companies.slice(0, 2).map(c => (
                <span key={c} className="px-2 py-0.5 rounded bg-[#12121a] text-[#a8a7cf] text-[10px] border border-[#1e1e2e]">{c}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer — color shifts with time pressure */}
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-md border text-sm font-mono",
            elapsedMs > expectedMs ? "bg-[#fbbf24]/10 border-[#fbbf24]/20" : "bg-[#1e1e2e] border-[#1e1e2e]"
          )}>
            <span className="material-symbols-outlined text-sm" style={{ color: timerColor.replace("text-", "").replace("[", "").replace("]", "") }}>timer</span>
            <span className={timerColor}>{timerStr}</span>
          </div>
          <div className="h-6 w-px bg-[#1e1e2e]" />
          <PomodoroWidget />
          <div className="h-6 w-px bg-[#1e1e2e]" />
          <button
            onClick={() => revealHint(revealedHints.length + 1)}
            disabled={revealedHints.length >= challenge.hints.length}
            className="px-3 py-1.5 rounded-lg border border-[#fbbf24]/30 text-[#fbbf24] text-sm hover:bg-[#fbbf24]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            Hint {revealedHints.length > 0 ? `(${revealedHints.length}/${challenge.hints.length})` : ""}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitState === "running" || submitState === "passed"}
            className={cn(
              "px-4 py-1.5 rounded-lg text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60",
              submitState === "passed" ? "bg-[#4ae176] shadow-[0_0_20px_rgba(74,225,118,0.4)]"
              : "bg-[#6c63ff] shadow-lg shadow-[#6c63ff]/20 hover:bg-[#675df9]"
            )}
          >
            {submitState === "running" ? "Checking…" : submitState === "passed" ? "Passed!" : "Submit"}
          </button>
          <button
            onClick={() => setTutorOpen(!tutorOpen)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              tutorOpen
                ? "bg-[#6c63ff] text-white shadow-[0_0_12px_rgba(108,99,255,0.4)]"
                : "bg-[#6c63ff]/20 border border-[#6c63ff]/30 text-[#c4c0ff] hover:bg-[#6c63ff]/30"
            )}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            Tutor
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT: Problem */}
        <section className="w-[48%] flex flex-col border-r border-[#1e1e2e] bg-[#0a0a0f] relative">
          <nav className="flex border-b border-[#1e1e2e] px-4 bg-[#111126]">
            {(["Problem", "Examples", "Hints", "Discussion"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-3 text-xs font-bold transition-colors",
                  tab === t ? "text-white border-b-2 border-[#6c63ff]" : "text-[#a8a7cf] hover:text-[#e2e8f0]"
                )}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {tab === "Problem" && (
              <div>
                <h2 className="text-xl font-bold text-[#e2e8f0] mb-4">Problem Statement</h2>
                <p className="text-[#a8a7cf] leading-relaxed text-sm mb-6">{challenge.description}</p>
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-[#e2e8f0] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">code</span>
                    Example 1
                  </h3>
                  {challenge.examples[0] && (
                    <div className="bg-[#12121a] p-4 rounded-xl border border-[#1e1e2e] font-mono text-xs">
                      <div className="mb-2"><span className="text-[#a8a7cf]">Input: </span><span className="text-[#a5d6ff]">{challenge.examples[0].input}</span></div>
                      <div className="mb-2"><span className="text-[#a8a7cf]">Output: </span><span className="text-[#4ae176]">{challenge.examples[0].output}</span></div>
                      {challenge.examples[0].explanation && (
                        <div className="text-[#a8a7cf] italic">{challenge.examples[0].explanation}</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#e2e8f0] mb-3">Constraints:</h3>
                  <ul className="space-y-2 list-none p-0">
                    {challenge.constraints.split("\n").filter(Boolean).map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#a8a7cf]">
                        <span className="text-[#6c63ff]">•</span><span>{c.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === "Examples" && (
              <div className="space-y-4">
                {challenge.examples.map((ex, i) => (
                  <div key={i} className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 text-sm font-mono">
                    <div className="text-[10px] font-bold text-[#a8a7cf] uppercase mb-3">Example {i + 1}</div>
                    <div className="mb-2"><span className="text-[#a8a7cf]">Input: </span><span className="text-[#a5d6ff]">{ex.input}</span></div>
                    <div className="mb-2"><span className="text-[#a8a7cf]">Output: </span><span className="text-[#4ae176]">{ex.output}</span></div>
                    {ex.explanation && <div className="text-[#a8a7cf] text-xs mt-2">{ex.explanation}</div>}
                  </div>
                ))}
              </div>
            )}

            {tab === "Hints" && (
              <div className="space-y-3">
                {challenge.hints.map(hint => (
                  <div key={hint.level} className={cn(
                    "rounded-xl border transition-all",
                    revealedHints.includes(hint.level)
                      ? "bg-[#fbbf24]/5 border-[#fbbf24]/20 p-4"
                      : "bg-[#12121a] border-[#1e1e2e] p-4"
                  )}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#fbbf24] text-sm"
                          style={{ fontVariationSettings: revealedHints.includes(hint.level) ? "'FILL' 1" : "'FILL' 0" }}>lightbulb</span>
                        <span className="text-xs font-bold text-[#fbbf24]">Hint {hint.level}</span>
                        <span className="text-[10px] text-[#a8a7cf]">(-{hint.level * 10} XP)</span>
                      </div>
                      {!revealedHints.includes(hint.level) && (
                        <button
                          onClick={() => revealHint(hint.level)}
                          className="text-[10px] font-bold text-[#6c63ff] hover:text-[#a78bfa] transition-colors"
                        >
                          Reveal
                        </button>
                      )}
                    </div>
                    {revealedHints.includes(hint.level) ? (
                      <p className="text-sm text-[#a8a7cf] leading-relaxed">{hint.content}</p>
                    ) : (
                      <p className="text-sm text-[#a8a7cf]/30 italic">Locked — reveal to see</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "Discussion" && (
              <div className="text-center text-[#a8a7cf] py-12">
                <span className="material-symbols-outlined text-4xl mb-4 block opacity-40">forum</span>
                <p className="text-sm">Discussion coming soon.</p>
              </div>
            )}
          </div>

          {/* AI Tutor FAB */}
          {!tutorOpen && (
            <button
              onClick={() => setTutorOpen(true)}
              className="absolute bottom-6 right-6 flex items-center gap-3 px-5 py-3 bg-[#6c63ff] rounded-full shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:shadow-[0_0_30px_rgba(108,99,255,0.6)] transition-all"
            >
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <span className="text-white font-bold text-sm">AI Tutor</span>
            </button>
          )}
        </section>

        {/* RIGHT: Editor */}
        <section className="w-[52%] flex flex-col bg-[#0d1117]">
          <div className="flex justify-between items-center px-4 h-11 border-b border-[#1e1e2e] bg-[#111126] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#a8a7cf] text-sm">terminal</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a8a7cf]">solution.{language === "python" ? "py" : "js"}</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-[#0a0a0f] border border-[#1e1e2e] rounded text-[11px] text-[#a8a7cf] px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript</option>
              </select>
              <button
                onClick={runCode}
                disabled={running}
                className="flex items-center gap-1 px-3 py-1 bg-[#1e1e2e] hover:bg-[#292949] text-[#e2e8f0] text-xs rounded transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                {running ? "Running…" : "Run"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={v => setCode(v || "")}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                fontFamily: "'Geist Mono', monospace",
              }}
            />
          </div>

          {/* Explain textarea */}
          <div className="px-4 py-3 bg-[#0d1117] border-t border-[#1e1e2e] flex-shrink-0">
            <div className="relative">
              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-lg p-3 text-xs text-[#e2e8f0] placeholder-[#a8a7cf]/40 focus:ring-1 focus:ring-[#6c63ff] focus:border-[#6c63ff] outline-none resize-none pr-16"
                placeholder="Explain your approach — this is scored by the AI Tutor for mastery…"
                rows={2}
              />
              {explanation.length > 10 && (
                <div className="absolute right-2 bottom-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#6c63ff]/20 border border-[#6c63ff]/30">
                  <span className="text-[8px] font-bold text-[#6c63ff]">{Math.round(livemastery)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Test results console */}
          <div className="h-40 bg-[#111126] border-t border-[#1e1e2e] flex flex-col flex-shrink-0">
            <div className="flex items-center px-4 py-2 border-b border-[#1e1e2e]">
              <span className="text-[10px] font-bold text-[#a8a7cf] uppercase tracking-widest">Test Results</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {output ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("flex items-center gap-1.5 font-bold",
                      submitState === "failed" ? "text-[#f97386]" : "text-[#4ae176]"
                    )}>
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {submitState === "failed" ? "cancel" : "check_circle"}
                      </span>
                      <span className="text-sm">{submitState === "failed" ? "Tests Failed" : "3/3 Cases Passed"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[#a8a7cf]">
                      <span>Runtime: 52ms</span>
                      <span>Memory: 16.2MB</span>
                    </div>
                  </div>
                  {submitState !== "failed" && (
                    <div className="flex gap-2">
                      {["Case 1", "Case 2", "Case 3"].map(c => (
                        <div key={c} className="px-3 py-1.5 rounded bg-[#12121a] border border-[#4ae176]/30 text-[#4ae176] text-[11px] font-bold flex items-center gap-2">
                          {c} <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#a8a7cf] text-xs italic">Run your code to see output here.</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* AI Tutor floating panel */}
      {tutorOpen && (
        <aside className="fixed top-20 right-6 w-80 bottom-10 z-[60] flex flex-col glass rounded-2xl shadow-2xl overflow-hidden border border-[#6c63ff]/20 animate-fade-in">
          <div className="p-4 bg-[#6c63ff]/10 border-b border-[#1e1e2e]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#e2e8f0]">AI Tutor</h4>
                  <span className="text-[10px] text-[#a8a7cf]">Socratic Mode · {sessionDepth.current} turns</span>
                </div>
              </div>
              <button onClick={() => setTutorOpen(false)} className="text-[#a8a7cf] hover:text-[#e2e8f0] transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-[#a8a7cf] uppercase">
                <span>Live Mastery Estimate</span>
                <span className="text-[#6c63ff]">{Math.round(livemastery)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#12121a] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#6c63ff] to-[#4ae176] rounded-full transition-all duration-500"
                  style={{ width: `${livemastery}%` }} />
              </div>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] bg-[#4334d6] px-3 py-2 rounded-2xl rounded-tr-none">
                    <p className="text-xs text-[#e3e0ff] leading-relaxed">{m.text}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%] bg-[#12121a] px-3 py-2 rounded-2xl rounded-tl-none border border-[#1e1e2e]">
                    {m.intent && (
                      <span className={cn("inline-flex mb-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border",
                        INTENT_COLOR[m.intent] ?? "bg-[#a8a7cf]/10 text-[#a8a7cf] border-[#a8a7cf]/20"
                      )}>
                        {m.intent.replace("_", " ")}
                      </span>
                    )}
                    <p className="text-xs text-[#e2e8f0] leading-relaxed">{m.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#1e1e2e] bg-[#12121a]">
            <div className="relative">
              <input
                value={tutorInput}
                onChange={e => setTutorInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendTutorMessage()}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl py-2 pl-3 pr-10 text-xs text-[#e2e8f0] placeholder-[#a8a7cf]/40 focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] outline-none"
                placeholder="Ask AI Tutor… (Enter to send)"
              />
              <button
                onClick={sendTutorMessage}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a8a7cf] hover:text-[#6c63ff] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
