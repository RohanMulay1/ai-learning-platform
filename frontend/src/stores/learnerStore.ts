import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MasteryResult, BehaviorProfile, AttemptSignals } from "../agents/masteryAgent";
import { calculateMastery, buildBehaviorProfile } from "../agents/masteryAgent";
import type { Recommendation, ChallengeCandidate, SkillMastery } from "../agents/recommendationAgent";
import { recommend } from "../agents/recommendationAgent";

/* ── Telemetry ───────────────────────────────────────────── */

export interface SessionTelemetrySnapshot {
  timeToFirstCommitMs: number;
  rewriteDensityScore: number;
  executionFrequencyCount: number;
  paralysisWindowsCount: number;
  hintVelocityRate: number;
  errorRepetitionFrequency: number;
}

export interface BehaviorArchetype {
  fastReckless: number;
  paralyzed: number;
  hintDependent: number;
  patternMemorizer: number;
  sessionCount: number;
}

/* ── Review Cards (SM-2) ─────────────────────────────────── */

export interface ReviewCardState {
  challengeId: string;
  challengeTitle: string;
  skillTags: string[];
  difficulty: "easy" | "medium" | "hard";
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewed: string | null;
  lastMasteryScore: number;
}

function sm2Update(card: ReviewCardState, quality: number): ReviewCardState {
  let { interval, easeFactor, repetitions } = card;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const next = new Date();
  next.setDate(next.getDate() + interval);
  return {
    ...card,
    interval,
    easeFactor: Math.round(easeFactor * 1000) / 1000,
    repetitions,
    lastReviewed: new Date().toISOString().slice(0, 10),
    nextReviewDate: next.toISOString().slice(0, 10),
  };
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/* ── Knowledge Hub ───────────────────────────────────────── */

export interface KnowledgeDoc {
  id: string;
  filename: string;
  rawText: string;
  eli5Text: string;
  concepts: string[];
  flashcardsAdded: boolean;
  uploadedAt: number;
}

/* ── Session records ─────────────────────────────────────── */

export interface AttemptRecord {
  challengeId: string;
  challengeTitle: string;
  skillTags: string[];
  difficulty: "easy" | "medium" | "hard";
  masteryResult: MasteryResult;
  hintsUsed: number;
  elapsedMs: number;
  expectedMs: number;
  timestamp: number;
  telemetry?: SessionTelemetrySnapshot;
}

export interface ActiveSession {
  challengeId: string;
  challengeTitle: string;
  startedAt: number;
  hintsUsed: number;
  submissionAttempts: number;
  conversationDepth: number;
  lastCode: string;
  lastExplanation: string;
}

/* ── Enrichment helper ───────────────────────────────────── */

function enrichCandidates(
  candidates: ChallengeCandidate[],
  attempts: AttemptRecord[],
): ChallengeCandidate[] {
  const lastByChallenge = new Map<string, AttemptRecord>();
  for (const a of attempts) {
    const ex = lastByChallenge.get(a.challengeId);
    if (!ex || a.timestamp > ex.timestamp) lastByChallenge.set(a.challengeId, a);
  }
  return candidates.map(c => {
    const last = lastByChallenge.get(c.id);
    return last
      ? { ...c, lastAttempted: last.timestamp, lastMasteryScore: last.masteryResult.score }
      : c;
  });
}

/* ── State interface ─────────────────────────────────────── */

export interface LearnerState {
  userId: string;
  displayName: string;
  level: number;
  xp: number;
  streak: number;
  lastActiveDate: string;

  skillMastery: Record<string, number>;
  attempts: AttemptRecord[];
  activeSession: ActiveSession | null;
  behaviorProfile: BehaviorProfile;
  recommendations: Recommendation[];
  lastSessionTelemetry: SessionTelemetrySnapshot | null;
  behaviorArchetype: BehaviorArchetype;

  reviewCards: ReviewCardState[];
  knowledgeDocuments: KnowledgeDoc[];

  totalChallengesSolved: number;
  totalXpEarned: number;
  avgMasteryScore: number;

  startSession: (challengeId: string, challengeTitle: string) => void;
  updateSession: (patch: Partial<Omit<ActiveSession, "challengeId" | "startedAt">>) => void;
  submitAttempt: (
    signals: AttemptSignals & {
      challengeTitle: string;
      skillTags: string[];
      difficulty: "easy" | "medium" | "hard";
      expectedMs: number;
      telemetry?: SessionTelemetrySnapshot;
    },
    allCandidates: ChallengeCandidate[],
    skillGraph: SkillMastery[],
  ) => MasteryResult;
  endSession: () => void;
  refreshRecommendations: (candidates: ChallengeCandidate[], skillGraph: SkillMastery[]) => void;
  rateReviewCard: (challengeId: string, quality: number) => void;
  addKnowledgeDoc: (doc: KnowledgeDoc) => void;
  addKnowledgeCards: (cards: ReviewCardState[]) => void;
}

/* ── Defaults ────────────────────────────────────────────── */

function buildDemoDefaults() {
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offset = 0) => new Date(now + offset * day).toISOString().slice(0, 10);

  const attempts: AttemptRecord[] = [
    { challengeId: "1", challengeTitle: "Two Sum", skillTags: ["Arrays & Hashing"], difficulty: "easy", masteryResult: { score: 0.88, breakdown: { timeScore: 0.90, hintScore: 1.00, explanationScore: 0.82, attemptScore: 1.00, codeScore: 0.75 }, level: "mastered", xpEarned: 125, insights: ["Solved it quickly — strong recall.", "Clear explanation."] }, hintsUsed: 0, elapsedMs: 720_000, expectedMs: 900_000, timestamp: now - 7 * day },
    { challengeId: "2", challengeTitle: "Valid Anagram", skillTags: ["Arrays & Hashing"], difficulty: "easy", masteryResult: { score: 0.92, breakdown: { timeScore: 0.85, hintScore: 1.00, explanationScore: 0.88, attemptScore: 1.00, codeScore: 0.80 }, level: "mastered", xpEarned: 125, insights: ["Efficient implementation."] }, hintsUsed: 0, elapsedMs: 450_000, expectedMs: 600_000, timestamp: now - 6 * day },
    { challengeId: "3", challengeTitle: "Contains Duplicate", skillTags: ["Arrays & Hashing"], difficulty: "easy", masteryResult: { score: 0.72, breakdown: { timeScore: 0.80, hintScore: 0.80, explanationScore: 0.65, attemptScore: 0.80, codeScore: 0.70 }, level: "proficient", xpEarned: 75, insights: ["Relied on hints — try without them next time."] }, hintsUsed: 1, elapsedMs: 550_000, expectedMs: 600_000, timestamp: now - 5 * day },
    { challengeId: "4", challengeTitle: "Best Time to Buy and Sell Stock", skillTags: ["Two Pointers"], difficulty: "easy", masteryResult: { score: 0.91, breakdown: { timeScore: 0.88, hintScore: 1.00, explanationScore: 0.85, attemptScore: 1.00, codeScore: 0.75 }, level: "mastered", xpEarned: 125, insights: ["Solved it quickly."] }, hintsUsed: 0, elapsedMs: 900_000, expectedMs: 1_200_000, timestamp: now - 4 * day },
    { challengeId: "5", challengeTitle: "Longest Substring Without Repeating Characters", skillTags: ["Sliding Window"], difficulty: "medium", masteryResult: { score: 0.65, breakdown: { timeScore: 0.60, hintScore: 0.60, explanationScore: 0.72, attemptScore: 0.80, codeScore: 0.65 }, level: "proficient", xpEarned: 60, insights: ["Multiple submissions — trace through examples."] }, hintsUsed: 2, elapsedMs: 1_800_000, expectedMs: 1_500_000, timestamp: now - 3 * day },
    { challengeId: "6", challengeTitle: "Valid Parentheses", skillTags: ["Stack"], difficulty: "easy", masteryResult: { score: 0.79, breakdown: { timeScore: 0.85, hintScore: 0.80, explanationScore: 0.75, attemptScore: 0.80, codeScore: 0.75 }, level: "proficient", xpEarned: 75, insights: ["Good use of data structures."] }, hintsUsed: 1, elapsedMs: 700_000, expectedMs: 900_000, timestamp: now - 2 * day },
    { challengeId: "7", challengeTitle: "Binary Search", skillTags: ["Binary Search"], difficulty: "easy", masteryResult: { score: 0.45, breakdown: { timeScore: 0.50, hintScore: 0.40, explanationScore: 0.45, attemptScore: 0.60, codeScore: 0.50 }, level: "developing", xpEarned: 30, insights: ["Took longer than expected.", "Relied on hints."] }, hintsUsed: 3, elapsedMs: 2_400_000, expectedMs: 900_000, timestamp: now - day },
    { challengeId: "8", challengeTitle: "Merge Two Sorted Lists", skillTags: ["Linked List"], difficulty: "easy", masteryResult: { score: 0.82, breakdown: { timeScore: 0.78, hintScore: 1.00, explanationScore: 0.78, attemptScore: 1.00, codeScore: 0.75 }, level: "mastered", xpEarned: 125, insights: ["Efficient implementation."] }, hintsUsed: 0, elapsedMs: 1_100_000, expectedMs: 1_200_000, timestamp: now - 3_600_000 },
  ];

  const reviewCards: ReviewCardState[] = [
    { challengeId: "1", challengeTitle: "Two Sum", skillTags: ["Arrays & Hashing"], difficulty: "easy", interval: 4, easeFactor: 2.6, repetitions: 2, nextReviewDate: iso(0), lastReviewed: iso(-2), lastMasteryScore: 0.88 },
    { challengeId: "5", challengeTitle: "Longest Substring Without Repeating Characters", skillTags: ["Sliding Window"], difficulty: "medium", interval: 2, easeFactor: 2.3, repetitions: 1, nextReviewDate: iso(0), lastReviewed: iso(-1), lastMasteryScore: 0.65 },
    { challengeId: "3", challengeTitle: "Contains Duplicate", skillTags: ["Arrays & Hashing"], difficulty: "easy", interval: 1, easeFactor: 2.5, repetitions: 0, nextReviewDate: iso(-1), lastReviewed: null, lastMasteryScore: 0.72 },
    { challengeId: "4", challengeTitle: "Best Time to Buy and Sell Stock", skillTags: ["Two Pointers"], difficulty: "easy", interval: 6, easeFactor: 2.7, repetitions: 3, nextReviewDate: iso(3), lastReviewed: iso(0), lastMasteryScore: 0.91 },
    { challengeId: "2", challengeTitle: "Valid Anagram", skillTags: ["Arrays & Hashing"], difficulty: "easy", interval: 12, easeFactor: 2.8, repetitions: 4, nextReviewDate: iso(7), lastReviewed: iso(-1), lastMasteryScore: 0.95 },
  ];

  const knowledgeDocuments: KnowledgeDoc[] = [
    { id: "demo-doc-1", filename: "hash-maps-notes.txt", rawText: "Hash maps provide O(1) average time complexity for lookup, insertion, and deletion. They use a hash function to map keys to array indices. Common patterns: frequency counting, complement lookups (Two Sum), grouping by key (Group Anagrams). Space complexity is O(n).", eli5Text: "• A hash map is like a magic dictionary — find any word instantly\n• Give it a key, get an answer at O(1) speed\n• Used for: counting things, finding pairs, grouping similar items\n• Costs O(n) extra memory but saves huge amounts of time", concepts: ["Hash Maps", "O(1) lookup", "Frequency counting", "Two Sum pattern", "Group Anagrams", "Space complexity"], flashcardsAdded: true, uploadedAt: now - 3 * day },
    { id: "demo-doc-2", filename: "sliding-window-cheatsheet.md", rawText: "Sliding Window: maintain a window [left, right] that slides through the array. Fixed window: move both pointers together. Variable window: expand right, shrink left when condition violated. Avoids O(n²) nested loops by reusing computation.", eli5Text: "• Sliding window is like a magnifying glass moving across an array\n• Instead of checking every subarray (slow!), reuse what you already know\n• Expand right to explore, shrink left when rules break\n• Turns O(n²) into O(n) — huge speedup", concepts: ["Sliding Window", "Two Pointers", "O(n) optimization", "Variable window", "Fixed window"], flashcardsAdded: false, uploadedAt: now - day },
  ];

  return {
    level: 4, xp: 1820, streak: 12, lastActiveDate: iso(0),
    skillMastery: { "Arrays & Hashing": 0.85, "Two Pointers": 0.72, "Sliding Window": 0.58, "Binary Search": 0.35, "Stack": 0.61, "Linked List": 0.68 },
    attempts,
    reviewCards,
    knowledgeDocuments,
    totalChallengesSolved: 8,
    totalXpEarned: 1820,
    avgMasteryScore: 0.77,
    behaviorProfile: {
      avgTimeRatio: 0.85, hintDependency: 0.22, explanationVerbosity: 48, edgeCaseMisses: 1,
      commonMisconceptions: [], strongTopics: ["Arrays & Hashing", "Two Pointers"], weakTopics: ["Binary Search"],
      peakHour: 10, streakPattern: "consistent" as const,
    },
    behaviorArchetype: { fastReckless: 0.15, paralyzed: 0.10, hintDependent: 0.20, patternMemorizer: 0.55, sessionCount: 8 },
  };
}

const DEMO_DEFAULTS = buildDemoDefaults();

function computeArchetypeVector(
  prev: BehaviorArchetype,
  tel: SessionTelemetrySnapshot,
  hintsUsed: number,
  elapsedMs: number,
  expectedMs: number,
): BehaviorArchetype {
  const timeRatio = elapsedMs / Math.max(1, expectedMs);
  const fastReckless = Math.min(1, (timeRatio < 0.6 ? 0.4 : 0) + (tel.executionFrequencyCount > 5 ? 0.3 : 0) + (tel.rewriteDensityScore < 0.1 ? 0.3 : 0));
  const paralyzed = Math.min(1, (tel.paralysisWindowsCount > 2 ? 0.4 : 0) + (timeRatio > 2 ? 0.3 : 0) + (tel.timeToFirstCommitMs > 120_000 ? 0.3 : 0));
  const hintDependent = Math.min(1, (hintsUsed > 2 ? 0.4 : 0) + (tel.hintVelocityRate > 0.5 ? 0.4 : 0) + (tel.errorRepetitionFrequency > 0.5 ? 0.2 : 0));
  const patternMemorizer = Math.min(1, (timeRatio < 1 && hintsUsed === 0 ? 0.4 : 0) + (tel.errorRepetitionFrequency > 0.3 ? 0.4 : 0) + (tel.rewriteDensityScore > 0.5 ? 0.2 : 0));
  const α = 0.3;
  return {
    fastReckless:     Math.round((prev.fastReckless     * (1 - α) + fastReckless     * α) * 1000) / 1000,
    paralyzed:        Math.round((prev.paralyzed         * (1 - α) + paralyzed         * α) * 1000) / 1000,
    hintDependent:    Math.round((prev.hintDependent     * (1 - α) + hintDependent     * α) * 1000) / 1000,
    patternMemorizer: Math.round((prev.patternMemorizer  * (1 - α) + patternMemorizer  * α) * 1000) / 1000,
    sessionCount: prev.sessionCount + 1,
  };
}

/* ── Store ───────────────────────────────────────────────── */

export const useLearnerStore = create<LearnerState>()(
  persist(
    (set, get) => ({
      userId: "local-user",
      displayName: "Rohan Mulay",
      activeSession: null,
      recommendations: [],
      lastSessionTelemetry: null,
      ...DEMO_DEFAULTS,

      startSession(challengeId, challengeTitle) {
        set({
          activeSession: {
            challengeId, challengeTitle,
            startedAt: Date.now(),
            hintsUsed: 0, submissionAttempts: 0, conversationDepth: 0,
            lastCode: "", lastExplanation: "",
          },
        });
      },

      updateSession(patch) {
        const { activeSession } = get();
        if (!activeSession) return;
        set({ activeSession: { ...activeSession, ...patch } });
      },

      submitAttempt(signals, allCandidates, skillGraph) {
        const state = get();
        const result = calculateMastery(signals);
        const challengeId = state.activeSession?.challengeId ?? "";

        // Skill mastery update
        const updatedMastery = { ...state.skillMastery };
        for (const tag of signals.skillTags ?? []) {
          const prev = updatedMastery[tag] ?? 0;
          updatedMastery[tag] = Math.min(1, prev * 0.6 + result.score * 0.4);
        }

        const record: AttemptRecord = {
          challengeId,
          challengeTitle: signals.challengeTitle,
          skillTags: signals.skillTags ?? [],
          difficulty: signals.difficulty,
          masteryResult: result,
          hintsUsed: signals.hintsUsed,
          elapsedMs: signals.elapsedMs,
          expectedMs: signals.expectedMs,
          timestamp: Date.now(),
          telemetry: signals.telemetry,
        };

        // Archetype update
        const newArchetype = signals.telemetry
          ? computeArchetypeVector(state.behaviorArchetype, signals.telemetry, signals.hintsUsed, signals.elapsedMs, signals.expectedMs)
          : state.behaviorArchetype;

        const newAttempts = [...state.attempts, record];

        // Behavior profile
        const newProfile = buildBehaviorProfile(newAttempts.map(a => ({
          challengeId: a.challengeId, skillTags: a.skillTags,
          masteryScore: a.masteryResult.score, hintsUsed: a.hintsUsed,
          elapsedMs: a.elapsedMs, expectedMs: a.expectedMs, timestamp: a.timestamp,
        })));

        // XP + level + streak
        const newXp = state.xp + result.xpEarned;
        const newLevel = Math.floor(newXp / 500) + 1;
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const newStreak = state.lastActiveDate === today ? state.streak
          : state.lastActiveDate === yesterday ? state.streak + 1 : 1;

        // Stats
        const solved = newAttempts.filter(a => a.masteryResult.score > 0.3).length;
        const avgScore = newAttempts.reduce((s, a) => s + a.masteryResult.score, 0) / newAttempts.length;

        // Recommendations with enriched candidates
        const updatedSkillGraph = skillGraph.map(s => ({ ...s, mastery: updatedMastery[s.skillId] ?? s.mastery }));
        const enriched = enrichCandidates(allCandidates, newAttempts);
        const recs = recommend(enriched, updatedSkillGraph, newProfile);

        // Auto-upsert SM-2 review card (interval=1, due tomorrow)
        const existingCard = state.reviewCards.find(c => c.challengeId === challengeId);
        let newReviewCards = state.reviewCards;
        if (!existingCard && challengeId) {
          const newCard: ReviewCardState = {
            challengeId,
            challengeTitle: signals.challengeTitle,
            skillTags: signals.skillTags ?? [],
            difficulty: signals.difficulty,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReviewDate: tomorrowISO(),
            lastReviewed: null,
            lastMasteryScore: result.score,
          };
          newReviewCards = [...state.reviewCards, newCard];
        } else if (existingCard) {
          // Update mastery score on the card so intervals reflect current skill
          newReviewCards = state.reviewCards.map(c =>
            c.challengeId === challengeId ? { ...c, lastMasteryScore: result.score } : c
          );
        }

        set({
          attempts: newAttempts,
          skillMastery: updatedMastery,
          behaviorProfile: newProfile,
          recommendations: recs,
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          lastActiveDate: today,
          totalChallengesSolved: solved,
          totalXpEarned: state.totalXpEarned + result.xpEarned,
          avgMasteryScore: Math.round(avgScore * 100) / 100,
          lastSessionTelemetry: signals.telemetry ?? null,
          behaviorArchetype: newArchetype,
          reviewCards: newReviewCards,
        });

        return result;
      },

      endSession() {
        set({ activeSession: null });
      },

      refreshRecommendations(candidates, skillGraph) {
        const { behaviorProfile, skillMastery, attempts } = get();
        const updatedSkillGraph = skillGraph.map(s => ({ ...s, mastery: skillMastery[s.skillId] ?? s.mastery }));
        const enriched = enrichCandidates(candidates, attempts);
        set({ recommendations: recommend(enriched, updatedSkillGraph, behaviorProfile) });
      },

      rateReviewCard(challengeId, quality) {
        const { reviewCards } = get();
        const updated = reviewCards.map(c =>
          c.challengeId === challengeId ? sm2Update(c, quality) : c
        );
        set({ reviewCards: updated });
      },

      addKnowledgeDoc(doc) {
        const { knowledgeDocuments } = get();
        set({ knowledgeDocuments: [...knowledgeDocuments, doc].slice(-20) });
      },

      addKnowledgeCards(cards) {
        const { reviewCards } = get();
        const existingIds = new Set(reviewCards.map(c => c.challengeId));
        const newCards = cards.filter(c => !existingIds.has(c.challengeId));
        set({ reviewCards: [...reviewCards, ...newCards] });
      },
    }),
    {
      name: "learner-store-v2",
      partialize: (state) => ({
        userId: state.userId,
        displayName: state.displayName,
        level: state.level,
        xp: state.xp,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        skillMastery: state.skillMastery,
        attempts: state.attempts.slice(-100),
        behaviorProfile: state.behaviorProfile,
        behaviorArchetype: state.behaviorArchetype,
        lastSessionTelemetry: state.lastSessionTelemetry,
        totalChallengesSolved: state.totalChallengesSolved,
        totalXpEarned: state.totalXpEarned,
        avgMasteryScore: state.avgMasteryScore,
        reviewCards: state.reviewCards,
        knowledgeDocuments: state.knowledgeDocuments.slice(-20),
      }),
    }
  )
)