import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "../stores/store";
import { cn } from "../lib/utils";
import { CheckCircle, XCircle, ArrowRight, Sparkles } from "lucide-react";

/* ── DATA ──────────────────────────────────────────── */
const GOALS = [
  { id: "interview",   emoji: "🎯", label: "Crack coding interviews",  desc: "Land FAANG / top tech"           },
  { id: "improve",     emoji: "🧠", label: "Sharpen problem-solving",   desc: "Think algorithmically"           },
  { id: "cs",          emoji: "📚", label: "Learn CS fundamentals",     desc: "Build a strong base"             },
  { id: "competitive", emoji: "⚡", label: "Competitive programming",   desc: "Contest & olympiad prep"         },
];

const EXPERIENCE = [
  { id: "none",   emoji: "🌱", label: "Complete beginner",    desc: "What's a hash map?"               },
  { id: "some",   emoji: "📈", label: "Some experience",      desc: "I know basics, stuck on mediums"  },
  { id: "solid",  emoji: "💪", label: "Solid foundation",     desc: "Easys fine, mediums are hard"     },
  { id: "strong", emoji: "🚀", label: "Strong skills",        desc: "Mediums ok, working on hards"     },
];

const TIMELINES = [
  { id: "asap",   emoji: "🔥", label: "ASAP (< 1 month)",    desc: "Intense daily sessions"  },
  { id: "soon",   emoji: "⚡", label: "Soon (1–3 months)",   desc: "Consistent 30 min/day"   },
  { id: "steady", emoji: "📅", label: "Steady (3–6 months)", desc: "Building a strong base"  },
  { id: "casual", emoji: "😌", label: "No rush (6+ months)", desc: "Casual practice"         },
];

const QUESTIONS = [
  { id: "q1", diff: "easy",   skill: "Arrays",   q: "Time complexity of accessing an array element by index?",           opts: ["O(n)","O(log n)","O(1)","O(n²)"],                         correct: 2, exp: "Arrays store in contiguous memory. Known index = direct address. Always O(1)." },
  { id: "q2", diff: "easy",   skill: "Big-O",    q: "Which runs in O(n²)?",                                              opts: ["Binary search","Hash lookup","Bubble sort","Array access"],  correct: 2, exp: "Bubble sort makes n passes comparing pairs — O(n²). The rest are O(log n), O(1), O(1)." },
  { id: "q3", diff: "easy",   skill: "DS",       q: "What data structure follows LIFO order?",                           opts: ["Queue","Stack","Linked List","Hash Map"],                    correct: 1, exp: "Stack is LIFO — last in, first out. Like a stack of plates. Queues are FIFO." },
  { id: "q4", diff: "medium", skill: "Hashing",  q: "Fastest way to count character frequencies?",                      opts: ["Nested loops O(n²)","Sort O(n log n)","Hash map O(n)","Binary search"], correct: 2, exp: "One pass building a frequency map = O(n). Optimal." },
  { id: "q5", diff: "medium", skill: "Two Ptr",  q: "Best approach to find pair summing to target in a sorted array?",  opts: ["Brute O(n²)","Hash map O(n)","Two pointers O(n) O(1)","Binary search"], correct: 2, exp: "Sorted + two pointers = O(n) time, O(1) space. Optimal." },
  { id: "q6", diff: "medium", skill: "Recursion",q: "What happens with recursion and no base case?",                    opts: ["Returns undefined","Stack overflow","O(1)","Syntax error"],  correct: 1, exp: "Without base case, infinite calls exhaust the call stack." },
  { id: "q7", diff: "hard",   skill: "DP",       q: "Core idea behind memoization?",                                    opts: ["Sort first","Two pointers","Cache subproblem results","Divide into halves"], correct: 2, exp: "Memo stores subproblem results so they're computed only once." },
  { id: "q8", diff: "hard",   skill: "Graphs",   q: "BFS time complexity with V vertices, E edges?",                    opts: ["O(V)","O(E)","O(V+E)","O(V×E)"],                            correct: 2, exp: "BFS visits every vertex once (V) and every edge once (E)." },
];

type Level = "beginner" | "intermediate" | "advanced";

function detectLevel(answers: { id: string; correct: boolean }[]): Level {
  const pct = answers.filter(a => a.correct).length / answers.length;
  const hardCorrect = answers.filter(a => QUESTIONS.find(q => q.id === a.id)?.diff === "hard" && a.correct).length;
  if (pct >= 0.75 && hardCorrect >= 1) return "advanced";
  if (pct >= 0.5) return "intermediate";
  return "beginner";
}

function pickNext(answered: { id: string }[], last?: { id: string; correct: boolean }): typeof QUESTIONS[0] | null {
  const done = new Set(answered.map(a => a.id));
  const left = QUESTIONS.filter(q => !done.has(q.id));
  if (!left.length) return null;
  if (!last) return left.find(q => q.diff === "easy") || left[0];
  const target = last.correct
    ? (QUESTIONS.find(q => q.id === last.id)?.diff === "easy" ? "medium" : "hard")
    : (QUESTIONS.find(q => q.id === last.id)?.diff === "hard" ? "medium" : "easy");
  return left.find(q => q.diff === target) || left[0];
}

const LEVEL_RESULT = {
  beginner:     { emoji: "🌱", label: "Beginner",     colorClass: "text-[#2EC866]", gradientFrom: "#D1FAE5", gradientTo: "#A7F3D0", borderColor: "#6EE7B7", courses: ["Arrays & Hashing Mastery","Two Pointers & Sliding Window"] },
  intermediate: { emoji: "💪", label: "Intermediate",  colorClass: "text-amber-600",  gradientFrom: "#FEF3C7", gradientTo: "#FDE68A", borderColor: "#FCD34D", courses: ["Binary Search Deep Dive","Trees & Recursion"] },
  advanced:     { emoji: "🚀", label: "Advanced",      colorClass: "text-indigo-600", gradientFrom: "#EEF2FF", gradientTo: "#C7D2FE", borderColor: "#A5B4FC", courses: ["Dynamic Programming","Graph Algorithms"] },
};

const TOTAL_Q = 5;

/* ── Gemini AI insight ─────────────────────────────── */
async function getAIInsight(level: Level, goalId: string, score: number): Promise<string> {
  const key = (import.meta.env.VITE_GEMINI_API_KEY ?? "") as string;
  if (!key) return "";
  const goalLabel = GOALS.find(g => g.id === goalId)?.label ?? goalId;
  const prompt = `A student finished an adaptive coding skill quiz on an AI learning platform.
Level: ${level}. Goal: ${goalLabel}. Score: ${score}/${TOTAL_Q}.
Write exactly 2 sentences (max 40 words total). First: one warm acknowledgment of their level. Second: the single most important first action they should take. Direct, specific, motivating. Second person.`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 90, temperature: 0.75 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return ((data.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? "").trim();
  } catch { return ""; }
}

/* ── Shared option button ─────────────────────────── */
function OptionBtn({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn-shine w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98]",
        selected
          ? "border-[#2EC866] bg-[#D1FAE5] shadow-md"
          : "border-gray-200 bg-white hover:border-[#2EC866]/40 hover:shadow-sm hover:-translate-y-0.5"
      )}
    >
      {children}
      {selected && <CheckCircle className="w-5 h-5 text-[#2EC866] flex-shrink-0 ml-auto" />}
    </button>
  );
}

/* ── COMPONENT ─────────────────────────────────────── */
type Phase = "goal" | "timeline" | "xp" | "quiz" | "result";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setCompleted } = useOnboardingStore();

  const [phase, setPhase]       = useState<Phase>("goal");
  const [goal, setGoal]         = useState("");
  const [timeline, setTimeline] = useState("");
  const [exp, setExp]           = useState("");
  const [currentQ, setCurrentQ] = useState(QUESTIONS[0]);
  const [answers, setAnswers]   = useState<{ id: string; correct: boolean }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [level, setLevel]       = useState<Level>("beginner");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const PHASES: Phase[] = ["goal", "timeline", "xp", "quiz", "result"];
  const phaseIdx = PHASES.indexOf(phase);

  function startQuiz() {
    const first = exp === "none"   ? QUESTIONS.find(q => q.diff === "easy")!
                : exp === "strong" ? QUESTIONS.find(q => q.diff === "hard")!
                :                    QUESTIONS.find(q => q.diff === "medium")!;
    setCurrentQ(first);
    setPhase("quiz");
  }

  function confirm() {
    if (selected === null) return;
    setConfirmed(true);
    const correct = selected === currentQ.correct;
    const newAnswers = [...answers, { id: currentQ.id, correct }];
    setAnswers(newAnswers);

    if (newAnswers.length >= TOTAL_Q) {
      setTimeout(async () => {
        const l = detectLevel(newAnswers);
        setLevel(l);
        setCompleted(l, [goal]);
        setPhase("result");
        setAiLoading(true);
        const insight = await getAIInsight(l, goal, newAnswers.filter(a => a.correct).length);
        setAiInsight(insight || null);
        setAiLoading(false);
      }, 1100);
    } else {
      setTimeout(() => {
        const next = pickNext(newAnswers, { id: currentQ.id, correct });
        if (next) setCurrentQ(next);
        setSelected(null);
        setConfirmed(false);
      }, 1100);
    }
  }

  const cfg = LEVEL_RESULT[level];

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">

      {/* Brand mark */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-xl bg-[#2EC866] flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-black">L</span>
        </div>
        <span className="font-black text-gray-800 text-lg tracking-tight">LearnAI</span>
      </div>

      {/* Progress dots */}
      {phase !== "result" && (
        <div className="flex gap-2 mb-8">
          {PHASES.slice(0, -1).map((p, i) => (
            <div key={p} className={cn("rounded-full transition-all duration-300",
              i < phaseIdx  ? "w-7 h-2 bg-[#2EC866]" :
              i === phaseIdx ? "w-7 h-2 bg-[#2EC866]/40" : "w-2 h-2 bg-gray-300"
            )} />
          ))}
        </div>
      )}

      <div className="w-full max-w-md">

        {/* ── GOAL ── */}
        {phase === "goal" && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#2EC866] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ boxShadow: "0 4px 0 #1EA34E" }}>
                <span className="text-white text-2xl">🎯</span>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">What's your goal?</h1>
              <p className="text-gray-500 font-medium">We'll build your personal learning path around this.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    "btn-shine relative p-5 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98]",
                    goal === g.id
                      ? "border-[#2EC866] bg-[#D1FAE5] shadow-md"
                      : "border-gray-200 bg-white hover:border-[#2EC866]/40 hover:shadow-sm hover:-translate-y-0.5"
                  )}
                >
                  {goal === g.id && <CheckCircle className="w-4 h-4 text-[#2EC866] absolute top-3 right-3" />}
                  <div className="text-3xl mb-2">{g.emoji}</div>
                  <p className="font-extrabold text-gray-900 text-sm leading-snug">{g.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5 font-medium">{g.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => goal && setPhase("timeline")}
              disabled={!goal}
              className={cn(
                "btn-shine w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all duration-150",
                goal ? "btn-primary w-full" : "bg-gray-100 text-gray-400 cursor-not-allowed rounded-2xl py-4"
              )}
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {phase === "timeline" && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">When's your deadline?</h2>
              <p className="text-gray-500 font-medium">We'll set your daily goal based on this.</p>
            </div>
            <div className="space-y-3 mb-6">
              {TIMELINES.map(t => (
                <OptionBtn key={t.id} selected={timeline === t.id} onClick={() => setTimeline(t.id)}>
                  <span className="text-3xl flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1">
                    <p className="font-extrabold text-gray-900">{t.label}</p>
                    <p className="text-gray-400 text-sm font-medium">{t.desc}</p>
                  </div>
                </OptionBtn>
              ))}
            </div>
            <button
              onClick={() => timeline && setPhase("xp")}
              disabled={!timeline}
              className={cn(
                "btn-shine w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all duration-150",
                timeline ? "btn-primary w-full" : "bg-gray-100 text-gray-400 cursor-not-allowed rounded-2xl py-4"
              )}
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── EXPERIENCE ── */}
        {phase === "xp" && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">How much do you know?</h2>
              <p className="text-gray-500 font-medium">Honest answer = better recommendations. We'll verify with a quick quiz.</p>
            </div>
            <div className="space-y-3 mb-6">
              {EXPERIENCE.map(e => (
                <OptionBtn key={e.id} selected={exp === e.id} onClick={() => setExp(e.id)}>
                  <span className="text-3xl flex-shrink-0">{e.emoji}</span>
                  <div className="flex-1">
                    <p className="font-extrabold text-gray-900">{e.label}</p>
                    <p className="text-gray-400 text-sm font-medium">{e.desc}</p>
                  </div>
                </OptionBtn>
              ))}
            </div>
            <button
              onClick={() => exp && startQuiz()}
              disabled={!exp}
              className={cn(
                "btn-shine w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all duration-150",
                exp ? "btn-primary w-full" : "bg-gray-100 text-gray-400 cursor-not-allowed rounded-2xl py-4"
              )}
            >
              Start skill check ⚡
            </button>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-gray-500">Question {answers.length + 1} of {TOTAL_Q}</p>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_Q }).map((_, i) => (
                  <div key={i} className={cn("h-2 rounded-full transition-all duration-300",
                    i < answers.length  ? "w-8 bg-[#2EC866]" :
                    i === answers.length ? "w-8 bg-[#2EC866]/30" : "w-2 bg-gray-200"
                  )} />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 mb-4" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn("tag text-[10px]",
                  currentQ.diff === "easy"   ? "bg-green-50 text-green-700 border border-green-200" :
                  currentQ.diff === "medium" ? "bg-amber-50 text-amber-700 border border-amber-200"   : "bg-red-50 text-red-600 border border-red-200"
                )}>{currentQ.diff}</span>
                <span className="text-gray-400 text-xs font-bold">{currentQ.skill}</span>
              </div>
              <p className="text-gray-900 text-lg font-extrabold leading-snug mb-6">{currentQ.q}</p>
              <div className="space-y-2.5">
                {currentQ.opts.map((opt, i) => {
                  let cls = "border-2 border-gray-200 bg-gray-50 text-gray-700 hover:border-[#2EC866]/40 hover:bg-green-50 cursor-pointer";
                  if (selected === i && !confirmed) cls = "border-2 border-[#2EC866] bg-[#D1FAE5] text-gray-900";
                  if (confirmed) {
                    if (i === currentQ.correct)                       cls = "border-2 border-emerald-400 bg-emerald-50 text-emerald-800";
                    else if (i === selected && i !== currentQ.correct) cls = "border-2 border-rose-400 bg-rose-50 text-rose-700";
                    else                                               cls = "border-2 border-gray-100 bg-white text-gray-400";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => !confirmed && setSelected(i)}
                      disabled={confirmed}
                      className={cn("btn-shine w-full text-left px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-100 flex items-center gap-3 active:scale-[0.98]", cls)}
                    >
                      <span className={cn("w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-all",
                        confirmed && i === currentQ.correct      ? "bg-emerald-500 text-white" :
                        confirmed && i === selected              ? "bg-rose-500 text-white" :
                        selected === i && !confirmed             ? "bg-[#2EC866] text-white" :
                        "bg-white border border-gray-300 text-gray-500"
                      )}>
                        {confirmed && i === currentQ.correct ? <CheckCircle className="w-4 h-4" /> :
                         confirmed && i === selected          ? <XCircle className="w-4 h-4" /> :
                         String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {confirmed && (
              <div className={cn("rounded-2xl p-4 mb-4 border-2 text-sm",
                selected === currentQ.correct ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
              )}>
                <span className={cn("font-extrabold", selected === currentQ.correct ? "text-emerald-700" : "text-rose-700")}>
                  {selected === currentQ.correct ? "✓ Correct! " : "✗ Not quite — "}
                </span>
                <span className="text-gray-700">{currentQ.exp}</span>
              </div>
            )}

            {!confirmed ? (
              <button
                onClick={confirm}
                disabled={selected === null}
                className={cn(
                  "btn-shine w-full py-4 rounded-2xl font-extrabold text-base transition-all duration-150",
                  selected !== null ? "btn-primary w-full" : "bg-gray-100 text-gray-400 cursor-not-allowed rounded-2xl"
                )}
              >
                Check answer
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-gray-400 font-bold text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-[#2EC866]/40 border-t-[#2EC866] animate-spin" />
                {answers.length >= TOTAL_Q ? "Analysing your results…" : "Next question…"}
              </div>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && (
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce">{cfg.emoji}</div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">You're {cfg.label}!</h2>
            <p className="text-gray-500 font-medium mb-6">Your personalized path is ready.</p>

            {/* Score chips */}
            <div className="flex items-center justify-center gap-6 mb-5 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-[#2EC866]">{answers.filter(a => a.correct).length}/{TOTAL_Q}</p>
                <p className="text-gray-400 text-xs font-bold mt-0.5">Correct</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className={cn("text-3xl font-extrabold", cfg.colorClass)}>{cfg.label}</p>
                <p className="text-gray-400 text-xs font-bold mt-0.5">Level</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-3xl font-extrabold text-amber-500">+100</p>
                <p className="text-gray-400 text-xs font-bold mt-0.5">Bonus XP</p>
              </div>
            </div>

            {/* AI insight card */}
            {(aiLoading || aiInsight) && (
              <div className="rounded-2xl p-4 mb-5 bg-white border border-gray-200 shadow-sm text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#2EC866]" />
                  </div>
                  <p className="text-xs font-bold text-[#2EC866] uppercase tracking-widest">AI Coach</p>
                </div>
                {aiLoading ? (
                  <div className="flex gap-1 py-1">
                    {[0,1,2].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d*0.15}s` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
                )}
              </div>
            )}

            {/* Recommended courses */}
            <div className="rounded-2xl p-5 border-2 mb-6 text-left"
              style={{ background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`, borderColor: cfg.borderColor }}>
              <p className="font-extrabold text-gray-900 mb-1 text-sm">Your first two courses:</p>
              {cfg.courses.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 font-bold mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-white/70 border border-white flex items-center justify-center text-xs text-gray-600 font-extrabold flex-shrink-0">{i+1}</span>
                  {c}
                </div>
              ))}
            </div>

            <button onClick={() => navigate("/dashboard")} className="btn-primary w-full py-4 text-base">
              Start learning 🚀
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
