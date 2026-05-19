export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  current_level: number;
  current_xp: number;
  current_streak: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  examples: Example[] | null;
  constraints: string | null;
  difficulty: "easy" | "medium" | "hard";
  estimated_time_minutes: number;
  companies: string[] | null;
  skill_tags: string[] | null;
  hints: Hint[] | null;
  is_generated: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Hint {
  level: number;
  content: string;
}

export interface Attempt {
  attempt_id: string;
  status: "success" | "error" | "timeout" | "pending";
  output: string;
  runtime_ms: number | null;
  test_cases_passed: number;
  test_cases_total: number;
  feedback: string;
  mastery_score: number;
  xp_earned: number;
}

export interface ReviewCard {
  challenge_id: string;
  challenge_title: string;
  challenge_difficulty: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  last_reviewed: string | null;
}

export interface SkillMastery {
  skill_id: string;
  skill_name: string;
  mastery_level: number;
  is_unlocked: boolean;
  problems_solved: number;
}

export interface ProgressSnapshot {
  skill_mastery: SkillMastery[];
  weak_areas: SkillMastery[];
  strengths: SkillMastery[];
  overall_mastery: number;
  total_challenges_solved: number;
  current_streak: number;
  total_xp: number;
  current_level: number;
}

export interface TutorMessage {
  id: string;
  role: "student" | "tutor";
  type: string;
  content: string;
  intent?: string;
  follow_up?: string;
  mastery_signal?: number;
  audio_url?: string;
  timestamp: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  status: "locked" | "in_progress" | "earned" | "masterpiece";
  completion_percentage: number;
  earned_at: string | null;
  is_masterpiece: boolean;
}

export interface HeatmapDay {
  date: string;
  activity_count: number;
  xp_earned: number;
}

export interface AssessmentQuestion {
  session_id: string;
  question_id: string;
  question: string;
  options: string[] | null;
  question_type: string;
  skill_being_assessed: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
