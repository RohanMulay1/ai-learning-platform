import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PomodoroMode = "25/5" | "50/10";
export type PomodoroPhase = "idle" | "work" | "break";

export interface PomodoroReward {
  type: "xp" | "multiplier" | "badge";
  label: string;
  emoji: string;
  bonusXp: number;
}

export interface DayActivity {
  challenges: number;
  reviews: number;
  pomodoros: number;
}

const WORK_SECONDS: Record<PomodoroMode, number> = { "25/5": 25 * 60, "50/10": 50 * 60 };
const BREAK_SECONDS: Record<PomodoroMode, number> = { "25/5": 5 * 60, "50/10": 10 * 60 };

const REWARD_POOL: PomodoroReward[] = [
  { type: "xp",         label: "+50 Bonus XP!",              emoji: "⚡", bonusXp: 50 },
  { type: "multiplier", label: "2× XP on next challenge!",   emoji: "🚀", bonusXp: 0  },
  { type: "badge",      label: "Focus Master badge!",        emoji: "🏅", bonusXp: 25 },
  { type: "xp",         label: "+25 Bonus XP!",              emoji: "✨", bonusXp: 25 },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDemoActivityLog(): Record<string, DayActivity> {
  const log: Record<string, DayActivity> = {};
  const daily = [
    { challenges: 2, reviews: 2, pomodoros: 3 },
    { challenges: 1, reviews: 3, pomodoros: 1 },
    { challenges: 2, reviews: 4, pomodoros: 2 },
    { challenges: 0, reviews: 0, pomodoros: 0 },
    { challenges: 3, reviews: 2, pomodoros: 3 },
    { challenges: 1, reviews: 5, pomodoros: 1 },
    { challenges: 2, reviews: 3, pomodoros: 2 },
  ];
  daily.forEach((d, i) => {
    const date = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    log[date] = d;
  });
  return log;
}

function pickReward(): PomodoroReward | null {
  // Variable-ratio: fires ~40% of the time
  if (Math.random() > 0.4) return null;
  return REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];
}

interface ProductivityState {
  mode: PomodoroMode;
  phase: PomodoroPhase;
  secondsLeft: number;
  sessionCount: number;
  isRunning: boolean;
  activityLog: Record<string, DayActivity>;
  pendingReward: PomodoroReward | null;
  totalBonusXp: number;
  xpMultiplierActive: boolean;

  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setMode: (mode: PomodoroMode) => void;
  tickSecond: () => void;
  logActivity: (type: keyof DayActivity) => void;
  dismissReward: () => void;
}

export const useProductivityStore = create<ProductivityState>()(
  persist(
    (set, get) => ({
      mode: "25/5",
      phase: "idle",
      secondsLeft: WORK_SECONDS["25/5"],
      sessionCount: 3,
      isRunning: false,
      activityLog: buildDemoActivityLog(),
      pendingReward: null,
      totalBonusXp: 75,
      xpMultiplierActive: false,

      startTimer() {
        set(s => ({
          isRunning: true,
          phase: s.phase === "idle" ? "work" : s.phase,
        }));
      },

      pauseTimer() {
        set({ isRunning: false });
      },

      resetTimer() {
        const { mode } = get();
        set({ isRunning: false, phase: "idle", secondsLeft: WORK_SECONDS[mode] });
      },

      setMode(mode) {
        set({ mode, phase: "idle", secondsLeft: WORK_SECONDS[mode], isRunning: false });
      },

      tickSecond() {
        const { secondsLeft, phase, mode, sessionCount } = get();
        if (secondsLeft > 1) {
          set({ secondsLeft: secondsLeft - 1 });
          return;
        }

        // Phase transition
        if (phase === "work") {
          const reward = pickReward();
          const bonusXp = reward?.bonusXp ?? 0;
          get().logActivity("pomodoros");
          set(s => ({
            phase: "break",
            secondsLeft: BREAK_SECONDS[mode],
            sessionCount: sessionCount + 1,
            pendingReward: reward,
            totalBonusXp: s.totalBonusXp + bonusXp,
            xpMultiplierActive: reward?.type === "multiplier",
          }));
        } else {
          set({ phase: "work", secondsLeft: WORK_SECONDS[mode] });
        }
      },

      logActivity(type) {
        const key = todayKey();
        set(s => {
          const today: DayActivity = s.activityLog[key] ?? { challenges: 0, reviews: 0, pomodoros: 0 };
          return {
            activityLog: {
              ...s.activityLog,
              [key]: { ...today, [type]: today[type] + 1 },
            },
          };
        });
      },

      dismissReward() {
        set({ pendingReward: null });
      },
    }),
    {
      name: "productivity-store-v2",
      partialize: (s) => ({
        mode: s.mode,
        sessionCount: s.sessionCount,
        activityLog: s.activityLog,
        totalBonusXp: s.totalBonusXp,
      }),
    }
  )
);
