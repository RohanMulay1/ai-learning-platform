/**
 * Mastery Detection Agent
 *
 * Multi-signal mastery calculation. Combines time efficiency, hint usage,
 * explanation quality, attempt count, and code quality into a 0-1 score.
 * Also detects behavioral patterns over multiple sessions.
 */

export interface AttemptSignals {
  elapsedMs: number;
  expectedMs: number;        // difficulty-based expected time
  hintsUsed: number;
  submissionAttempts: number;
  passed: boolean;
  explanation: string;       // student's written explanation
  code: string;
  conversationDepth: number; // tutor turns used
}

export interface MasteryResult {
  score: number;             // 0-1
  breakdown: {
    timeScore: number;
    hintScore: number;
    explanationScore: number;
    attemptScore: number;
    codeScore: number;
  };
  level: "novice" | "developing" | "proficient" | "mastered";
  xpEarned: number;
  insights: string[];        // human-readable signals
}

export interface BehaviorProfile {
  avgTimeRatio: number;          // actual/expected time — <1 = fast, >2 = struggling
  hintDependency: number;        // 0-1 (higher = relies on hints more)
  explanationVerbosity: number;  // avg explanation length
  edgeCaseMisses: number;        // times edge cases caught late
  commonMisconceptions: string[];
  strongTopics: string[];
  weakTopics: string[];
  peakHour: number | null;       // hour 0-23 when performance is best
  streakPattern: "consistent" | "bursty" | "declining";
}

/* ── Explanation quality ─────────────────────────────────── */

const QUALITY_KEYWORDS = {
  excellent: ["time complexity", "space complexity", "O(n)", "O(1)", "hash map", "complement", "single pass", "two pointer", "sliding window", "invariant", "edge case"],
  good:      ["because", "therefore", "first I", "then I", "iterate", "store", "check", "return", "index"],
  weak:      [],
};

function scoreExplanation(text: string): number {
  if (!text || text.trim().length < 20) return 0.1;
  const lower = text.toLowerCase();
  const excellent = QUALITY_KEYWORDS.excellent.filter(k => lower.includes(k)).length;
  const good      = QUALITY_KEYWORDS.good.filter(k => lower.includes(k)).length;
  const len       = text.trim().split(/\s+/).length;

  let score = 0.2; // base
  score += Math.min(0.4, excellent * 0.12); // up to 0.4 for technical terms
  score += Math.min(0.2, good * 0.05);      // up to 0.2 for logical connectors
  score += Math.min(0.2, len / 100 * 0.2);  // up to 0.2 for length (100 word max)
  return Math.min(1, score);
}

/* ── Code quality ────────────────────────────────────────── */

function scoreCode(code: string): number {
  if (!code || code.trim().length < 10) return 0;
  const lines = code.trim().split("\n").filter(l => l.trim());
  let score = 0.4; // base for having any code

  // Penalize excessive length (naive brute force is usually long)
  if (lines.length < 20) score += 0.2;
  if (lines.length < 10) score += 0.1;

  // Reward efficient data structures
  if (/dict|{}|Map\(|set\(\)|Set\(|HashMap/i.test(code)) score += 0.2;
  // Reward early returns / guards
  if (/return\s+(None|-1|\[\]|null|false)/i.test(code)) score += 0.05;
  // Penalize nested loops (O(n^2) smell)
  const nestedLoops = (code.match(/for .+:\s*\n.*for /gs) || []).length;
  score -= nestedLoops * 0.15;

  return Math.max(0, Math.min(1, score));
}

/* ── Main mastery calculation ────────────────────────────── */

export function calculateMastery(signals: AttemptSignals): MasteryResult {
  // Time score: full marks at ≤1× expected, 0 at 4× expected
  const timeRatio = signals.elapsedMs / Math.max(1, signals.expectedMs);
  const timeScore = Math.max(0, 1 - (timeRatio - 1) / 3);

  // Hint score: each hint costs ~0.2 mastery
  const hintScore = Math.max(0, 1 - signals.hintsUsed * 0.2);

  // Explanation score
  const explanationScore = scoreExplanation(signals.explanation);

  // Attempt score: first try = 1.0, each extra attempt costs 0.2
  const attemptScore = Math.max(0.1, 1 - (signals.submissionAttempts - 1) * 0.2);

  // Code score
  const codeScore = scoreCode(signals.code);

  // Weighted fusion
  const score = signals.passed
    ? (timeScore * 0.20 + hintScore * 0.15 + explanationScore * 0.35 + attemptScore * 0.20 + codeScore * 0.10)
    : 0.1; // failed submission = near-zero mastery regardless

  const rounded = Math.round(score * 100) / 100;

  const level: MasteryResult["level"] =
    rounded >= 0.85 ? "mastered"
    : rounded >= 0.65 ? "proficient"
    : rounded >= 0.40 ? "developing"
    : "novice";

  const xpBase = { mastered: 100, proficient: 60, developing: 30, novice: 10 }[level];
  const xpEarned = Math.round(xpBase * (signals.submissionAttempts === 1 ? 1.25 : 1)); // first-try bonus

  const insights = buildInsights(signals, { timeScore, hintScore, explanationScore, attemptScore, codeScore });

  return { score: rounded, breakdown: { timeScore, hintScore, explanationScore, attemptScore, codeScore }, level, xpEarned, insights };
}

function buildInsights(signals: AttemptSignals, breakdown: MasteryResult["breakdown"]): string[] {
  const out: string[] = [];
  if (breakdown.timeScore > 0.8)         out.push("Solved it quickly — strong recall.");
  if (breakdown.timeScore < 0.3)         out.push("Took longer than expected — practice this pattern.");
  if (breakdown.hintScore < 0.6)         out.push("Relied on hints — try without them next time.");
  if (breakdown.explanationScore > 0.7)  out.push("Clear explanation — you can articulate the algorithm.");
  if (breakdown.explanationScore < 0.3)  out.push("Explanation was thin — practice talking through solutions.");
  if (breakdown.attemptScore < 0.6)      out.push("Multiple submissions — trace through examples before running.");
  if (breakdown.codeScore > 0.7)         out.push("Efficient implementation — good use of data structures.");
  if (signals.conversationDepth > 4)     out.push("Needed several tutor nudges — revisit the core concept.");
  return out;
}

/* ── Behavioral pattern detection ───────────────────────── */

interface SessionRecord {
  challengeId: string;
  skillTags: string[];
  masteryScore: number;
  hintsUsed: number;
  elapsedMs: number;
  expectedMs: number;
  timestamp: number; // epoch ms
}

export function buildBehaviorProfile(history: SessionRecord[]): BehaviorProfile {
  if (history.length === 0) {
    return {
      avgTimeRatio: 1, hintDependency: 0, explanationVerbosity: 0,
      edgeCaseMisses: 0, commonMisconceptions: [], strongTopics: [], weakTopics: [],
      peakHour: null, streakPattern: "consistent",
    };
  }

  const avgTimeRatio = history.reduce((s, r) => s + r.elapsedMs / Math.max(1, r.expectedMs), 0) / history.length;
  const hintDependency = history.reduce((s, r) => s + r.hintsUsed, 0) / history.length / 3; // normalise to 0-1

  // Topic mastery aggregation
  const topicScores: Record<string, number[]> = {};
  for (const r of history) {
    for (const tag of r.skillTags) {
      topicScores[tag] = topicScores[tag] || [];
      topicScores[tag].push(r.masteryScore);
    }
  }
  const topicAvg = Object.entries(topicScores).map(([tag, scores]) => ({
    tag, avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  const strongTopics = topicAvg.filter(t => t.avg >= 0.7).map(t => t.tag);
  const weakTopics   = topicAvg.filter(t => t.avg < 0.4).map(t => t.tag);

  // Peak performance hour
  const hourBuckets: Record<number, number[]> = {};
  for (const r of history) {
    const h = new Date(r.timestamp).getHours();
    hourBuckets[h] = hourBuckets[h] || [];
    hourBuckets[h].push(r.masteryScore);
  }
  let peakHour: number | null = null;
  let peakScore = 0;
  for (const [h, scores] of Object.entries(hourBuckets)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > peakScore) { peakScore = avg; peakHour = Number(h); }
  }

  // Streak pattern
  const recent = history.slice(-7).map(r => r.masteryScore);
  let streakPattern: BehaviorProfile["streakPattern"] = "consistent";
  if (recent.length >= 3) {
    const trend = recent[recent.length - 1] - recent[0];
    const variance = recent.reduce((v, s) => v + Math.abs(s - 0.6), 0) / recent.length;
    if (trend < -0.2)   streakPattern = "declining";
    else if (variance > 0.25) streakPattern = "bursty";
  }

  return {
    avgTimeRatio,
    hintDependency: Math.min(1, hintDependency),
    explanationVerbosity: 0, // populated externally from explanation lengths
    edgeCaseMisses: 0,       // populated externally
    commonMisconceptions: [],
    strongTopics,
    weakTopics,
    peakHour,
    streakPattern,
  };
}
