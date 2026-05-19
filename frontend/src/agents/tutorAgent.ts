/**
 * Socratic Tutor Agent
 *
 * Classifies student intent and generates Socratic responses
 * that guide without giving answers. Maintains conversation context
 * to avoid repetition and escalate hints progressively.
 */

export type TutorIntent =
  | "stuck"           // no progress, confused
  | "showing_work"    // explaining their approach
  | "asking_answer"   // wants the solution directly
  | "asking_concept"  // wants to understand WHY
  | "edge_case"       // found / asking about edge case
  | "optimize"        // solution works, wants to optimize
  | "celebrate"       // got it right

export interface TutorContext {
  challengeId: string;
  challengeTitle: string;
  difficulty: string;
  elapsedMs: number;
  hintsUsed: number;
  submissionAttempts: number;
  lastUserMessage: string;
  conversationDepth: number; // number of tutor turns so far
  code: string;
}

interface TutorResponse {
  message: string;
  intent: TutorIntent;
  masterySignal?: number; // 0-1 if we can infer mastery from message
  suggestHint?: boolean;
}

/* ── Intent Classification ─────────────────────────────── */

const STUCK_SIGNALS   = ["don't know", "no idea", "confused", "stuck", "help", "what do i", "how do i", "can't figure", "not sure", "lost", "where do i start", "where to start"];
const ANSWER_SIGNALS  = ["just tell me", "give me the answer", "give me the solution", "what's the answer", "show me the code", "cheat", "spoil"];
const CONCEPT_SIGNALS = ["why does", "why is", "how does", "what is", "explain", "i don't understand why", "what's the point"];
const OPTIMIZE_SIGNALS= ["can i make", "faster", "optimize", "time complexity", "space complexity", "big o", "better solution", "more efficient"];
const EDGE_SIGNALS    = ["edge case", "empty", "null", "zero", "negative", "duplicate", "what if", "corner case"];
const WORK_SIGNALS    = ["my approach", "i think", "i plan", "my idea", "what i'm doing", "i'm using", "i was thinking", "so i", "my solution"];

function classify(msg: string, ctx: TutorContext): TutorIntent {
  const m = msg.toLowerCase();

  if (ANSWER_SIGNALS.some((s) => m.includes(s))) return "asking_answer";
  if (OPTIMIZE_SIGNALS.some((s) => m.includes(s))) return "optimize";
  if (EDGE_SIGNALS.some((s) => m.includes(s))) return "edge_case";
  if (CONCEPT_SIGNALS.some((s) => m.includes(s))) return "asking_concept";
  if (WORK_SIGNALS.some((s) => m.includes(s))) return "showing_work";
  if (STUCK_SIGNALS.some((s) => m.includes(s))) return "stuck";

  // Infer from context
  if (ctx.elapsedMs > 5 * 60_000 && ctx.submissionAttempts === 0) return "stuck";
  if (ctx.conversationDepth > 3 && ctx.submissionAttempts === 0) return "stuck";

  return "showing_work";
}

/* ── Response Bank ─────────────────────────────────────── */

const RESPONSES: Record<TutorIntent, string[][]> = {
  // [depth 0], [depth 1], [depth 2+]
  stuck: [
    [
      "Let's break it down. Before writing any code — what's the very first thing you'd do manually if someone handed you this problem on paper?",
      "Imagine you have a small example: nums = [2, 7, 11], target = 9. Walk me through, step by step, how YOU would solve it by hand.",
      "What's the brute force approach, even if it's O(n²)? Starting there is completely fine.",
    ],
    [
      "OK so you're looking for a pair that sums to target. For each number n, what value would you need to find alongside it?",
      "If you already know what complement you need — what data structure lets you check 'have I seen this before?' in O(1)?",
      "Think about it this way: as you scan through the array, what information would be useful to remember for later numbers?",
    ],
    [
      "You're closer than you think. Here's a nudge: what if you stored each number as you see it, and for every new number you check whether (target - number) was already stored?",
      "The insight is: for each element `n`, you need `target - n`. Can you check if that exists while scanning — in a single pass?",
    ],
  ],
  showing_work: [
    [
      "Good start! What's the time complexity of the approach you're describing?",
      "Interesting approach. What happens if there are duplicate numbers in the array?",
      "I like where this is going. Can you trace through nums = [3, 2, 4], target = 6 with your method?",
    ],
    [
      "You've got the right idea. Now — is there a way to do this in a single pass through the array?",
      "Your approach works. What's its space complexity? Can you do better?",
      "Walk me through the edge case: what if target itself is one of the numbers?",
    ],
    [
      "You're thinking about it correctly. Try implementing it — even pseudocode is fine. What's the first line of your function?",
    ],
  ],
  asking_answer: [
    [
      "I won't give you the answer — but I WILL give you something better: what's the brute force solution? Even O(n²) is a valid starting point.",
      "That's the one thing I can't do 😄 But I can ask: for each number n, what value would 'complete' it to reach the target?",
      "Here's the trade: I ask you one question, you answer it, and I think you'll see the answer yourself. Deal? — What's the complement of a number n if the target is t?",
    ],
    [
      "Still no 😄 But notice: you already know what number you're looking for (target - n). The question is just: how do you check if it exists *efficiently*?",
    ],
  ],
  asking_concept: [
    [
      "Great question. Why do you think this approach needs O(n) extra space? What are we trading for speed?",
      "Think about what a hash map actually does under the hood — it maps keys to values in O(1). How does that help us avoid scanning the whole array each time?",
      "The key insight is we're trading memory for time. Can you articulate what we're storing and why?",
    ],
    [
      "Exactly right. We store each number so we can answer 'have I seen this?' in constant time instead of scanning the array again.",
    ],
  ],
  edge_case: [
    [
      "Sharp eye! What does your code return for nums = [3, 3], target = 6? Trace through it.",
      "Good catch. What about an empty array? Does your function handle that gracefully?",
      "What happens if target - n equals n itself? Is that handled correctly?",
    ],
    [
      "Most solutions handle this with a simple check. What condition would you add to guard against using the same index twice?",
    ],
  ],
  optimize: [
    [
      "Your solution works — let's push it further. What's the current time complexity? Can you reduce it?",
      "You've got O(n²). The goal is O(n). What data structure gives you O(1) lookup instead of O(n) scanning?",
      "Think about it: instead of scanning the remaining array for each element, could you pre-process the data into something that makes lookup instant?",
    ],
    [
      "A hash map is what you want. As you scan, store each value. For each new value, check if (target - value) is already in the map. One pass, O(n) time.",
    ],
  ],
  celebrate: [
    [
      "That's it! You nailed the core insight. Now — can you explain WHY the hash map approach works in O(n)?",
      "Excellent work! One more challenge: what's the space complexity of your solution, and is that an acceptable trade-off?",
      "Perfect. Now try a harder variant: what if the array could have THREE numbers summing to target? How would your approach change?",
    ],
  ],
};

/* ── Challenge-specific response overlays ──────────────── */

const CHALLENGE_HINTS: Record<string, string[]> = {
  "1":  ["For 'Two Sum': as you scan, for each number n, check if (target - n) is already in your map.", "Use a dict: `prevMap[n] = index`. Before adding n, check if `target - n` is in prevMap."],
  "2":  ["For 'Valid Anagram': character frequency counting is the key. Both strings should have identical counts.", "Sort both strings and compare — or count chars in s and decrement for t."],
  "3":  ["For 'Contains Duplicate': a set tracks 'seen' values. If you see a number twice, it's in the set already."],
  "4":  ["For 'Best Time': track the minimum price seen so far. At each day, profit = price - min_so_far."],
  "5":  ["For 'Longest Substring': sliding window with a set. Shrink left when you hit a duplicate."],
  "6":  ["For 'Valid Parentheses': stack. Push open brackets, pop and match for close brackets."],
  "7":  ["For 'Binary Search': left + right pointers, mid = (left + right) // 2. No division loops."],
  "11": ["For '3Sum': sort first. Fix i, then use two pointers (l=i+1, r=end) to find the pair."],
};

/* ── Proactive messages (triggered by time/state) ────── */

export function getProactiveMessage(ctx: TutorContext): string | null {
  const mins = ctx.elapsedMs / 60_000;

  if (mins > 3 && ctx.submissionAttempts === 0 && ctx.conversationDepth === 0) {
    return `You've been at this for ${Math.round(mins)} minutes — which is totally normal for this problem. Want to talk through your approach? Sometimes just explaining it out loud unblocks things.`;
  }
  if (mins > 8 && ctx.submissionAttempts === 0) {
    return `Still working through it? Let's try this: forget the code for a second. In plain English, how would YOU solve this problem if I gave you the array on paper?`;
  }
  if (ctx.submissionAttempts >= 2 && ctx.hintsUsed === 0) {
    return `You've submitted ${ctx.submissionAttempts} times — something's off but you haven't asked for hints yet. What's the error you're seeing?`;
  }
  return null;
}

/* ── Main generate function ─────────────────────────────── */

export function generateTutorResponse(
  userMessage: string,
  ctx: TutorContext
): TutorResponse {
  const intent = classify(userMessage, ctx);
  const pool = RESPONSES[intent];
  const depth = Math.min(ctx.conversationDepth, pool.length - 1);
  const options = pool[depth];
  let message = options[Math.floor(Math.random() * options.length)];

  // Inject challenge-specific hint at deeper levels
  const specific = CHALLENGE_HINTS[ctx.challengeId];
  if (specific && ctx.conversationDepth >= 2 && intent === "stuck") {
    const idx = Math.min(ctx.hintsUsed, specific.length - 1);
    message = specific[idx];
  }

  // Infer mastery signal from high-quality showing_work messages
  let masterySignal: number | undefined;
  if (intent === "showing_work" && userMessage.length > 80) {
    const keywords = ["hash map", "hashmap", "dictionary", "complement", "target - ", "O(n)", "single pass", "two pointer", "sliding window", "sort"];
    const hits = keywords.filter((k) => userMessage.toLowerCase().includes(k)).length;
    masterySignal = Math.min(0.9, 0.3 + hits * 0.15);
  }

  return { message, intent, masterySignal, suggestHint: intent === "stuck" && ctx.conversationDepth >= 2 };
}
