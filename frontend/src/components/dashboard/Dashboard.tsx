import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn, diffClass } from "../../lib/utils";
import { useLearnerStore } from "../../stores/learnerStore";
import { useProductivityStore } from "../../stores/productivityStore";
import { SAMPLE_CHALLENGES } from "../../data/sample";
import type { ChallengeCandidate, SkillMastery } from "../../agents/recommendationAgent";
import { recommend } from "../../agents/recommendationAgent";

const SKILL_GRAPH: SkillMastery[] = [
  { skillId: "Arrays & Hashing",    name: "Arrays & Hashing",    mastery: 0, prerequisites: [] },
  { skillId: "Two Pointers",        name: "Two Pointers",        mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Sliding Window",      name: "Sliding Window",      mastery: 0, prerequisites: ["Two Pointers"] },
  { skillId: "Stack",               name: "Stack",               mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Binary Search",       name: "Binary Search",       mastery: 0, prerequisites: ["Arrays & Hashing"] },
  { skillId: "Dynamic Programming", name: "Dynamic Programming", mastery: 0, prerequisites: ["Stack"] },
];

const ALL_CANDIDATES: ChallengeCandidate[] = SAMPLE_CHALLENGES.map(c => ({
  id: c.id, title: c.title,
  difficulty: c.difficulty as "easy" | "medium" | "hard",
  skillTags: c.skill_tags,
  expectedMs: c.estimated_time_minutes * 60_000,
  companies: c.companies,
}));

const DEFAULT_MASTERY: Record<string, number> = {
  "Arrays & Hashing": 0.72, "Two Pointers": 0.58, "Stack": 0.45, "Binary Search": 0.30,
};

async function getDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  const encoded = new TextEncoder().encode(today);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
  const hashInt = BigInt("0x" + hashHex);
  const idx = Number(hashInt % BigInt(SAMPLE_CHALLENGES.length));
  return SAMPLE_CHALLENGES[idx];
}

/* ── Spotlight feature card ───────────────────────────────────── */
interface SpotlightProps {
  icon: string;
  label: string;
  tagline: string;
  contextText: string;
  contextUrgent?: boolean;
  ctaLabel: string;
  accentColor: string;
  bgLight: string;
  onClick: () => void;
}

function SpotlightCard({
  icon, label, tagline, contextText, contextUrgent,
  ctaLabel, accentColor, bgLight, onClick,
}: SpotlightProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 flex flex-col gap-4 shadow-card overflow-hidden relative"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-all duration-300 group-hover:h-1"
        style={{ background: accentColor }} />

      <div className="flex items-start justify-between gap-2">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
          style={{ background: bgLight }}>
          <span className="material-symbols-outlined text-[22px]"
            style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>

        {/* Context badge */}
        <span className={cn(
          "text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 mt-0.5",
          contextUrgent
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-gray-50 text-gray-400 border-gray-200"
        )}>
          {contextText}
        </span>
      </div>

      <div className="flex-1">
        <p className="font-extrabold text-gray-900 text-sm mb-1">{label}</p>
        <p className="text-gray-400 text-xs leading-snug">{tagline}</p>
      </div>

      <button
        className="btn-shine w-full py-2.5 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-700 text-white transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5"
        onClick={e => { e.stopPropagation(); onClick(); }}
      >
        {ctaLabel}
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    </div>
  );
}

/* ── Secondary nav pill ───────────────────────────────────────── */
function NavPill({ icon, label, color, light, onClick }: { icon: string; label: string; color: string; light: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-shine bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2.5 hover:shadow-md hover:border-transparent transition-all duration-150 active:scale-[0.97] group"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: light }}>
        <span className="material-symbols-outlined text-[15px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
      <span className="material-symbols-outlined text-[15px] text-gray-300 group-hover:text-gray-400 ml-auto transition-colors">chevron_right</span>
    </button>
  );
}

/* ── Dashboard ────────────────────────────────────────────────── */
export function Dashboard() {
  const navigate = useNavigate();
  const {
    xp, level, streak, skillMastery, recommendations,
    behaviorProfile, refreshRecommendations, attempts, reviewCards, knowledgeDocuments,
  } = useLearnerStore();
  const activityLog = useProductivityStore(s => s.activityLog);

  const [dailyChallenge, setDailyChallenge] = useState<typeof SAMPLE_CHALLENGES[0] | null>(null);

  useEffect(() => {
    if (recommendations.length === 0) refreshRecommendations(ALL_CANDIDATES, SKILL_GRAPH);
  }, []);
  useEffect(() => { getDailyChallenge().then(setDailyChallenge); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toISOString().slice(0, 10);

  const recs = recommendations.length >= 1
    ? recommendations
    : recommend(ALL_CANDIDATES, SKILL_GRAPH.map(s => ({ ...s, mastery: skillMastery[s.skillId] ?? 0 })), behaviorProfile, 3);

  const featured     = recs[0];
  const featuredData = featured ? SAMPLE_CHALLENGES.find(c => c.id === featured.challenge.id) : SAMPLE_CHALLENGES[0];

  const dueCards     = reviewCards.filter(c => c.nextReviewDate <= today).length;
  const weekSessions = attempts.filter(a => a.timestamp > Date.now() - 7 * 86_400_000).length;
  const docCount     = knowledgeDocuments?.length ?? 0;
  const xpProgress   = xp % 500;

  const skillRows = SKILL_GRAPH.slice(0, 5).map(s => ({
    name: s.name,
    pct: Math.round((skillMastery[s.skillId] ?? DEFAULT_MASTERY[s.name] ?? 0) * 100),
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-7">

      {/* ── Greeting ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-hr-text tracking-tight">
            {greeting}, <span className="text-hr-green">Alex</span> 👋
          </h1>
          <p className="text-hr-text-s text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {streak > 0 && <span className="ml-2 font-semibold text-amber-500">· 🔥 {streak}-day streak</span>}
          </p>
        </div>

        {/* Quiet level + XP pill */}
        <div className="hidden sm:flex items-center gap-2 bg-white border border-hr-border rounded-full px-3.5 py-1.5 shadow-sm flex-shrink-0">
          <span className="text-xs font-bold text-gray-400">Lv.{level}</span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#2EC866] rounded-full transition-all duration-700"
              style={{ width: `${(xpProgress / 500) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-[#2EC866]">{xpProgress}<span className="text-gray-400 font-normal"> XP</span></span>
        </div>
      </div>

      {/* ── Daily Challenge HERO (animated gradient) ───────────────── */}
      {dailyChallenge && (
        <div
          className="daily-hero-gradient relative overflow-hidden rounded-2xl cursor-pointer group"
          onClick={() => navigate(`/challenge/${dailyChallenge.id}`)}
        >
          {/* Soft radial overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 75% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)" }} />
          {/* Pulse ring */}
          <div className="absolute top-1/2 right-28 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/20 pointer-events-none"
            style={{ animation: "dailyPulse 3s ease-in-out infinite" }} />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-white text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>today</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white bg-white/20 px-2 py-0.5 rounded-full">
                    Daily Challenge
                  </span>
                  <span className="text-[9px] font-bold uppercase text-white/80 bg-black/15 px-2 py-0.5 rounded-full">
                    {dailyChallenge.difficulty}
                  </span>
                </div>
                <h3 className="text-white font-extrabold text-lg leading-snug">{dailyChallenge.title}</h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {dailyChallenge.skill_tags[0]} · {dailyChallenge.estimated_time_minutes} min
                </p>
              </div>
            </div>
            <button
              className="btn-shine flex-shrink-0 bg-white/95 hover:bg-white text-indigo-600 font-extrabold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-150 active:scale-95 shadow-md group-hover:shadow-xl"
              onClick={e => { e.stopPropagation(); navigate(`/challenge/${dailyChallenge.id}`); }}
            >
              Solve Now
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Platform spotlight cards ───────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-hr-text-m uppercase tracking-widest mb-3">What to do next</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <SpotlightCard
            icon="history_edu"
            label="Spaced Review"
            tagline="Reinforce what you've learned before it fades from memory."
            contextText={dueCards > 0 ? `${dueCards} cards due` : "All caught up"}
            contextUrgent={dueCards > 0}
            ctaLabel={dueCards > 0 ? "Review now" : "Browse queue"}
            accentColor="#2EC866"
            bgLight="#D1FAE5"
            onClick={() => navigate("/review")}
          />

          <SpotlightCard
            icon="library_books"
            label="My Notes"
            tagline="Upload study docs — AI extracts concepts and builds your flashcards."
            contextText={docCount > 0 ? `${docCount} doc${docCount > 1 ? "s" : ""} analyzed` : "No docs yet"}
            contextUrgent={docCount > 0}
            ctaLabel={docCount > 0 ? "View notes" : "Upload first doc"}
            accentColor="#F59E0B"
            bgLight="#FEF3C7"
            onClick={() => navigate("/courses?tab=notes")}
          />

          <SpotlightCard
            icon="business_center"
            label="Internship Sim"
            tagline="Simulate a real engineering sprint with AI colleagues and a PM."
            contextText="2 tracks available"
            contextUrgent={false}
            ctaLabel="Explore tracks"
            accentColor="#6366F1"
            bgLight="#EEF2FF"
            onClick={() => navigate("/internship")}
          />

        </div>
      </div>

      {/* ── Secondary nav ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <NavPill icon="code"          label="Challenges" color="#2EC866" light="#D1FAE5" onClick={() => navigate("/challenges")} />
        <NavPill icon="school"        label="Courses"    color="#06B6D4" light="#CFFAFE" onClick={() => navigate("/courses")} />
        <NavPill icon="analytics"     label="Reports"    color="#EF4444" light="#FEE2E2" onClick={() => navigate("/reports")} />
        <NavPill icon="account_tree"  label="Skill Tree" color="#8B5CF6" light="#EDE9FE" onClick={() => navigate("/skills")} />
      </div>

      {/* ── AI Pick ────────────────────────────────────────────────── */}
      {featuredData && featured && (
        <div>
          <p className="text-xs font-bold text-hr-text-m uppercase tracking-widest mb-3">AI Recommended for you</p>
          <div
            className="bg-white border border-hr-border rounded-2xl p-6 cursor-pointer hover:border-hr-green/40 hover:shadow-card-md transition-all group shadow-card"
            onClick={() => navigate(`/challenge/${featuredData.id}`)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-hr-green bg-hr-green-l border border-hr-green/20 px-2 py-0.5 rounded-full">
                    AI Pick
                  </span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", diffClass(featuredData.difficulty))}>
                    {featuredData.difficulty}
                  </span>
                  {featuredData.companies.slice(0, 2).map(c => (
                    <span key={c} className="text-[10px] text-hr-text-m bg-gray-100 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
                <h2 className="text-lg font-extrabold text-hr-text mb-1 group-hover:text-hr-green-t transition-colors leading-tight">
                  {featuredData.title}
                </h2>
                <p className="text-sm text-hr-text-s line-clamp-2 mb-2 leading-relaxed">{featuredData.description}</p>
                <p className="text-xs text-hr-green/70 italic">{featured.reason}</p>
              </div>
              <button
                className="btn-shine flex-shrink-0 flex items-center gap-2 bg-hr-green hover:bg-hr-green-d text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-150 active:scale-95 shadow-sm mt-1"
                onClick={e => { e.stopPropagation(); navigate(`/challenge/${featuredData.id}`); }}
              >
                Start
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>

            {/* More recs inline */}
            {recs.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-0.5">
                {recs.slice(1, 3).map(rec => {
                  const ch = SAMPLE_CHALLENGES.find(c => c.id === rec.challenge.id);
                  if (!ch) return null;
                  return (
                    <button
                      key={rec.challenge.id}
                      onClick={e => { e.stopPropagation(); navigate(`/challenge/${rec.challenge.id}`); }}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left group/rec"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-hr-text group-hover/rec:text-hr-green transition-colors truncate">{ch.title}</p>
                        <p className="text-[10px] text-hr-text-m">{ch.skill_tags[0]} · {ch.estimated_time_minutes}m</p>
                      </div>
                      <span className="material-symbols-outlined text-[14px] text-hr-text-m group-hover/rec:text-hr-green transition-colors flex-shrink-0 ml-2">arrow_forward</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Skills + Activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white border border-hr-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-hr-text">Skill Snapshot</h2>
            <button
              onClick={() => navigate("/skills")}
              className="btn-shine text-xs text-hr-green font-semibold bg-[#D1FAE5] hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              View tree
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {skillRows.map(({ name, pct }) => {
              const color = pct >= 70 ? "#2EC866" : pct >= 45 ? "#6366F1" : "#F59E0B";
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-hr-text-s font-medium">{name}</span>
                    <span className="font-bold font-mono" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-hr-border rounded-2xl p-6 shadow-card">
          <h2 className="font-bold text-hr-text mb-4">This Week</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: "Challenges solved", value: weekSessions,                                                                         icon: "code",        color: "#6366F1" },
              { label: "Cards reviewed",    value: Object.values(activityLog).reduce((s, d) => s + d.reviews, 0),                        icon: "history_edu", color: "#2EC866" },
              { label: "Focus sessions",    value: (activityLog[today]?.pomodoros ?? 0),                                                  icon: "timer",       color: "#F59E0B" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <span className="text-sm text-hr-text-s">{label}</span>
                </div>
                <span className="font-extrabold text-hr-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
