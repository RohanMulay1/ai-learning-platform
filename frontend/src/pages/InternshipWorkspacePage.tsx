import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

/* ── Gemini ──────────────────────────────────────────────────── */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const STYLE_GUIDES: Record<string, string> = {
  demanding: "terse and critical — always finds something to push harder on. Never fully satisfied but not cruel. References specific code.",
  helpful:   "supportive and constructive — praises one concrete thing first, then suggests one targeted improvement.",
  confused:  "non-technical — asks about business impact, customer effects, or sprint timelines instead of code details.",
};

async function getAgentReaction(
  agent: { name: string; role: string; style: string },
  submission: string,
  taskDesc: string,
  isCode: boolean,
): Promise<string> {
  const prompt = `You are ${agent.name}, ${agent.role} at a Series B fintech startup. Communication style: ${STYLE_GUIDES[agent.style] ?? agent.style}

An engineering intern submitted ${isCode ? "code" : "a written analysis"} for: "${taskDesc}"

Submission (first 1200 chars):
\`\`\`
${submission.slice(0, 1200)}
\`\`\`

Respond in 2-3 sentences as ${agent.name}. Stay strictly in character. Reference something specific from what they submitted.`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 130, temperature: 0.85 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "(no response)";
}

/* ── Day data ────────────────────────────────────────────────── */

interface Opener {
  name: string; role: string; color: string; icon: string; message: string;
}

interface DayData {
  day: number;
  title: string;
  icon: string;
  type: "chaos" | "build" | "review";
  color: string;
  scenario: string;
  taskLabel: string;
  taskDesc: string;
  isCode: boolean;
  starterCode: string;
  openers: Opener[];
}

const BACKEND_DAYS: DayData[] = [
  {
    day: 1,
    title: "Production Outage",
    icon: "warning",
    type: "chaos",
    color: "#EF4444",
    scenario: "Payment service latency spiked 10×. The culprit: an O(n²) loop in the transaction dedup service. 8 minutes on-call, $140k/minute SLA breach. Fix it now.",
    taskLabel: "Fix the O(n²) Transaction Deduplicator",
    taskDesc: "Find why find_duplicate_transactions() is O(n²) and rewrite find_duplicates_fast() using a hash map for O(n) time.",
    isCode: true,
    starterCode: `# FinTech Corp — Payment Dedup Service
# SEVERITY: P0 — latency 10× above SLA
#
# Find all duplicate transactions: same amount within 1.0 second of each other.
# Input:  [{"id": str, "amount": float, "timestamp": float}, ...]
# Output: list of duplicate transaction ids

def find_duplicate_transactions(transactions: list) -> list:
    # BROKEN O(n²) — this is causing the outage
    duplicates = []
    for i in range(len(transactions)):
        for j in range(i + 1, len(transactions)):
            if (transactions[i]['amount'] == transactions[j]['amount'] and
                abs(transactions[i]['timestamp'] - transactions[j]['timestamp']) <= 1.0):
                duplicates.append(transactions[j]['id'])
    return duplicates


# YOUR TASK: O(n) solution using a hash map
def find_duplicates_fast(transactions: list) -> list:
    # Hint: group transactions by amount bucket,
    # then check timestamps within each group
    pass
`,
    openers: [
      { name: "Sarah K.", role: "Tech Lead", color: "#EF4444", icon: "engineering",    message: "P0 has been live 8 minutes. Payments team is screaming. Fix the O(n²) in the transaction batcher. I want to see your solution in 15 minutes." },
      { name: "Priya M.", role: "Senior SWE", color: "#2EC866", icon: "code",           message: "Hey — I traced it to find_duplicate_transactions(). The nested loop is the issue. Hash map will fix it. Ping me if you get stuck on the timestamp bucketing." },
      { name: "David L.", role: "PM",         color: "#F59E0B", icon: "manage_accounts", message: "The Stripe dashboard says 'degraded performance'... what does O(n²) mean exactly? Should I send an update to the customer success team?" },
    ],
  },
  {
    day: 2,
    title: "Legacy Refactor Sprint",
    icon: "construction",
    type: "build",
    color: "#6366F1",
    scenario: "Outage resolved. The PM now wants a sliding window rate limiter shipped by EOD. Requirements changed twice in the Slack thread. Implement the final spec and get it right.",
    taskLabel: "Build a Sliding Window Rate Limiter",
    taskDesc: "Implement a per-user rate limiter using sliding window. Must support max_requests per window_seconds with O(max_requests) memory per user.",
    isCode: true,
    starterCode: `# FinTech Corp — API Rate Limiter
# Spec (PM changed it twice — this is the final version):
#   - SLIDING WINDOW (not fixed window)
#   - Per-user limits (each user_id gets its own window)
#   - Memory: O(max_requests) per user, not O(all history)
#
# Example:
#   limiter = RateLimiter(max_requests=3, window_seconds=10)
#   limiter.allow_request("u1", t=1.0)   # True   1/3
#   limiter.allow_request("u1", t=5.0)   # True   2/3
#   limiter.allow_request("u1", t=9.0)   # True   3/3
#   limiter.allow_request("u1", t=10.0)  # False  3 in window [1,10]
#   limiter.allow_request("u1", t=12.0)  # True   t=1 expired, now 2/3

from collections import deque

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        # TODO: add your per-user data structure here

    def allow_request(self, user_id: str, timestamp: float) -> bool:
        # TODO: sliding window implementation
        # 1. Get or create this user's timestamp deque
        # 2. Evict timestamps outside the current window
        # 3. Check if under limit; record if allowed
        pass
`,
    openers: [
      { name: "David L.", role: "PM",         color: "#F59E0B", icon: "manage_accounts", message: "Okay so we definitely need rate limiting now — the API is getting hammered by bots. Can you make it limit things per user? Sarah mentioned 'sliding window'?" },
      { name: "Sarah K.", role: "Tech Lead",  color: "#EF4444", icon: "engineering",     message: "Sliding window rate limiter. max_requests per window_seconds. Per user. Memory must be O(max_requests) per user — not O(entire history). Questions?" },
      { name: "Priya M.", role: "Senior SWE", color: "#2EC866", icon: "code",            message: "A deque per user is the move — store timestamps, evict anything older than window_seconds before checking the count. Classic sliding window. You've got this." },
    ],
  },
  {
    day: 3,
    title: "Scale Review",
    icon: "speed",
    type: "review",
    color: "#2EC866",
    scenario: "Your rate limiter hit 100k TPS in the load test. The Tech Lead wants a written complexity analysis before she approves the PR. Answer all four questions precisely.",
    taskLabel: "Written Complexity Defense",
    taskDesc: "Answer all 4 questions from the Tech Lead's PR review. Rigorous Big-O analysis required — no approximations or hand-waving.",
    isCode: false,
    starterCode: `# Tech Lead PR Review — Rate Limiter Complexity Analysis
# Answer all 4 questions. Be precise. Show your reasoning.

Q1: What is the time complexity of allow_request() per call?
    Consider: dict lookup, deque eviction loop, deque append.
A1:


Q2: What is the space complexity?
    Per user? Across 10,000 concurrent users?
A2:


Q3: Why is collections.deque better than a list for storing timestamps?
    What specific operation is O(1) on deque but O(n) on list?
A3:


Q4: An adversary sends exactly max_requests requests, then waits for the
    full window to expire and repeats. Does your implementation handle
    this correctly? Walk through what happens step by step.
A4:
`,
    openers: [
      { name: "Sarah K.", role: "Tech Lead",  color: "#EF4444", icon: "engineering",    message: "Rate limiter looks stable under 100k TPS. Before I approve the PR, I need a written analysis. All four questions. I can tell when someone is hand-waving — don't." },
      { name: "Priya M.", role: "Senior SWE", color: "#2EC866", icon: "code",           message: "Almost done! Day 3 is just the written defense. Write clearly — Sarah wants to see that you understand *why* you made each design choice, not just that tests pass." },
      { name: "David L.", role: "PM",         color: "#F59E0B", icon: "manage_accounts", message: "Wait, there's a *review* now? I thought we already shipped it. Will this affect the sprint velocity metrics?" },
    ],
  },
];

/* ── Track registry ──────────────────────────────────────────── */

interface TrackDef {
  title: string;
  company: string;
  color: string;
  icon: string;
  agents: { name: string; role: string; style: string; color: string; icon: string }[];
  days: DayData[];
}

const TRACKS: Record<string, TrackDef> = {
  backend: {
    title: "Backend Systems Engineering",
    company: "FinTech Startup",
    color: "#6366F1",
    icon: "dns",
    agents: [
      { role: "Tech Lead",  name: "Sarah K.", style: "demanding", icon: "engineering",    color: "#EF4444" },
      { role: "PM",         name: "David L.", style: "confused",  icon: "manage_accounts", color: "#F59E0B" },
      { role: "Senior SWE", name: "Priya M.", style: "helpful",   icon: "code",            color: "#2EC866" },
    ],
    days: BACKEND_DAYS,
  },
};

/* ── Chat message ────────────────────────────────────────────── */

interface ChatMsg {
  name: string; role: string; color: string; icon: string;
  message: string; type: "opener" | "reaction";
}

/* ── Completion screen ──────────────────────────────────────── */

function CompletionScreen({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-[40px] text-[#16a34a]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a] mb-2">Sprint Complete</p>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-3">{title}</h1>
      <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-8">
        You debugged a P0 outage, shipped a rate limiter under changing requirements, and defended your complexity analysis to a demanding Tech Lead. That's a full sprint at a real startup.
      </p>
      <div className="flex gap-3 flex-wrap justify-center mb-8">
        {[
          { label: "3 / 3 Days",                icon: "check_circle", cls: "text-[#16a34a] bg-green-50 border-green-200" },
          { label: "+500 XP",                   icon: "bolt",         cls: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { label: "Hash Maps · Sliding Window", icon: "code",        cls: "text-gray-600 bg-gray-50 border-gray-200" },
        ].map(s => (
          <div key={s.label} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold", s.cls)}>
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            {s.label}
          </div>
        ))}
      </div>
      <button onClick={onBack} className="btn-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Internship Board
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export function InternshipWorkspacePage() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const track = TRACKS[trackId ?? "backend"];

  const [dayIdx, setDayIdx]             = useState(0);
  const [code, setCode]                 = useState("");
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dayDone, setDayDone]           = useState(false);
  const [sprintDone, setSprintDone]     = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const day = track?.days[dayIdx];

  useEffect(() => {
    if (!day) return;
    setMessages(day.openers.map(o => ({ ...o, type: "opener" as const })));
    setCode(day.starterCode);
    setDayDone(false);
  }, [dayIdx]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit() {
    if (!code.trim() || isSubmitting || !day) return;
    setIsSubmitting(true);

    const placeholders: ChatMsg[] = track.agents.map(a => ({ ...a, message: "...", type: "reaction" as const }));
    setMessages(prev => [...prev, ...placeholders]);

    try {
      const reactions = await Promise.all(
        track.agents.map(a =>
          getAgentReaction(a, code, day.taskDesc, day.isCode)
            .catch(() => "Couldn't reach Gemini — check the API key.")
        )
      );
      setMessages(prev => [
        ...prev.slice(0, prev.length - placeholders.length),
        ...track.agents.map((a, i) => ({ ...a, message: reactions[i], type: "reaction" as const })),
      ]);
    } catch {
      setMessages(prev => prev.slice(0, prev.length - placeholders.length));
    }

    setIsSubmitting(false);
    setDayDone(true);
  }

  function handleNext() {
    if (dayIdx + 1 >= (track?.days.length ?? 0)) {
      setSprintDone(true);
    } else {
      setDayIdx(d => d + 1);
    }
  }

  if (!track) return <div className="p-8 text-center text-gray-400">Track not found.</div>;

  const typeColors: Record<string, string> = { chaos: "#EF4444", build: "#6366F1", review: "#2EC866" };

  if (sprintDone) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="flex-shrink-0 h-12 bg-white border-b border-gray-200 px-5 flex items-center">
          <button onClick={() => navigate("/internship")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Internship Board
          </button>
        </header>
        <CompletionScreen title={track.title} onBack={() => navigate("/internship")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F7FA]">

      {/* Top bar */}
      <header className="flex-shrink-0 h-12 bg-white border-b border-gray-200 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/internship")}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </button>
          <span className="text-gray-200 text-xs">|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${track.color}15` }}>
              <span className="material-symbols-outlined text-[13px]" style={{ color: track.color, fontVariationSettings: "'FILL' 1" }}>{track.icon}</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">{track.title}</span>
            <span className="text-gray-400 text-xs">&middot; {track.company}</span>
          </div>
        </div>

        {/* Day pills */}
        <div className="flex items-center gap-1.5">
          {track.days.map((d, i) => (
            <div
              key={d.day}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                i === dayIdx
                  ? "text-white border-transparent"
                  : i < dayIdx
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              )}
              style={i === dayIdx ? { background: typeColors[d.type] ?? "#6366F1", borderColor: typeColors[d.type] ?? "#6366F1" } : undefined}
            >
              {i < dayIdx
                ? <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                : <span className="material-symbols-outlined text-[11px]">{d.icon}</span>
              }
              Day {d.day}
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: agent chat panel */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden">

          {/* Day scenario */}
          <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${day.color}12` }}>
                <span className="material-symbols-outlined text-[15px]" style={{ color: day.color, fontVariationSettings: "'FILL' 1" }}>{day.icon}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Day {day.day}</p>
                <p className="font-extrabold text-gray-900 text-sm leading-none">{day.title}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">{day.scenario}</p>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl p-3 bg-white border border-gray-200 shadow-sm",
                  msg.type === "reaction" && "border-l-[3px]"
                )}
                style={msg.type === "reaction" ? { borderLeftColor: msg.color } : undefined}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${msg.color}15` }}>
                    <span className="material-symbols-outlined text-[11px]" style={{ color: msg.color, fontVariationSettings: "'FILL' 1" }}>{msg.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700">{msg.name}</span>
                  <span className="text-[9px] text-gray-400">{msg.role}</span>
                </div>
                <p className={cn("text-[11px] text-gray-600 leading-relaxed", msg.message === "..." && "animate-pulse text-gray-300")}>
                  {msg.message}
                </p>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          {/* Team roster */}
          <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-2">Team</p>
            <div className="flex flex-col gap-1.5">
              {track.agents.map(a => (
                <div key={a.role} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}15` }}>
                    <span className="material-symbols-outlined text-[11px]" style={{ color: a.color, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-700 leading-none">{a.name}</p>
                    <p className="text-[9px] text-gray-400">{a.role}</p>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: challenge + editor */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Task header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{ color: day.color, background: `${day.color}10`, borderColor: `${day.color}30` }}
              >
                {day.type}
              </span>
              <span className="text-gray-300 text-xs">Day {day.day} of {track.days.length}</span>
            </div>
            <h2 className="text-base font-extrabold text-gray-900">{day.taskLabel}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{day.taskDesc}</p>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden p-3">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className={cn(
                "w-full h-full resize-none rounded-xl border p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 transition-all",
                day.isCode
                  ? "bg-[#0d1117] text-[#e2e8f0] border-gray-700 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  : "bg-white text-gray-800 border-gray-200 focus:ring-[#2EC866]/30 focus:border-[#2EC866]/50"
              )}
              style={{ fontFamily: "'Geist Mono', 'Fira Code', monospace" }}
            />
          </div>

          {/* Submit bar */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              {dayDone
                ? <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Submitted — see agent reactions on the left
                  </span>
                : `Submit your ${day.isCode ? "solution" : "analysis"} to get real-time feedback from your team`
              }
            </p>

            {dayDone ? (
              <button onClick={handleNext} className="btn-primary">
                {dayIdx + 1 >= track.days.length
                  ? <><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>Complete Sprint</>
                  : <><span className="material-symbols-outlined text-[16px]">arrow_forward</span>Day {dayIdx + 2}: {track.days[dayIdx + 1].title}</>
                }
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !code.trim()}
                className="btn-shine flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{ background: day.color }}
              >
                {isSubmitting
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Getting feedback...</>
                  : <><span className="material-symbols-outlined text-[16px]">send</span>Submit to Team</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
