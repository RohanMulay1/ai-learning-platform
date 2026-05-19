import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn, diffClass } from "../../lib/utils";
import { useLearnerStore } from "../../stores/learnerStore";
import { SAMPLE_CHALLENGES } from "../../data/sample";
import type { MasteryResult } from "../../agents/masteryAgent";

/* ── Misconception Mutation ──────────────────────────────────
   Generates a structurally identical but narratively different
   variant of the same problem to test conceptual transfer.
── */
const VARIANTS: Record<string, { title: string; twist: string; context: string }[]> = {
  "Arrays & Hashing": [
    { title: "Two Sum — Temperatures Edition",   twist: "Different domain, same pattern",    context: "Given an array of daily temperatures and a target difference, find two days whose temperature gap equals the target." },
    { title: "Two Sum — Stock Returns Edition",  twist: "Financial framing, same algorithm", context: "Given an array of stock returns and a target profit, find two assets whose combined return equals the target." },
  ],
  "Two Pointers": [
    { title: "3Sum — Points on a Grid",          twist: "Geometric framing",                 context: "Given a list of x-coordinates, find three collinear points whose x-values sum to zero." },
    { title: "Container of Water — Histogram",   twist: "Visual context shift",              context: "Given heights of histogram bars, find two non-adjacent bars that trap the maximum area of water." },
  ],
  "Sliding Window": [
    { title: "Longest Unique Substring — DNA",   twist: "Bio-informatics framing",           context: "Given a DNA strand, find the length of the longest sub-strand without a repeated nucleotide." },
    { title: "Max Sum Subarray — Sensor Data",   twist: "IoT/data framing",                  context: "Given a window of sensor readings, find the contiguous window of size k with the highest sum." },
  ],
  "Stack": [
    { title: "Valid Brackets — HTML Tags",        twist: "Web-dev framing",                   context: "Given an HTML snippet, determine if all opening tags are properly closed in the correct order." },
    { title: "Evaluate RPN — Assembly Code",      twist: "Systems framing",                   context: "Given a sequence of assembly instructions using postfix notation, compute the final register value." },
  ],
  "Binary Search": [
    { title: "Search in Rotated Array — Logs",    twist: "DevOps framing",                    context: "Given a rotated-sorted list of log timestamps, find the index of a specific event time in O(log n)." },
    { title: "Find Peak — Mountain Profile",       twist: "Geography framing",                 context: "Given elevations along a hiking trail, find the peak index where adjacent values are lower on both sides." },
  ],
  "Dynamic Programming": [
    { title: "Climbing Stairs — Tile Patterns",   twist: "Design framing",                    context: "You're tiling a 1×n floor with 1×1 and 1×2 tiles. How many distinct tiling patterns exist?" },
    { title: "Coin Change — Currency Exchange",   twist: "Finance framing",                   context: "Given exchange rate denominations, find the minimum number of transactions to reach a target amount." },
  ],
};

function getMutations(skillTags: string[], currentChallengeId: string) {
  for (const tag of skillTags) {
    const vs = VARIANTS[tag];
    if (vs) return { tag, variants: vs };
  }
  // fallback: pick challenges from same skill as variants
  const fallback = SAMPLE_CHALLENGES
    .filter(c => c.id !== currentChallengeId && skillTags.some(t => c.skill_tags.includes(t)))
    .slice(0, 2)
    .map(c => ({ title: c.title, twist: "Same pattern, different problem", context: c.description }));
  return fallback.length > 0 ? { tag: skillTags[0], variants: fallback } : null;
}

export function SessionRecap() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { attempts, recommendations, behaviorProfile } = useLearnerStore();
  const [animatedScore, setAnimatedScore] = useState(0);

  const record = [...attempts].reverse().find(a => a.challengeId === challengeId);
  const result: MasteryResult | null = record?.masteryResult ?? null;

  useEffect(() => {
    if (!result) return;
    let start = 0;
    const target = Math.round(result.score * 100);
    const step = target / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setAnimatedScore(target); clearInterval(id); }
      else setAnimatedScore(Math.floor(start));
    }, 25);
    return () => clearInterval(id);
  }, [result]);

  if (!record || !result) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <p className="text-gray-400">Session data not found.</p>
      </div>
    );
  }

  const levelColor = {
    mastered:   { ring: "#2EC866", bg: "bg-green-50",  text: "text-green-700",  label: "Mastered" },
    proficient: { ring: "#6366F1", bg: "bg-indigo-50", text: "text-indigo-600", label: "Proficient" },
    developing: { ring: "#F59E0B", bg: "bg-amber-50",  text: "text-amber-700",  label: "Developing" },
    novice:     { ring: "#EF4444", bg: "bg-red-50",    text: "text-red-600",    label: "Novice" },
  }[result.level];

  const bars: { label: string; key: keyof typeof result.breakdown; color: string }[] = [
    { label: "Time efficiency",   key: "timeScore",        color: "#6366F1" },
    { label: "Explanation depth", key: "explanationScore", color: "#2EC866" },
    { label: "First-try accuracy",key: "attemptScore",     color: "#F59E0B" },
    { label: "Hint independence", key: "hintScore",        color: "#a78bfa" },
    { label: "Code quality",      key: "codeScore",        color: "#38bdf8" },
  ];

  const nextRec = recommendations[0];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900 flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${levelColor.ring}06 0%, transparent 70%)` }} />

      <div className="w-full max-w-[720px] flex flex-col gap-6 z-10">

        {/* Header */}
        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Session Complete</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{record.challengeTitle}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", diffClass(record.difficulty))}>
              {record.difficulty}
            </span>
            {record.skillTags.slice(0, 2).map(t => (
              <span key={t} className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase tracking-wider">{t}</span>
            ))}
          </div>
        </div>

        {/* Mastery score ring + level */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-8">
          {/* Animated ring */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={levelColor.ring} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - animatedScore / 100)}`}
                style={{ transition: "stroke-dashoffset 0.05s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold" style={{ color: levelColor.ring }}>{animatedScore}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">mastery</span>
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-4", levelColor.bg, levelColor.text)}>
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                {result.level === "mastered" ? "verified" : result.level === "proficient" ? "trending_up" : result.level === "developing" ? "psychology" : "school"}
              </span>
              {levelColor.label}
            </div>

            <div className="flex flex-col gap-3">
              {bars.map(({ label, key, color }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{Math.round(result.breakdown[key] * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 delay-300"
                      style={{ width: `${result.breakdown[key] * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* XP earned */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">+{result.xpEarned} XP earned</p>
              <p className="text-xs text-gray-400">{record.hintsUsed === 0 ? "No hints used — bonus applied" : `${record.hintsUsed} hint${record.hintsUsed > 1 ? "s" : ""} used`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Time</p>
            <p className="text-sm font-bold text-gray-900">{Math.round(record.elapsedMs / 60_000)}m {Math.round((record.elapsedMs % 60_000) / 1000)}s</p>
          </div>
        </div>

        {/* AI insights */}
        {result.insights.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">What the AI observed</p>
            <div className="flex flex-col gap-2">
              {result.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#6366F1] text-sm mt-0.5">insights</span>
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral pattern callout */}
        {behaviorProfile.weakTopics.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#F59E0B] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <div>
              <p className="text-sm font-bold text-amber-700 mb-1">Pattern detected</p>
              <p className="text-sm text-gray-700">
                You tend to struggle with <strong>{behaviorProfile.weakTopics.slice(0, 2).join(" and ")}</strong>.
                The next challenge targets this gap directly.
              </p>
            </div>
          </div>
        )}

        {/* Next challenge recommendation */}
        {nextRec && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">AI Recommends Next</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                    nextRec.urgency === "spaced_rep" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : nextRec.urgency === "gap_fill"  ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-green-50 text-green-700 border-green-200"
                  )}>
                    {nextRec.urgency.replace("_", " ")}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                    diffClass(nextRec.challenge.difficulty)
                  )}>{nextRec.challenge.difficulty}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{nextRec.challenge.title}</h3>
                <p className="text-xs text-gray-400">{nextRec.reason}</p>
              </div>
              <button
                onClick={() => navigate(`/challenge/${nextRec.challenge.id}`)}
                className="flex-shrink-0 bg-[#2EC866] hover:bg-[#1EA34E] text-white font-bold py-2.5 px-5 rounded-xl transition-all active:scale-95 text-sm"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* Misconception Mutation */}
        {(() => {
          const mutations = getMutations(record.skillTags, record.challengeId);
          if (!mutations) return null;
          return (
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="material-symbols-outlined text-[#a78bfa] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shuffle</span>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Misconception Mutation</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Same pattern — different narrative. Can you recognize it in a new context?</p>
              <div className="flex flex-col gap-3">
                {mutations.variants.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 cursor-pointer hover:border-purple-200 transition-colors group"
                    onClick={() => navigate(`/challenge/${record.challengeId}`)}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="font-bold text-sm text-gray-900 group-hover:text-gray-700 transition-colors">{v.title}</p>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex-shrink-0">
                        {v.twist}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{v.context}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bottom actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 text-sm border border-gray-200 shadow-sm"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate("/skills")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 text-sm border border-gray-200 shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">account_tree</span>
            Skill Tree
          </button>
        </div>
      </div>
    </div>
  );
}
