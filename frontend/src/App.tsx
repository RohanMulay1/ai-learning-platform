import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "./stores/store";
import { useLearnerStore } from "./stores/learnerStore";
import { InternshipWorkspacePage } from "./pages/InternshipWorkspacePage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ChallengeWorkspace } from "./components/workspace/ChallengeWorkspace";
import { SessionRecap } from "./components/workspace/SessionRecap";
import { SkillTree } from "./components/skill-tree/SkillTree";
import { ReviewQueue } from "./components/dashboard/ReviewQueue";
import { ChallengesPage } from "./pages/ChallengesPage";
import { CoursesPage } from "./pages/CoursesPage";
import { LessonPage } from "./pages/LessonPage";
import { QuizPage } from "./pages/QuizPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { WeeklyReportPage } from "./pages/WeeklyReportPage";
import { InternshipPage } from "./pages/InternshipPage";
import { RewardToast } from "./components/productivity/RewardToast";
import { AIAssistant } from "./components/ai-assistant/AIAssistant";
import { useOnboardingStore } from "./stores/store";
import { cn } from "./lib/utils";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { completed } = useOnboardingStore();
  if (!completed) return <Navigate to="/onboarding" replace />;
  return (
    <>
      {children}
      <AIAssistant />
    </>
  );
}

const NAV = [
  { to: "/dashboard",  icon: "home",            label: "Home"        },
  { to: "/courses",    icon: "school",           label: "Learn"       },
  { to: "/challenges", icon: "code",             label: "Challenges"  },
  { to: "/review",     icon: "history_edu",      label: "Review"      },
  { to: "/reports",    icon: "analytics",        label: "Reports"     },
  { to: "/internship", icon: "business_center",  label: "Internship"  },
  { to: "/skills",     icon: "account_tree",     label: "Skill Tree"  },
];

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { streak, xp, level } = useLearnerStore();
  const [expanded, setExpanded] = useState(false);
  const initials = user?.first_name ? user.first_name[0].toUpperCase() : "R";
  const currentNav = NAV.find(n => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen overflow-hidden bg-hr-bg">

      {/* Sidebar — dark, HackerRank-style */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "fixed left-0 top-0 h-full z-50 flex flex-col py-4 border-r border-white/5 bg-hr-sidebar transition-all duration-200 ease-out overflow-hidden",
          expanded ? "w-56 shadow-xl" : "w-14"
        )}
      >
        {/* Brand */}
        <div className={cn("flex items-center gap-3 mb-6 flex-shrink-0 px-3.5")}>
          <div className="w-7 h-7 rounded-lg bg-hr-green flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-black">L</span>
          </div>
          <span className={cn(
            "font-black text-white tracking-tight text-base transition-all duration-200",
            expanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
          )}>
            LearnAI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1 px-2 overflow-hidden">
          {NAV.map(({ to, icon, label }) => {
            const active = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "relative flex items-center rounded-lg transition-all duration-150 h-9 overflow-hidden group",
                  expanded ? "gap-3 px-3" : "justify-center px-0",
                  active
                    ? "bg-hr-green/15 text-hr-green"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-hr-green rounded-r-full" />
                )}
                <span
                  className="material-symbols-outlined text-[20px] flex-shrink-0"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className={cn(
                  "text-sm font-semibold whitespace-nowrap transition-all duration-200",
                  expanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden"
                )}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: XP + logout */}
        <div className="px-2 flex flex-col gap-0.5 flex-shrink-0">
          {/* XP bar — visible when expanded */}
          <div className={cn("transition-all duration-200 overflow-hidden", expanded ? "opacity-100 max-h-20 mb-1" : "opacity-0 max-h-0")}>
            <div className="mx-1 px-3 py-2 rounded-lg bg-white/5">
              <div className="flex justify-between text-[10px] font-bold text-white/40 mb-1.5">
                <span>Lv. {level}</span>
                <span className="text-hr-green">{xp % 500}/500 XP</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-hr-green rounded-full transition-all duration-500"
                  style={{ width: `${(xp % 500) / 500 * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Streak chip */}
          <div className={cn(
            "flex items-center rounded-lg h-9 transition-all overflow-hidden",
            expanded ? "gap-3 px-3" : "justify-center px-0"
          )}>
            <span className="text-base flex-shrink-0 leading-none">🔥</span>
            <span className={cn(
              "text-sm font-semibold text-amber-400 whitespace-nowrap transition-all duration-200",
              expanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden"
            )}>
              {streak} day streak
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={cn(
              "flex items-center rounded-lg h-9 text-white/40 hover:text-white hover:bg-white/8 transition-all overflow-hidden",
              expanded ? "gap-3 px-3" : "justify-center px-0"
            )}
          >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0">logout</span>
            <span className={cn(
              "text-sm font-semibold whitespace-nowrap transition-all duration-200",
              expanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden"
            )}>
              Sign out
            </span>
          </button>

          {/* Avatar */}
          <div className={cn(
            "flex items-center rounded-lg h-10 mt-1 overflow-hidden border-t border-white/5 pt-2",
            expanded ? "gap-3 px-3" : "justify-center px-0"
          )}>
            <div className="w-7 h-7 rounded-full bg-hr-green/20 border border-hr-green/40 flex items-center justify-center text-[11px] font-bold text-hr-green flex-shrink-0">
              {initials}
            </div>
            <span className={cn(
              "text-sm font-semibold text-white whitespace-nowrap transition-all duration-200",
              expanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden"
            )}>
              {user?.first_name ?? "Rohan"} {user?.last_name ?? "Mulay"}
            </span>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 ml-14 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="h-13 flex justify-between items-center px-6 py-3 bg-white border-b border-hr-border flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-hr-text-s text-sm font-medium">{currentNav?.label ?? ""}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-hr-text-m text-[16px]">search</span>
              <input
                className="bg-hr-bg border border-hr-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-hr-text placeholder-hr-text-m focus:outline-none focus:ring-2 focus:ring-hr-green/30 focus:border-hr-green/40 w-44 transition-all"
                placeholder="Search…"
              />
            </div>
<button className="w-8 h-8 flex items-center justify-center rounded-lg text-hr-text-m hover:text-hr-text hover:bg-hr-bg transition-all">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-hr-green/15 border border-hr-green/25 flex items-center justify-center text-[11px] font-bold text-hr-green-t">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main key={location.key} className="flex-1 overflow-y-auto scrollbar-hide bg-hr-bg page-enter">
          {children}
        </main>
      </div>

      <RewardToast />
    </div>
  );
}

function BadgesPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-hr-text mb-1">Badges</h1>
      <p className="text-hr-text-s text-sm mb-8">Earn badges by completing challenges and hitting milestones.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: "First Blood",    desc: "Solved first challenge",    color: "text-hr-purple",  bg: "bg-hr-purple-l",  border: "border-hr-purple/20" },
          { name: "Hash Hacker",    desc: "Mastered hash map pattern", color: "text-hr-green-t", bg: "bg-hr-green-l",   border: "border-hr-green/20"  },
          { name: "Streak Warrior", desc: "7-day coding streak",       color: "text-amber-600",  bg: "bg-amber-50",     border: "border-amber-200"    },
          { name: "Speed Demon",    desc: "Hard problem under 5 min",  color: "text-red-500",    bg: "bg-red-50",       border: "border-red-200"      },
        ].map(badge => (
          <div key={badge.name} className={cn("bg-white rounded-xl p-5 flex flex-col items-center text-center border shadow-card", badge.border)}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", badge.bg)}>
              <span className={cn("material-symbols-outlined", badge.color)} style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
            </div>
            <h3 className={cn("font-bold text-sm mb-1", badge.color)}>{badge.name}</h3>
            <p className="text-hr-text-s text-xs leading-relaxed">{badge.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/"           element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"      element={<Navigate to="/dashboard" replace />} />
        <Route path="/register"   element={<Navigate to="/dashboard" replace />} />

        <Route path="/challenge/:id"       element={<ProtectedRoute><ChallengeWorkspace /></ProtectedRoute>} />
        <Route path="/recap/:challengeId"  element={<ProtectedRoute><SessionRecap /></ProtectedRoute>} />

        <Route path="/dashboard"                   element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/courses"                     element={<ProtectedRoute><AppLayout><CoursesPage /></AppLayout></ProtectedRoute>} />
        <Route path="/courses/:id"                 element={<ProtectedRoute><AppLayout><CoursesPage /></AppLayout></ProtectedRoute>} />
        <Route path="/lesson/:courseId/:lessonId"  element={<ProtectedRoute><AppLayout><LessonPage /></AppLayout></ProtectedRoute>} />
        <Route path="/quiz/:quizId"                element={<ProtectedRoute><AppLayout><QuizPage /></AppLayout></ProtectedRoute>} />
        <Route path="/challenges"                  element={<ProtectedRoute><AppLayout><ChallengesPage /></AppLayout></ProtectedRoute>} />
        <Route path="/skills"                      element={<ProtectedRoute><AppLayout><SkillTree /></AppLayout></ProtectedRoute>} />
        <Route path="/review"                      element={<ProtectedRoute><AppLayout><ReviewQueue /></AppLayout></ProtectedRoute>} />
        <Route path="/knowledge"                   element={<Navigate to="/courses?tab=notes" replace />} />
        <Route path="/reports"                     element={<ProtectedRoute><AppLayout><WeeklyReportPage /></AppLayout></ProtectedRoute>} />
        <Route path="/internship"                  element={<ProtectedRoute><AppLayout><InternshipPage /></AppLayout></ProtectedRoute>} />
        <Route path="/internship/:trackId"         element={<ProtectedRoute><InternshipWorkspacePage /></ProtectedRoute>} />
        <Route path="/badges"                      element={<ProtectedRoute><AppLayout><BadgesPage /></AppLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
