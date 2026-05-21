import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgentReactionRecord {
  name: string;
  role: string;
  color: string;
  icon: string;
  message: string;
}

export interface FollowUpRecord {
  agentName: string;
  userMessage: string;
  agentReply: string;
}

export interface DayResult {
  submission: string;
  agentReactions: AgentReactionRecord[];
  followUps: FollowUpRecord[];
  score: number;
  strengths: string[];
  gaps: string[];
}

export interface SprintState {
  started: boolean;
  currentDay: number;
  completedDays: Record<number, DayResult>;
  sprintComplete: boolean;
  letterOfRecommendation: string;
}

interface InternshipStore {
  sprints: Record<string, SprintState>;
  startSprint: (trackId: string) => void;
  saveDayResult: (trackId: string, dayIdx: number, result: DayResult) => void;
  advanceDay: (trackId: string) => void;
  completeSprint: (trackId: string, letter: string) => void;
  resetSprint: (trackId: string) => void;
}

const DEFAULT: SprintState = {
  started: false,
  currentDay: 0,
  completedDays: {},
  sprintComplete: false,
  letterOfRecommendation: "",
};

export const useInternshipStore = create<InternshipStore>()(
  persist(
    (set) => ({
      sprints: {},

      startSprint: (trackId) =>
        set((s) => ({
          sprints: {
            ...s.sprints,
            [trackId]: s.sprints[trackId] ?? { ...DEFAULT, started: true },
          },
        })),

      saveDayResult: (trackId, dayIdx, result) =>
        set((s) => ({
          sprints: {
            ...s.sprints,
            [trackId]: {
              ...(s.sprints[trackId] ?? { ...DEFAULT, started: true }),
              completedDays: {
                ...(s.sprints[trackId]?.completedDays ?? {}),
                [dayIdx]: result,
              },
            },
          },
        })),

      advanceDay: (trackId) =>
        set((s) => {
          const sprint = s.sprints[trackId] ?? DEFAULT;
          return {
            sprints: {
              ...s.sprints,
              [trackId]: { ...sprint, currentDay: sprint.currentDay + 1 },
            },
          };
        }),

      completeSprint: (trackId, letter) =>
        set((s) => ({
          sprints: {
            ...s.sprints,
            [trackId]: {
              ...(s.sprints[trackId] ?? DEFAULT),
              sprintComplete: true,
              letterOfRecommendation: letter,
            },
          },
        })),

      resetSprint: (trackId) =>
        set((s) => ({
          sprints: { ...s.sprints, [trackId]: { ...DEFAULT } },
        })),
    }),
    { name: "internship-store" }
  )
);
