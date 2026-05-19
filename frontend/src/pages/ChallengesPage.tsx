import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn, diffClass } from "../lib/utils";
import { SAMPLE_CHALLENGES } from "../data/sample";

const QUIZ_CARDS = [
  { id: "arrays",        title: "Arrays & Hashing", questions: 5, xp: 250, icon: "grid_view",   tag: "Data Structures", desc: "Hash maps, sets, frequency counting, sliding window", color: "#6366F1" },
  { id: "two-pointers",  title: "Two Pointers",      questions: 3, xp: 150, icon: "swipe",       tag: "Algorithms",      desc: "Convergence, fast/slow pointers, palindromes",       color: "#2EC866" },
  { id: "binary-search", title: "Binary Search",     questions: 3, xp: 150, icon: "manage_search",tag: "Algorithms",      desc: "Search spaces, lo/hi/mid, leftmost/rightmost",       color: "#F59E0B" },
];

export function ChallengesPage() {
  const navigate = useNavigate();
  const [tab, setTab]   = useState<"coding" | "quiz">("coding");
  const [diff, setDiff] = useState<string>("");

  const filtered = diff
    ? SAMPLE_CHALLENGES.filter(c => c.difficulty === diff)
    : SAMPLE_CHALLENGES;

  const counts = {
    easy:   SAMPLE_CHALLENGES.filter(c => c.difficulty === "easy").length,
    medium: SAMPLE_CHALLENGES.filter(c => c.difficulty === "medium").length,
    hard:   SAMPLE_CHALLENGES.filter(c => c.difficulty === "hard").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Challenges</h1>
        <p className="text-gray-500 text-sm mt-1">
          Code your way to mastery, or test conceptual understanding with quizzes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit mb-6">
        {(["coding", "quiz"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "btn-shine flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 active:scale-[0.97]",
              tab === t
                ? "bg-[#2EC866] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <span className="material-symbols-outlined text-[16px]">{t === "coding" ? "code" : "quiz"}</span>
            {t === "coding" ? "Coding" : "Quizzes"}
          </button>
        ))}
      </div>

      {/* Coding tab */}
      {tab === "coding" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setDiff("")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
                diff === ""
                  ? "bg-[#D1FAE5] text-[#16a34a] border-green-300"
                  : "bg-transparent text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900"
              )}
            >
              All <span className="opacity-60 ml-1">{SAMPLE_CHALLENGES.length}</span>
            </button>
            {(["easy", "medium", "hard"] as const).map(d => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border capitalize",
                  diff === d
                    ? diffClass(d)
                    : "bg-transparent text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                )}
              >
                {d} <span className="opacity-60 ml-1">{counts[d]}</span>
              </button>
            ))}
          </div>

          {/* Challenge list */}
          <div className="flex flex-col gap-1.5">
            {filtered.map((c, idx) => (
              <Link
                key={c.id}
                to={`/challenge/${c.id}`}
                className="flex items-center gap-4 bg-white border border-gray-200 hover:border-green-300 rounded-xl px-4 py-3.5 transition-all group shadow-sm"
              >
                {/* Index */}
                <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-[#D1FAE5] group-hover:text-[#16a34a] transition-all">
                  {idx + 1}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-gray-900 font-semibold text-sm group-hover:text-gray-700 transition-colors">
                      {c.title}
                    </h3>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", diffClass(c.difficulty))}>
                      {c.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {c.estimated_time_minutes} min
                    </span>
                    {c.companies?.slice(0, 2).map(co => (
                      <span key={co} className="text-[11px] text-gray-400">{co}</span>
                    ))}
                    {c.skill_tags?.slice(0, 1).map(tag => (
                      <span key={tag} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D1FAE5] text-[#16a34a] border border-green-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="material-symbols-outlined text-gray-400 group-hover:text-[#2EC866] transition-colors flex-shrink-0 text-[18px]">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Quiz tab */}
      {tab === "quiz" && (
        <>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Test whether you understand <span className="text-gray-900 font-semibold">why</span> things work — not just that you got the answer right. Every question includes a full explanation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUIZ_CARDS.map(q => (
              <button
                key={q.id}
                onClick={() => navigate(`/quiz/${q.id}`)}
                className="btn-shine group text-left bg-white border border-gray-200 hover:border-gray-300 rounded-2xl overflow-hidden transition-all duration-150 shadow-sm active:scale-[0.98]"
              >
                {/* Color accent line */}
                <div className="h-0.5 w-full" style={{ background: q.color }} />
                <div className="p-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: q.color + "1a", border: `1px solid ${q.color}33` }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: q.color }}>
                      {q.icon}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{q.tag}</p>
                  <h3 className="text-gray-900 font-extrabold text-base mb-2 group-hover:text-gray-700 transition-colors">
                    {q.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-5">{q.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">{q.questions} questions</span>
                      <span className="text-xs font-bold flex items-center gap-1" style={{ color: q.color }}>
                        <span className="material-symbols-outlined text-[12px]">bolt</span>
                        +{q.xp} XP
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-[#2EC866] transition-colors">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
