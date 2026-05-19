import { useLearnerStore } from "../stores/learnerStore";
import { useProductivityStore } from "../stores/productivityStore";
import type { AttemptRecord, ReviewCardState, KnowledgeDoc } from "../stores/learnerStore";

export function loadDemoData() {
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offset = 0) => new Date(now + offset * day).toISOString().slice(0, 10);

  const today = iso(0);
  const yesterday = iso(-1);
  const twoDaysAgo = iso(-2);

  const attempts: AttemptRecord[] = [
    {
      challengeId: "1", challengeTitle: "Two Sum",
      skillTags: ["Arrays & Hashing"], difficulty: "easy",
      masteryResult: {
        score: 0.88,
        breakdown: { timeScore: 0.90, hintScore: 1.00, explanationScore: 0.82, attemptScore: 1.00, codeScore: 0.75 },
        level: "mastered", xpEarned: 125,
        insights: ["Solved it quickly — strong recall.", "Clear explanation — you can articulate the algorithm."],
      },
      hintsUsed: 0, elapsedMs: 720_000, expectedMs: 900_000, timestamp: now - 7 * day,
    },
    {
      challengeId: "2", challengeTitle: "Valid Anagram",
      skillTags: ["Arrays & Hashing"], difficulty: "easy",
      masteryResult: {
        score: 0.92,
        breakdown: { timeScore: 0.85, hintScore: 1.00, explanationScore: 0.88, attemptScore: 1.00, codeScore: 0.80 },
        level: "mastered", xpEarned: 125,
        insights: ["Efficient implementation — good use of data structures."],
      },
      hintsUsed: 0, elapsedMs: 450_000, expectedMs: 600_000, timestamp: now - 6 * day,
    },
    {
      challengeId: "3", challengeTitle: "Contains Duplicate",
      skillTags: ["Arrays & Hashing"], difficulty: "easy",
      masteryResult: {
        score: 0.72,
        breakdown: { timeScore: 0.80, hintScore: 0.80, explanationScore: 0.65, attemptScore: 0.80, codeScore: 0.70 },
        level: "proficient", xpEarned: 75,
        insights: ["Relied on hints — try without them next time."],
      },
      hintsUsed: 1, elapsedMs: 550_000, expectedMs: 600_000, timestamp: now - 5 * day,
    },
    {
      challengeId: "4", challengeTitle: "Best Time to Buy and Sell Stock",
      skillTags: ["Two Pointers"], difficulty: "easy",
      masteryResult: {
        score: 0.91,
        breakdown: { timeScore: 0.88, hintScore: 1.00, explanationScore: 0.85, attemptScore: 1.00, codeScore: 0.75 },
        level: "mastered", xpEarned: 125,
        insights: ["Solved it quickly — strong recall."],
      },
      hintsUsed: 0, elapsedMs: 900_000, expectedMs: 1_200_000, timestamp: now - 4 * day,
    },
    {
      challengeId: "5", challengeTitle: "Longest Substring Without Repeating Characters",
      skillTags: ["Sliding Window"], difficulty: "medium",
      masteryResult: {
        score: 0.65,
        breakdown: { timeScore: 0.60, hintScore: 0.60, explanationScore: 0.72, attemptScore: 0.80, codeScore: 0.65 },
        level: "proficient", xpEarned: 60,
        insights: ["Multiple submissions — trace through examples before running."],
      },
      hintsUsed: 2, elapsedMs: 1_800_000, expectedMs: 1_500_000, timestamp: now - 3 * day,
    },
    {
      challengeId: "6", challengeTitle: "Valid Parentheses",
      skillTags: ["Stack"], difficulty: "easy",
      masteryResult: {
        score: 0.79,
        breakdown: { timeScore: 0.85, hintScore: 0.80, explanationScore: 0.75, attemptScore: 0.80, codeScore: 0.75 },
        level: "proficient", xpEarned: 75,
        insights: ["Good approach on the stack pattern."],
      },
      hintsUsed: 1, elapsedMs: 700_000, expectedMs: 900_000, timestamp: now - 2 * day,
    },
    {
      challengeId: "7", challengeTitle: "Binary Search",
      skillTags: ["Binary Search"], difficulty: "easy",
      masteryResult: {
        score: 0.45,
        breakdown: { timeScore: 0.50, hintScore: 0.40, explanationScore: 0.45, attemptScore: 0.60, codeScore: 0.50 },
        level: "developing", xpEarned: 30,
        insights: ["Took longer than expected — practice this pattern.", "Relied on hints — try without them next time."],
      },
      hintsUsed: 3, elapsedMs: 2_400_000, expectedMs: 900_000, timestamp: now - day,
    },
    {
      challengeId: "8", challengeTitle: "Merge Two Sorted Lists",
      skillTags: ["Linked List"], difficulty: "easy",
      masteryResult: {
        score: 0.82,
        breakdown: { timeScore: 0.78, hintScore: 1.00, explanationScore: 0.78, attemptScore: 1.00, codeScore: 0.75 },
        level: "mastered", xpEarned: 125,
        insights: ["Efficient implementation — good use of data structures."],
      },
      hintsUsed: 0, elapsedMs: 1_100_000, expectedMs: 1_200_000, timestamp: now - 3_600_000,
    },
  ];

  const reviewCards: ReviewCardState[] = [
    {
      challengeId: "1", challengeTitle: "Two Sum", skillTags: ["Arrays & Hashing"], difficulty: "easy",
      interval: 4, easeFactor: 2.6, repetitions: 2,
      nextReviewDate: today, lastReviewed: twoDaysAgo, lastMasteryScore: 0.88,
    },
    {
      challengeId: "5", challengeTitle: "Longest Substring Without Repeating Characters", skillTags: ["Sliding Window"], difficulty: "medium",
      interval: 2, easeFactor: 2.3, repetitions: 1,
      nextReviewDate: today, lastReviewed: yesterday, lastMasteryScore: 0.65,
    },
    {
      challengeId: "3", challengeTitle: "Contains Duplicate", skillTags: ["Arrays & Hashing"], difficulty: "easy",
      interval: 1, easeFactor: 2.5, repetitions: 0,
      nextReviewDate: yesterday, lastReviewed: null, lastMasteryScore: 0.72,
    },
    {
      challengeId: "4", challengeTitle: "Best Time to Buy and Sell Stock", skillTags: ["Two Pointers"], difficulty: "easy",
      interval: 6, easeFactor: 2.7, repetitions: 3,
      nextReviewDate: iso(3), lastReviewed: today, lastMasteryScore: 0.91,
    },
    {
      challengeId: "2", challengeTitle: "Valid Anagram", skillTags: ["Arrays & Hashing"], difficulty: "easy",
      interval: 12, easeFactor: 2.8, repetitions: 4,
      nextReviewDate: iso(7), lastReviewed: yesterday, lastMasteryScore: 0.95,
    },
  ];

  const knowledgeDocuments: KnowledgeDoc[] = [
    {
      id: "demo-doc-1",
      filename: "hash-maps-notes.txt",
      rawText: "Hash maps provide O(1) average time complexity for lookup, insertion, and deletion. They use a hash function to map keys to array indices. Common patterns: frequency counting, complement lookups (Two Sum), grouping by key (Group Anagrams). Space complexity is O(n).",
      eli5Text: "• A hash map is like a magic dictionary — find any word instantly\n• Give it a key, get an answer at O(1) speed\n• Used for: counting things, finding pairs, grouping similar items\n• Costs O(n) extra memory but saves huge amounts of time",
      concepts: ["Hash Maps", "O(1) lookup", "Frequency counting", "Two Sum pattern", "Group Anagrams", "Space complexity"],
      flashcardsAdded: true,
      uploadedAt: now - 3 * day,
    },
    {
      id: "demo-doc-2",
      filename: "sliding-window-cheatsheet.md",
      rawText: "Sliding Window: maintain a window [left, right] that slides through the array. Fixed window: move both pointers together. Variable window: expand right, shrink left when condition violated. Avoids O(n²) nested loops by reusing computation. Common: Longest Substring Without Repeating Characters, Maximum Sum Subarray.",
      eli5Text: "• Sliding window is like a magnifying glass moving across an array\n• Instead of checking every subarray (slow!), reuse what you already know\n• Expand right to explore, shrink left when rules break\n• Turns O(n²) into O(n) — huge speedup",
      concepts: ["Sliding Window", "Two Pointers", "O(n) optimization", "Variable window", "Fixed window"],
      flashcardsAdded: false,
      uploadedAt: now - day,
    },
  ];

  // Activity log: past 7 days of realistic usage
  const activityLog: Record<string, { challenges: number; reviews: number; pomodoros: number }> = {};
  const dailyActivity = [
    { challenges: 2, reviews: 2, pomodoros: 3 }, // 6 days ago
    { challenges: 1, reviews: 3, pomodoros: 1 }, // 5 days ago
    { challenges: 2, reviews: 4, pomodoros: 2 }, // 4 days ago
    { challenges: 0, reviews: 0, pomodoros: 0 }, // 3 days ago — missed
    { challenges: 3, reviews: 2, pomodoros: 3 }, // 2 days ago
    { challenges: 1, reviews: 5, pomodoros: 1 }, // yesterday
    { challenges: 2, reviews: 3, pomodoros: 2 }, // today
  ];
  dailyActivity.forEach((d, i) => {
    activityLog[iso(i - 6)] = d;
  });

  useLearnerStore.setState({
    level: 4,
    xp: 1820,
    streak: 12,
    lastActiveDate: today,
    skillMastery: {
      "Arrays & Hashing": 0.85,
      "Two Pointers": 0.72,
      "Sliding Window": 0.58,
      "Binary Search": 0.35,
      "Stack": 0.61,
      "Linked List": 0.68,
    },
    attempts,
    reviewCards,
    knowledgeDocuments,
    totalChallengesSolved: 8,
    totalXpEarned: 1820,
    avgMasteryScore: 0.77,
    behaviorProfile: {
      avgTimeRatio: 0.85,
      hintDependency: 0.22,
      explanationVerbosity: 48,
      edgeCaseMisses: 1,
      commonMisconceptions: [],
      strongTopics: ["Arrays & Hashing", "Two Pointers"],
      weakTopics: ["Binary Search"],
      peakHour: 10,
      streakPattern: "consistent",
    },
  });

  useProductivityStore.setState({
    activityLog,
    sessionCount: 3,
  });
}
