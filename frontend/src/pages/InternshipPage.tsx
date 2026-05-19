import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { SAMPLE_COURSES } from "../data/sample";

/* ── Internship tracks ──────────────────────────────────────── */

const TRACKS = [
  {
    id: "backend",
    title: "Backend Systems Engineering",
    company: "FinTech Startup",
    description: "A mock 3-day sprint at a Series B fintech startup. You'll debug a payment processing outage, refactor a legacy queue consumer, and ship a rate-limiter under pressure from a demanding Tech Lead.",
    requiredCourse: null,
    requiredCourseTitle: "Open — no prerequisite",
    agents: [
      { role: "Tech Lead", name: "Sarah K.", style: "demanding", icon: "engineering", color: "#EF4444" },
      { role: "PM", name: "David L.", style: "confused", icon: "manage_accounts", color: "#F59E0B" },
      { role: "Senior SWE", name: "Priya M.", style: "helpful", icon: "code", color: "#2EC866" },
    ],
    days: [
      { day: 1, title: "Production Outage",     desc: "Payment service latency spiked 10×. Root-cause the O(n²) loop in the transaction batcher.", type: "chaos",   icon: "warning" },
      { day: 2, title: "Legacy Refactor Sprint", desc: "Rewrite the Redis queue consumer with proper backpressure handling. PM keeps changing requirements.", type: "build",   icon: "construction" },
      { day: 3, title: "Scale Review",           desc: "Your solution hits 100k TPS in load test. The Tech Lead wants a written complexity analysis.", type: "review",  icon: "speed" },
    ],
    skills: ["Arrays & Hashing", "Stack", "Two Pointers"],
    color: "#6366F1",
    icon: "dns",
  },
  {
    id: "ml",
    title: "ML Feature Engineering",
    company: "AI Research Lab",
    description: "3 days embedded in an ML team building a real-time recommendation engine. You'll triage a broken data pipeline, implement a similarity search, and defend your architectural choices to the team.",
    requiredCourse: "c2",
    requiredCourseTitle: "Two Pointers & Sliding Window",
    agents: [
      { role: "ML Lead",     name: "Chen W.", style: "rigorous",  icon: "psychology",       color: "#6366F1" },
      { role: "Data Eng",    name: "Alex R.", style: "pragmatic", icon: "storage",          color: "#2EC866" },
      { role: "Researcher",  name: "Mia F.", style: "curious",   icon: "science",          color: "#38bdf8" },
    ],
    days: [
      { day: 1, title: "Broken Data Pipeline",    desc: "The feature store is returning stale vectors. Debug the sliding window aggregation job.", type: "chaos",  icon: "warning" },
      { day: 2, title: "Similarity Search Sprint", desc: "Implement a k-NN search using the Two Pointers pattern on sorted embedding arrays.", type: "build",  icon: "construction" },
      { day: 3, title: "Model Review & Defense",   desc: "Present your solution to the team. Justify O(n log n) vs O(n²) tradeoffs under questioning.", type: "review", icon: "speed" },
    ],
    skills: ["Two Pointers", "Sliding Window", "Binary Search"],
    color: "#2EC866",
    icon: "model_training",
  },
  {
    id: "distributed",
    title: "Distributed Systems Internship",
    company: "Cloud Infrastructure Co.",
    description: "A simulated on-call rotation at a cloud infra company. You'll resolve a cascading failure in a distributed queue, implement a circuit breaker, and analyze system behavior under Byzantine faults.",
    requiredCourse: null,
    requiredCourseTitle: "Complete all courses",
    agents: [
      { role: "Staff Eng",  name: "Omar A.",  style: "systems-thinker", icon: "hub",     color: "#a78bfa" },
      { role: "SRE Lead",   name: "Julia T.", style: "intense",         icon: "radar",   color: "#EF4444" },
      { role: "Intern Peer",name: "Sam B.",   style: "collaborative",   icon: "group",   color: "#F59E0B" },
    ],
    days: [
      { day: 1, title: "Cascading Failure",      desc: "Trace a latency spike through 5 microservices. Identify the BFS traversal causing the hot path.", type: "chaos",  icon: "warning" },
      { day: 2, title: "Circuit Breaker Build",  desc: "Implement exponential backoff + jitter in the retry policy. The Staff Eng questions every decision.", type: "build",  icon: "construction" },
      { day: 3, title: "Post-Mortem & RCA",      desc: "Write a blameless post-mortem and present your topology-sort-based dependency graph.", type: "review", icon: "speed" },
    ],
    skills: ["Graphs", "Trees", "Dynamic Programming"],
    color: "#a78bfa",
    icon: "hub",
  },
];

function getUnlockProgress(courseId: string | null): { pct: number; label: string } {
  if (!courseId) return { pct: 100, label: "Open" };
  const course = SAMPLE_COURSES.find(c => c.id === courseId);
  if (!course) return { pct: 0, label: "Course not found" };
  return { pct: course.progress, label: course.title };
}

function isUnlocked(courseId: string | null): boolean {
  if (!courseId) return true;
  const course = SAMPLE_COURSES.find(c => c.id === courseId);
  return (course?.progress ?? 0) >= 100;
}

/* ── Track card ──────────────────────────────────────────────── */

function TrackCard({ track }: { track: typeof TRACKS[0] }) {
  const navigate = useNavigate();
  const unlocked = isUnlocked(track.requiredCourse);
  const { pct, label } = getUnlockProgress(track.requiredCourse);

  const dayTypeColor = { chaos: "#EF4444", build: "#6366F1", review: "#2EC866" };

  return (
    <div className={cn(
      "bg-white border rounded-2xl overflow-hidden transition-all shadow-sm",
      unlocked ? "border-gray-200 hover:border-green-300" : "border-gray-100 opacity-80"
    )}>
      {/* Color accent bar */}
      <div className="h-0.5 w-full" style={{ background: unlocked ? track.color : "#E5E7EB" }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${track.color}15`, border: `1px solid ${track.color}25` }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: track.color, fontVariationSettings: "'FILL' 1" }}>{track.icon}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{track.title}</p>
              <p className="text-[10px] text-gray-400">{track.company}</p>
            </div>
          </div>
          {unlocked ? (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
              Unlocked
            </span>
          ) : (
            <span className="material-symbols-outlined text-gray-300 text-xl flex-shrink-0">lock</span>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-4">{track.description}</p>

        {/* AI Agents */}
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-2">AI Colleagues</p>
          <div className="flex gap-2 flex-wrap">
            {track.agents.map(agent => (
              <div key={agent.role} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
                <span className="material-symbols-outlined text-[12px]" style={{ color: agent.color, fontVariationSettings: "'FILL' 1" }}>{agent.icon}</span>
                <span className="text-[10px] font-semibold text-gray-500">{agent.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sprint days */}
        <div className="flex flex-col gap-2 mb-4">
          {track.days.map(day => (
            <div key={day.day} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: `${dayTypeColor[day.type as keyof typeof dayTypeColor]}15`, color: dayTypeColor[day.type as keyof typeof dayTypeColor] }}
              >
                {day.day}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{day.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{day.desc}</p>
              </div>
              <span className="material-symbols-outlined text-[14px]" style={{ color: dayTypeColor[day.type as keyof typeof dayTypeColor] }}>{day.icon}</span>
            </div>
          ))}
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {track.skills.map(s => (
            <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">{s}</span>
          ))}
        </div>

        {/* Lock state */}
        {!unlocked && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-400">Unlock requires: {label}</span>
              <span className="text-gray-500 font-bold">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-300 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <button
          disabled={!unlocked}
          onClick={() => unlocked && navigate(`/internship/${track.id}`)}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            unlocked
              ? "text-white active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
          )}
          style={unlocked ? { background: track.color } : undefined}
        >
          {unlocked ? (
            <>
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
              Start Internship Sprint
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Complete {label} to Unlock
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export function InternshipPage() {
  const unlockedCount = TRACKS.filter(t => isUnlocked(t.requiredCourse)).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a] mb-1">Capstone Feature</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">AI Simulation Internships</h1>
            <p className="text-gray-500 text-sm max-w-xl leading-relaxed">
              The ultimate test. Drop into a mock multi-day sprint with AI colleagues — a demanding Tech Lead, a confused PM, and chaos engineering scenarios built from the concepts you've mastered.
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-[#2EC866]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="text-xs text-gray-500"><span className="text-[#16a34a] font-bold">{unlockedCount}</span> / {TRACKS.length} tracks unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-[#6366F1]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <span className="text-xs text-gray-500">3 simulated days per track</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <span className="text-xs text-gray-500">3 unique AI agents per track</span>
          </div>
        </div>
      </div>

      {/* How it works banner */}
      <div className="rounded-2xl border border-green-200 bg-[#F0FDF4] p-5 mb-8 flex items-start gap-4">
        <span className="material-symbols-outlined text-[#16a34a] mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1">How Internship Simulations Work</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Each track is locked behind 100% completion of the required course. Once unlocked, you work through a 3-day simulated sprint — Day 1 is a production chaos scenario, Day 2 is a coding build challenge, Day 3 is a review where AI agents interrogate your decisions. You're graded on reasoning quality, not just output.
          </p>
        </div>
      </div>

      {/* Tracks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TRACKS.map(track => <TrackCard key={track.id} track={track} />)}
      </div>

      {/* Bottom: coming soon note */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-300">More internship tracks unlocking as new course content is added.</p>
      </div>
    </div>
  );
}
