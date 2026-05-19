/**
 * Recommendation Agent
 *
 * Picks the next challenge using a multi-factor scoring model:
 * - Skill gap targeting (skills close to 0.5 mastery get priority)
 * - Prerequisite readiness (don't recommend if prerequisites not met)
 * - Spaced repetition signal (revisit weak topics after interval)
 * - Novelty (avoid recently seen challenges)
 * - Behavioral fit (avoid known struggle patterns until reviewed)
 */

import type { BehaviorProfile } from "./masteryAgent";

export interface SkillMastery {
  skillId: string;
  name: string;
  mastery: number;         // 0-1
  prerequisites: string[]; // skill IDs
}

export interface ChallengeCandidate {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  skillTags: string[];
  expectedMs: number;
  companies: string[];
  lastAttempted?: number;  // epoch ms, undefined = never
  lastMasteryScore?: number;
}

export interface Recommendation {
  challenge: ChallengeCandidate;
  reason: string;          // shown to user
  urgency: "spaced_rep" | "gap_fill" | "new_skill" | "stretch";
  score: number;           // internal ranking score
}

/* ── Scoring weights ─────────────────────────────────────── */

const W = {
  gapProximity:   0.35,  // mastery near 0.5 = sweet spot for learning
  prereqReady:    0.25,  // all prerequisites met = higher score
  spacedRep:      0.20,  // due for review = higher score
  novelty:        0.10,  // not seen recently = higher score
  behavioralFit:  0.10,  // not a known struggle pattern
};

/* ── Individual score components ────────────────────────── */

function gapProximityScore(skillMastery: Map<string, number>, tags: string[]): number {
  if (tags.length === 0) return 0.5;
  const scores = tags.map(tag => {
    const m = skillMastery.get(tag) ?? 0;
    // Bell curve peaking at 0.5: challenges at mastery=0.5 are highest priority
    return 1 - Math.abs(m - 0.5) * 2;
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function prereqScore(skillMastery: Map<string, number>, skills: SkillMastery[], tags: string[]): number {
  const prereqs = skills
    .filter(s => tags.includes(s.skillId))
    .flatMap(s => s.prerequisites);
  if (prereqs.length === 0) return 1;
  const ready = prereqs.filter(p => (skillMastery.get(p) ?? 0) >= 0.5).length;
  return ready / prereqs.length;
}

function spacedRepScore(challenge: ChallengeCandidate): number {
  if (!challenge.lastAttempted) return 0.6; // never attempted = moderate priority
  const daysSince = (Date.now() - challenge.lastAttempted) / 86_400_000;
  const lastScore = challenge.lastMasteryScore ?? 0.5;

  // SM-2-inspired: low mastery needs review sooner
  const idealInterval = lastScore < 0.4 ? 1 : lastScore < 0.65 ? 4 : 8;
  const overdue = daysSince / idealInterval;
  return Math.min(1, overdue * 0.5);
}

function noveltyScore(challenge: ChallengeCandidate): number {
  if (!challenge.lastAttempted) return 1;
  const daysSince = (Date.now() - challenge.lastAttempted) / 86_400_000;
  return Math.min(1, daysSince / 3); // full novelty after 3 days
}

function behavioralFitScore(challenge: ChallengeCandidate, profile: BehaviorProfile): number {
  let score = 0.8; // default neutral-positive
  // Reduce score for weak topics the user hasn't revisited
  if (profile.weakTopics.some(t => challenge.skillTags.includes(t))) {
    score -= 0.3; // don't hammer weak spots immediately — they need tutor first
  }
  if (profile.strongTopics.some(t => challenge.skillTags.includes(t))) {
    score += 0.2; // confidence builder
  }
  // Avoid hard problems if declining pattern
  if (profile.streakPattern === "declining" && challenge.difficulty === "hard") {
    score -= 0.3;
  }
  return Math.max(0, Math.min(1, score));
}

/* ── Urgency label ───────────────────────────────────────── */

function urgencyLabel(
  spacedRep: number,
  gapProximity: number,
  lastAttempted: number | undefined
): Recommendation["urgency"] {
  if (spacedRep > 0.7) return "spaced_rep";
  if (!lastAttempted)  return "new_skill";
  if (gapProximity > 0.7) return "gap_fill";
  return "stretch";
}

const URGENCY_REASONS: Record<Recommendation["urgency"], string> = {
  spaced_rep: "Due for review — reinforce before you forget",
  gap_fill:   "Targets a skill you're actively building",
  new_skill:  "Unlocks a new concept on your path",
  stretch:    "Challenge yourself — you're ready for this",
};

/* ── Main recommend function ─────────────────────────────── */

export function recommend(
  candidates: ChallengeCandidate[],
  skills: SkillMastery[],
  profile: BehaviorProfile,
  count = 3
): Recommendation[] {
  const skillMastery = new Map(skills.map(s => [s.skillId, s.mastery]));

  const scored = candidates.map(c => {
    const gap     = gapProximityScore(skillMastery, c.skillTags);
    const prereq  = prereqScore(skillMastery, skills, c.skillTags);
    const sr      = spacedRepScore(c);
    const novelty = noveltyScore(c);
    const fit     = behavioralFitScore(c, profile);

    const total = gap * W.gapProximity + prereq * W.prereqReady + sr * W.spacedRep + novelty * W.novelty + fit * W.behavioralFit;
    const urgency = urgencyLabel(sr, gap, c.lastAttempted);

    return {
      challenge: c,
      reason: URGENCY_REASONS[urgency],
      urgency,
      score: total,
    } satisfies Recommendation;
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}

/* ── Skill unlock check ──────────────────────────────────── */

export function getNewlyUnlockedSkills(
  skills: SkillMastery[],
  prevMastery: Map<string, number>
): SkillMastery[] {
  return skills.filter(s => {
    const prev = prevMastery.get(s.skillId) ?? 0;
    const allPrereqsMet = s.prerequisites.every(
      p => (skills.find(x => x.skillId === p)?.mastery ?? 0) >= 0.5
    );
    return prev < 0.5 && s.mastery >= 0.5 && allPrereqsMet;
  });
}
