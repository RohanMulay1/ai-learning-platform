import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Challenge, TutorMessage } from "../types";

/* ────────────────────────────────────────────────────────
   AUTH
──────────────────────────────────────────────────────── */
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (access, refresh) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
      },
      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: "auth-store" }
  )
);

/* ────────────────────────────────────────────────────────
   PROGRESS  (the closed-loop engine)
──────────────────────────────────────────────────────── */

// Map: challenge id / quiz id / lesson id → path node id
// When that item is completed, the corresponding node unlocks.
export const ITEM_TO_NODE: Record<string, string> = {
  // challenge id → node
  "1":  "n3",   // Two Sum → node 3
  "2":  "n4",   // Valid Anagram → node 4
  "4":  "n8",   // Valid Palindrome → node 8
  "5":  "n4",   // Longest Substring → also node 4 (alt path)
  "7":  "n13",  // Binary Search → node 13
  "9":  "n17",  // Invert Binary Tree → node 17
  "11": "n9",   // 3Sum → node 9
  // lesson ids
  "l1": "n1",   // Array Fundamentals
  "l2": "n5",   // Sliding Window
  "l3": "n7",   // Two Pointer Technique
  "l4": "n7",   // Fixed-size window (same node)
  "l5": "n10",  // Variable window
  "l6": "n12",  // Binary Search basics
  "l7": "n14",  // Leftmost position
  // quiz ids
  "arrays":        "n6",   // Arrays chapter boss (quiz)
  "two-pointers":  "n11",  // Two Pointers boss
  "binary-search": "n15",  // Binary Search boss
};

// Node order in the path (determines what becomes "current" next)
const NODE_ORDER = [
  "n1","n2","n3","n4","n5","n6",
  "n7","n8","n9","n10","n11",
  "n12","n13","n14","n15",
  "n16","n17","n18","n19",
];

// Initial state: first two nodes already done for a better first-load
const INITIAL_COMPLETED = new Set(["n1", "n2"]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function computeCurrentNode(completedIds: Set<string>): string {
  for (const id of NODE_ORDER) {
    if (!completedIds.has(id)) return id;
  }
  return NODE_ORDER[NODE_ORDER.length - 1];
}

function xpToLevel(xp: number): { level: number; pct: number } {
  // Each level needs 500 XP. Level 1 starts at 0.
  const level = Math.floor(xp / 500) + 1;
  const pct = Math.round(((xp % 500) / 500) * 100);
  return { level, pct };
}

export interface ProgressState {
  xp: number;
  streak: number;
  lastActivityDate: string | null;
  weekActivity: boolean[]; // [Mon..Sun]
  hearts: number;
  dailyXP: number;
  dailyGoal: number;
  dailyQuestDate: string;
  completedNodeIds: string[];
  completedChallengeIds: string[];
  completedLessonIds: string[];
  completedQuizIds: string[];
  leagueWeeklyXP: number;
}

interface ProgressStore extends ProgressState {
  earnXP: (amount: number) => void;
  completeChallenge: (challengeId: string, xp?: number) => void;
  completeLesson: (lessonId: string, xp?: number) => void;
  completeQuiz: (quizId: string, xp?: number) => void;
  loseHeart: () => void;
  resetProgress: () => void;
  // derived helpers
  currentNodeId: () => string;
  isNodeDone: (nodeId: string) => boolean;
  isNodeCurrent: (nodeId: string) => boolean;
}

const INITIAL_STATE: ProgressState = {
  xp: 340,
  streak: 12,
  lastActivityDate: today(),
  weekActivity: [true, true, true, false, true, true, true],
  hearts: 5,
  dailyXP: 40,
  dailyGoal: 500,
  dailyQuestDate: today(),
  completedNodeIds: ["n1", "n2"],
  completedChallengeIds: [],
  completedLessonIds: [],
  completedQuizIds: [],
  leagueWeeklyXP: 340,
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      earnXP(amount: number) {
        const todayStr = today();
        set((s) => {
          // Reset daily XP if it's a new day
          const dailyXP = s.dailyQuestDate === todayStr ? s.dailyXP + amount : amount;
          // Update streak
          let streak = s.streak;
          let weekActivity = [...s.weekActivity];
          if (s.lastActivityDate !== todayStr) {
            const dayOfWeek = new Date().getDay(); // 0=Sun
            const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0
            weekActivity[idx] = true;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().slice(0, 10);
            streak = s.lastActivityDate === yStr ? s.streak + 1 : 1;
          }
          return {
            xp: s.xp + amount,
            leagueWeeklyXP: s.leagueWeeklyXP + amount,
            dailyXP,
            dailyQuestDate: todayStr,
            streak,
            weekActivity,
            lastActivityDate: todayStr,
          };
        });
      },

      completeChallenge(challengeId: string, xp = 50) {
        const s = get();
        if (s.completedChallengeIds.includes(challengeId)) return; // already done
        const nodeId = ITEM_TO_NODE[challengeId];
        const completedNodeIds = nodeId
          ? [...new Set([...s.completedNodeIds, nodeId])]
          : s.completedNodeIds;
        set({ completedChallengeIds: [...s.completedChallengeIds, challengeId], completedNodeIds });
        get().earnXP(xp);
      },

      completeLesson(lessonId: string, xp = 20) {
        const s = get();
        if (s.completedLessonIds.includes(lessonId)) return;
        const nodeId = ITEM_TO_NODE[lessonId];
        const completedNodeIds = nodeId
          ? [...new Set([...s.completedNodeIds, nodeId])]
          : s.completedNodeIds;
        set({ completedLessonIds: [...s.completedLessonIds, lessonId], completedNodeIds });
        get().earnXP(xp);
      },

      completeQuiz(quizId: string, xp = 100) {
        const s = get();
        if (s.completedQuizIds.includes(quizId)) return;
        const nodeId = ITEM_TO_NODE[quizId];
        const completedNodeIds = nodeId
          ? [...new Set([...s.completedNodeIds, nodeId])]
          : s.completedNodeIds;
        set({ completedQuizIds: [...s.completedQuizIds, quizId], completedNodeIds });
        get().earnXP(xp);
      },

      loseHeart() {
        set((s) => ({ hearts: Math.max(0, s.hearts - 1) }));
      },

      resetProgress() {
        set({ ...INITIAL_STATE });
      },

      currentNodeId() {
        return computeCurrentNode(new Set(get().completedNodeIds));
      },

      isNodeDone(nodeId: string) {
        return get().completedNodeIds.includes(nodeId);
      },

      isNodeCurrent(nodeId: string) {
        return get().currentNodeId() === nodeId;
      },
    }),
    { name: "progress-store" }
  )
);

/* ────────────────────────────────────────────────────────
   ONBOARDING
──────────────────────────────────────────────────────── */
interface OnboardingStore {
  completed: boolean;
  level: "beginner" | "intermediate" | "advanced" | null;
  goalTopics: string[];
  timeline: string;
  setCompleted: (level: "beginner" | "intermediate" | "advanced", topics: string[], timeline?: string) => void;
  reset: () => void;
}
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completed: false,
      level: null,
      goalTopics: [],
      timeline: "",
      setCompleted: (level, goalTopics, timeline = "") => set({ completed: true, level, goalTopics, timeline }),
      reset: () => set({ completed: false, level: null, goalTopics: [], timeline: "" }),
    }),
    { name: "onboarding-store" }
  )
);

/* ────────────────────────────────────────────────────────
   CHALLENGE WORKSPACE
──────────────────────────────────────────────────────── */
interface ChallengeStore {
  currentChallenge: Challenge | null;
  setCurrentChallenge: (c: Challenge | null) => void;
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  output: string;
  setOutput: (out: string) => void;
}
export const useChallengeStore = create<ChallengeStore>()((set) => ({
  currentChallenge: null,
  setCurrentChallenge: (c) => set({ currentChallenge: c }),
  code: "# Write your solution here\n",
  setCode: (code) => set({ code }),
  language: "python",
  setLanguage: (language) => set({ language }),
  output: "",
  setOutput: (output) => set({ output }),
}));

/* ────────────────────────────────────────────────────────
   TUTOR
──────────────────────────────────────────────────────── */
interface TutorStore {
  sessionId: string | null;
  messages: TutorMessage[];
  isOpen: boolean;
  isConnected: boolean;
  setSessionId: (id: string | null) => void;
  addMessage: (msg: TutorMessage) => void;
  setOpen: (open: boolean) => void;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
}
export const useTutorStore = create<TutorStore>()((set) => ({
  sessionId: null,
  messages: [],
  isOpen: false,
  isConnected: false,
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setOpen: (isOpen) => set({ isOpen }),
  setConnected: (isConnected) => set({ isConnected }),
  clearMessages: () => set({ messages: [] }),
}));

/* ────────────────────────────────────────────────────────
   UI
──────────────────────────────────────────────────────── */
interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "ui-store" }
  )
);
