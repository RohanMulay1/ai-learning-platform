import { useLearnerStore } from "../stores/learnerStore";
import { useProductivityStore } from "../stores/productivityStore";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

/* ── Helpers ──────────────────────────────────────────────── */

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
}

function generateTargetList(
  skillMastery: Record<string, number>,
  weakTopics: string[],
): { skill: string; reason: string; action: string; urgency: "high" | "medium" | "low" }[] {
  const entries = Object.entries(skillMastery)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 5);

  const targets: { skill: string; reason: string; action: string; urgency: "high" | "medium" | "low" }[] = [];

  for (const [skill, mastery] of entries) {
    const isWeak = weakTopics.includes(skill);
    const pct = Math.round(mastery * 100);
    if (pct < 40) {
      targets.push({
        skill,
        reason: `Only ${pct}% mastery — needs foundational work`,
        action: `Solve 3 ${skill} challenges this week`,
        urgency: "high",
      });
    } else if (pct < 65 || isWeak) {
      targets.push({
        skill,
        reason: isWeak ? "Behavioral patterns show struggle here" : `${pct}% mastery — approaching proficiency`,
        action: `Do 1 medium-difficulty ${skill} challenge + review flashcards`,
        urgency: "medium",
      });
    } else {
      targets.push({
        skill,
        reason: `${pct}% — maintain with spaced review`,
        action: `Review SM-2 cards for ${skill} this week`,
        urgency: "low",
      });
    }
    if (targets.length >= 3) break;
  }

  if (targets.length === 0) {
    return [
      { skill: "Arrays & Hashing", reason: "Core skill for 40% of interview problems", action: "Solve 2 medium hash map challenges", urgency: "high" },
      { skill: "Two Pointers",     reason: "Complements array mastery",               action: "Complete sliding window module",   urgency: "medium" },
      { skill: "Binary Search",    reason: "High signal-to-noise ratio for interviews",action: "Solve Binary Search challenge",   urgency: "low" },
    ];
  }
  return targets;
}

/* ── Chart bar ─────────────────────────────────────────────── */

function BarGroup({
  label, days, data, color, icon, maxVal,
}: {
  label: string; days: string[]; data: Record<string, number>; color: string; icon: string; maxVal: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-[13px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {days.map(d => {
          const val = data[d] ?? 0;
          const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 52 }}>
                <div
                  title={`${d}: ${val}`}
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{
                    height: val === 0 ? 3 : `${Math.max(8, heightPct)}%`,
                    backgroundColor: val === 0 ? "#E5E7EB" : color,
                    opacity: val === 0 ? 1 : 0.85 + 0.15 * (heightPct / 100),
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-400">{dayLabel(d)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export function WeeklyReportPage() {
  const navigate = useNavigate();
  const { skillMastery, reviewCards, attempts, behaviorProfile } = useLearnerStore();
  const activityLog = useProductivityStore(s => s.activityLog);

  const days = last7Days();
  const today = days[days.length - 1];
  const weekStart = days[0];

  // Aggregate week stats
  const weekChallenges = days.reduce((s, d) => s + (activityLog[d]?.challenges ?? 0), 0);
  const weekReviews    = days.reduce((s, d) => s + (activityLog[d]?.reviews ?? 0), 0);
  const weekPomodoros  = days.reduce((s, d) => s + (activityLog[d]?.pomodoros ?? 0), 0);
  const focusHours     = Math.round((weekPomodoros * 25) / 60 * 10) / 10;

  // Retention
  const totalCards    = reviewCards.length;
  const retained      = reviewCards.filter(c => c.repetitions >= 2).length;
  const retentionPct  = totalCards > 0 ? Math.round((retained / totalCards) * 100) : 0;

  // Per-day maps
  const challengesByDay: Record<string, number> = {};
  const reviewsByDay:    Record<string, number> = {};
  const pomodorosByDay:  Record<string, number> = {};
  for (const d of days) {
    challengesByDay[d] = activityLog[d]?.challenges ?? 0;
    reviewsByDay[d]    = activityLog[d]?.reviews ?? 0;
    pomodorosByDay[d]  = activityLog[d]?.pomodoros ?? 0;
  }

  const maxActivity = Math.max(
    ...Object.values(challengesByDay),
    ...Object.values(reviewsByDay),
    ...Object.values(pomodorosByDay),
    1,
  );

  const targetList = generateTargetList(skillMastery, behaviorProfile.weakTopics);

  const urgencyColor = {
    high:   { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",    dot: "#EF4444" },
    medium: { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200",  dot: "#F59E0B" },
    low:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "#2EC866" },
  };

  const recentAttempts = [...attempts]
    .filter(a => new Date(a.timestamp).toISOString().slice(0, 10) >= weekStart)
    .sort((a, b) => b.timestamp - a.timestamp);

  const avgMastery = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((s, a) => s + a.masteryResult.score, 0) / recentAttempts.length * 100)
    : 0;

  const reportDate = new Date(today).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const STATS = [
    { label: "Focus Hours",       value: focusHours,     unit: "h",  color: "#F59E0B", icon: "timer" },
    { label: "Challenges Solved", value: weekChallenges, unit: "",   color: "#6366F1", icon: "code" },
    { label: "Cards Reviewed",    value: weekReviews,    unit: "",   color: "#2EC866", icon: "history_edu" },
    { label: "Retention Rate",    value: retentionPct,   unit: "%",  color: "#38bdf8", icon: "psychology" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a] mb-1">Weekly Intelligence Report</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Your Week in Review</h1>
            <p className="text-gray-500 text-sm mt-1">Week of {new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {reportDate}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] border border-green-200 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#16a34a] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATS.map(({ label, value, unit, color, icon }) => (
          <div key={label} className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[15px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
            </div>
            <div className="text-2xl font-extrabold" style={{ color }}>
              {value}{unit}
            </div>
          </div>
        ))}
      </div>

      {/* Activity bars */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5">Daily Activity</h2>
        <div className="flex flex-col gap-6">
          <BarGroup label="Challenges" days={days} data={challengesByDay} color="#6366F1" icon="code"        maxVal={maxActivity} />
          <BarGroup label="Reviews"    days={days} data={reviewsByDay}    color="#2EC866" icon="history_edu" maxVal={maxActivity} />
          <BarGroup label="Pomodoros"  days={days} data={pomodorosByDay}  color="#F59E0B" icon="timer"       maxVal={maxActivity} />
        </div>
      </div>

      {/* Two-col: skill snapshot + session log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Skill mastery snapshot */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Skill Mastery</h2>
          {Object.keys(skillMastery).length === 0 ? (
            <p className="text-sm text-gray-300">Solve challenges to see your mastery breakdown.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(skillMastery)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([skill, mastery]) => {
                  const pct = Math.round(mastery * 100);
                  const color = pct >= 70 ? "#2EC866" : pct >= 45 ? "#6366F1" : "#F59E0B";
                  return (
                    <div key={skill}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{skill}</span>
                        <span className="font-bold font-mono" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">
            Sessions This Week
            {recentAttempts.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">avg {avgMastery}% mastery</span>
            )}
          </h2>
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-gray-300">No sessions this week yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentAttempts.slice(0, 5).map((a, i) => {
                const pct = Math.round(a.masteryResult.score * 100);
                const color = pct >= 70 ? "#2EC866" : pct >= 45 ? "#6366F1" : "#F59E0B";
                return (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{a.challengeTitle}</p>
                      <p className="text-[10px] text-gray-400">{a.skillTags[0]} · {Math.round(a.elapsedMs / 60_000)}m</p>
                    </div>
                    <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Target List */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] border border-green-200 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#16a34a] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">AI-Curated Target List</h2>
            <p className="text-[10px] text-gray-400">Weak spots to attack next week — ranked by impact</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {targetList.map(({ skill, reason, action, urgency }, i) => {
            const uc = urgencyColor[urgency];
            return (
              <div key={skill} className={cn("rounded-xl border p-4 flex items-start gap-4", uc.border, uc.bg)}>
                <div className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold bg-white", uc.text)}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm text-gray-900">{skill}</span>
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border bg-white", uc.text, uc.border)}>
                      {urgency}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{reason}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px] text-[#16a34a]">arrow_right</span>
                    <p className="text-xs font-semibold text-[#16a34a]">{action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next week game plan CTA */}
      <div
        className="rounded-2xl border border-green-200 bg-[#F0FDF4] p-6 flex flex-col sm:flex-row items-center justify-between gap-5"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#16a34a] mb-1">Next Week's Game Plan</p>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">Ready to close the gaps?</h3>
          <p className="text-sm text-gray-500">
            Focus on {targetList[0]?.skill ?? "your weak spots"} — {targetList[0]?.action ?? "solve 3 targeted challenges"}.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => navigate("/challenges")}
            className="bg-[#2EC866] hover:bg-[#1EA34E] text-white font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 text-sm"
          >
            Start Challenges
          </button>
          <button
            onClick={() => navigate("/knowledge")}
            className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-xl transition-all text-sm border border-gray-200"
          >
            Knowledge Hub
          </button>
        </div>
      </div>
    </div>
  );
}
