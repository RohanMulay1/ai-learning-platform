import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useInternshipStore, type DayResult, type AgentReactionRecord, type FollowUpRecord } from "../stores/internshipStore";
import { useProgressStore } from "../stores/store";
import { fireConfetti, showXPToast } from "../lib/confetti";

/* ── Groq helpers ──────────────────────────────────────────────── */

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";

const STYLE_GUIDES: Record<string, string> = {
  demanding:        "terse and critical — always finds something to push harder on. Never fully satisfied but not cruel. References specific code.",
  helpful:          "supportive and constructive — praises one concrete thing first, then suggests one targeted improvement.",
  confused:         "non-technical — asks about business impact, customer effects, or sprint timelines instead of code details.",
  rigorous:         "precise and exacting — cites benchmarks, asks 'what is the theoretical bound?' and 'what is your proof of correctness?'",
  pragmatic:        "pragmatic and direct — cares about what ships, asks 'does this actually run?' and 'what are the failure modes in prod?'",
  curious:          "intellectually curious — explores edge cases, says 'interesting, but have you considered...' and asks follow-up questions.",
  "systems-thinker":"big-picture focused — ties everything back to system topology, data flow, and failure domains.",
  intense:          "high-stakes SRE mindset — speaks in uptime, SLAs, and blast radius. Gets tense when reliability is at risk.",
  collaborative:    "peer-like and encouraging — shares own uncertainty, thinks out loud, says 'I was also confused about this at first.'",
};

async function groqChat(system: string, user: string, maxTokens: number, temperature: number): Promise<string> {
  if (!GROQ_KEY) return "(API key not configured)";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: maxTokens,
        temperature,
      }),
    });
    if (!res.ok) return "(Connection error)";
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "(No response)";
  } catch { return "(Connection error)"; }
}

async function getAgentReaction(agent: Agent, submission: string, taskDesc: string, isCode: boolean): Promise<string> {
  const style = STYLE_GUIDES[agent.style] ?? agent.style;
  return groqChat(
    `You are ${agent.name}, ${agent.role}. Communication style: ${style}`,
    `An engineering intern submitted ${isCode ? "code" : "a written analysis"} for: "${taskDesc}"\n\nSubmission:\n\`\`\`\n${submission.slice(0, 1200)}\n\`\`\`\n\nRespond in 2-3 sentences as ${agent.name}. Stay in character. Reference something specific.`,
    140, 0.85
  );
}

async function getFollowUpReply(agent: Agent, originalSubmission: string, taskDesc: string, userMessage: string): Promise<string> {
  const style = STYLE_GUIDES[agent.style] ?? agent.style;
  return groqChat(
    `You are ${agent.name}, ${agent.role}. Communication style: ${style}`,
    `Context: Intern submitted work for "${taskDesc}". Submission excerpt: "${originalSubmission.slice(0, 400)}". The intern now replies: "${userMessage}". Respond in 2-3 sentences, in character.`,
    130, 0.8
  );
}

async function scoreSubmission(submission: string, taskDesc: string, isCode: boolean): Promise<{ score: number; strengths: string[]; gaps: string[] }> {
  if (!submission.trim() || submission.length < 50) return { score: 15, strengths: [], gaps: ["Submission too short"] };
  const rubric = isCode
    ? "Correctness (40): addresses the stated problem. Specificity (30): references actual task details. Complexity awareness (30): mentions time/space tradeoffs."
    : "Coverage (40): answers all stated questions. Depth (35): beyond surface-level. Communication (25): clear and structured.";
  const raw = await groqChat(
    "You are a technical evaluator. Respond ONLY with valid JSON, no markdown.",
    `Task: "${taskDesc}"\nSubmission: "${submission.slice(0, 1500)}"\nRubric: ${rubric}\nJSON format: {"score":<1-100>,"strengths":["str1","str2"],"gaps":["gap1"]}. 2-3 strengths, 1-2 gaps. Be specific.`,
    200, 0.1
  );
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return { score: 70, strengths: ["Submission received"], gaps: [] }; }
}

async function generateLetter(track: TrackMeta, completedDays: Record<number, DayResult>): Promise<string> {
  const techLead = track.agents[0];
  const summaries = Object.entries(completedDays)
    .map(([idx, r]) => {
      const d = track.days[parseInt(idx)];
      return `Day ${parseInt(idx) + 1} "${d.title}": score ${r.score}/100. Work: "${r.submission.slice(0, 150)}"`;
    })
    .join(" | ");
  return groqChat(
    `You are ${techLead.name}, ${techLead.role} at ${track.company}. Write a 3-4 sentence professional letter of recommendation. Be specific and honest.`,
    `Intern completed a 3-day sprint. Performance: ${summaries}. Write as ${techLead.name} in first person. Reference specific work. Professional closing.`,
    280, 0.7
  );
}

/* ── Types ─────────────────────────────────────────────────────── */

interface Agent {
  name: string;
  role: string;
  style: string;
  icon: string;
  color: string;
}

interface Opener {
  agentName: string;
  message: string;
}

interface DayData {
  day: number;
  title: string;
  icon: string;
  type: "chaos" | "build" | "review";
  color: string;
  scenario: string;
  taskLabel: string;
  taskDesc: string;
  isCode: boolean;
  starterCode: string;
  hints: [string, string];
  openers: Opener[];
}

interface TrackMeta {
  id: string;
  title: string;
  company: string;
  companyStage: string;
  color: string;
  agents: Agent[];
  days: DayData[];
}

/* ── Backend track ─────────────────────────────────────────────── */

const BACKEND_AGENTS: Agent[] = [
  { name: "Sarah K.", role: "Tech Lead",  style: "demanding", icon: "engineering",     color: "#EF4444" },
  { name: "David L.", role: "PM",         style: "confused",  icon: "manage_accounts", color: "#F59E0B" },
  { name: "Priya M.", role: "Senior SWE", style: "helpful",   icon: "code",            color: "#2EC866" },
];

const BACKEND_DAYS: DayData[] = [
  {
    day: 1, title: "Production Outage", icon: "warning", type: "chaos", color: "#EF4444",
    scenario: `🚨 INCIDENT ALERT — P0 | Payment Service | Started 08:14 UTC\n\nTransaction throughput dropped 94%. Latency for /api/payments spiked from 45ms → 8.7 seconds. SLA breach imminent — $140k/minute exposure.\n\nThe on-call SRE traced it to the transaction deduplication service. Someone merged a "quick fix" last night that changed the dedup lookup from a hash set to a nested loop. It worked fine in staging with 50 records. Prod has 80,000.\n\nSarah just pinged the team channel: "Who shipped this? Fix it. Now. We have 8 minutes."`,
    taskLabel: "Fix the Transaction Deduplicator",
    taskDesc: "The dedup service loops through all existing transactions for each new one — O(n²). Rewrite it to use a hash map for O(n) lookups. Show your solution with before/after complexity analysis.",
    isCode: true,
    hints: [
      "Think about what data structure gives you O(1) average-case lookup. You want to check 'have I seen this transaction ID before?' in constant time.",
      "A Python set or dict gives O(1) lookup. Build the lookup table in one pass, then check each new transaction in a second pass.",
    ],
    starterCode: `# BEFORE (broken — O(n²)):
def dedup_transactions(existing: list, incoming: list) -> list:
    unique = []
    for tx in incoming:
        if tx['id'] not in [e['id'] for e in existing]:  # O(n) per check!
            unique.append(tx)
    return unique

# TODO: Rewrite as O(n) using a hash set.
# Add a comment explaining the time/space complexity tradeoff.

def dedup_transactions_fast(existing: list, incoming: list) -> list:
    seen = {e['id'] for e in existing}   # O(n) time, O(n) space
    unique = []
    for tx in incoming:
        if tx['id'] not in seen:
            unique.append(tx)
            seen.add(tx['id'])
    return unique

# Time: O(n + m) where n=existing, m=incoming
# Space: O(n) for the hash set
# Tradeoff: O(n) space eliminates the O(n²) nested scan`,
    openers: [
      { agentName: "Sarah K.", message: "You're the intern on-call. Drop everything. The dedup service is causing the outage — get in there and fix it. The nested loop has to go. You have 8 minutes." },
      { agentName: "David L.", message: "Hey so I know there's a fire right now but does this affect the Q3 retention numbers? Can we still hit our daily active user targets? Let me know when we're back up." },
      { agentName: "Priya M.", message: "Don't panic. Check the transaction dedup function — it's an O(n²) lookup. Switch to a hash set and it'll be O(n). I'll review your PR the second you open it." },
    ],
  },
  {
    day: 2, title: "Legacy Refactor Sprint", icon: "construction", type: "build", color: "#6366F1",
    scenario: `Day 2 — Build Sprint\n\nThe payment outage is resolved. Now the real work begins.\n\nThe Redis queue consumer is a mess — it was written 3 years ago by someone who left, has no backpressure handling, and hammers the DB on spike traffic. Every 2x load increase causes a queue backup that takes 45 minutes to drain.\n\nSarah's requirements: implement a sliding window rate limiter. Per-user, 1000 req/min limit. Enterprise tier gets 5x the limit. David keeps changing the requirements mid-sprint. Sarah says to ignore him and ship the spec.`,
    taskLabel: "Build a Sliding Window Rate Limiter",
    taskDesc: "Implement a per-user rate limiter using the sliding window algorithm. Support configurable limits (standard: 1000/min, enterprise: 5000/min). Include the window management logic and explain your data structure choices.",
    isCode: true,
    hints: [
      "A sliding window rate limiter keeps a timestamp log of recent requests. For each request, remove timestamps older than the window, then check if count is within the limit.",
      "Use a deque per user. Add new timestamps to the right, remove expired timestamps from the left (they're always oldest first).",
    ],
    starterCode: `from collections import deque
import time

class RateLimiter:
    def __init__(self, window_size: int = 60):
        self.window_size = window_size
        self.user_windows: dict[str, deque] = {}

    def is_allowed(self, user_id: str, limit: int) -> bool:
        now = time.time()
        if user_id not in self.user_windows:
            self.user_windows[user_id] = deque()
        window = self.user_windows[user_id]

        # Evict expired timestamps
        while window and window[0] < now - self.window_size:
            window.popleft()

        if len(window) >= limit:
            return False

        window.append(now)
        return True

LIMITS = {"standard": 1000, "enterprise": 5000}
limiter = RateLimiter(window_size=60)

# Time: O(requests_in_window) per call
# Space: O(limit) per active user
# Tradeoff: accurate sliding window vs O(1) token bucket that allows short bursts`,
    openers: [
      { agentName: "Sarah K.", message: "Good work yesterday. Today: sliding window rate limiter. Per-user, 1000/min standard. Don't over-engineer it — clean code that ships beats clever code that doesn't." },
      { agentName: "David L.", message: "Hey quick update — enterprise customers actually want 10x not 5x. Also can we make the limit configurable from the dashboard? And maybe add geographic rate limiting too? Thanks!" },
      { agentName: "Priya M.", message: "The deque-based sliding window is the classic approach here. Just watch out for memory leaks — evict user entries if they've been inactive longer than the window. Happy to rubber duck your design." },
    ],
  },
  {
    day: 3, title: "Scale Review", icon: "speed", type: "review", color: "#2EC866",
    scenario: `Day 3 — Architecture Review\n\nYour rate limiter just hit 100,000 TPS in load testing. The team is impressed. Now comes the hard part.\n\nSarah scheduled a 30-minute architecture review. She's going to probe every decision you made across the sprint: the dedup hash map, the sliding window deque, the per-user memory footprint at scale.\n\nPriya told you to prepare written answers before the meeting — Sarah respects engineers who think before they speak. This is your chance to show you understand not just what you built, but why.`,
    taskLabel: "Architecture Review Write-Up",
    taskDesc: "Answer Sarah's 4 review questions. Be specific, cite your Day 1 and Day 2 implementations, and show understanding of tradeoffs.\n\n1. Space complexity of your rate limiter at 1M active users?\n2. Why sliding window over fixed window or token bucket?\n3. What breaks first if traffic spikes 10x?\n4. If you had 2 more days, what would you change?",
    isCode: false,
    hints: [
      "For space complexity, think: each user has a deque of up to `limit` timestamps. At 1M users × 1000 entries × 8 bytes = ?",
      "Fixed windows have boundary attacks (2x limit across a window edge). Sliding windows avoid this but cost more memory. Token buckets are memory-efficient but don't smooth traffic as precisely.",
    ],
    starterCode: `Architecture Review — Backend Systems Engineering Sprint

1. Space Complexity at 1M Active Users
The sliding window deque stores up to limit timestamps per active user.
Standard limit (1000/min): 1M users × 1000 entries × 8 bytes ≈ 8 GB worst case.
In practice, most users won't hit the limit. LRU eviction for inactive users (no requests in >window_size) reduces this to ~1-2 GB typical.

2. Why Sliding Window Over Fixed Window or Token Bucket
Fixed window: vulnerable to boundary attacks — a user can send 2x the limit by splitting across a window edge (999 req at :59, 999 at :00). Rejected for correctness.
Token bucket: O(1) memory (just tokens + last_refill timestamp) but allows short bursts above rate that can stress downstream.
Sliding window: eliminates boundary exploitation at the cost of O(limit) space per user. Chosen for accuracy over token bucket's memory efficiency.

3. What Breaks First at 10x Traffic
Redis saturates before the application layer. Each is_allowed() needs 2 Redis ops (ZADD + ZRANGEBYSCORE). At 100k TPS × 10 = 1M TPS → 2M Redis ops/sec, exceeding single-node capacity (~200-500k ops/sec).
Fix: Lua script to atomically combine both ops (50% round-trip reduction), or shard by user_id hash across a Redis cluster.

4. What I'd Change With 2 More Days
- Lua script atomicity to prevent race conditions between check + append
- User_id-based sharding for Redis cluster distribution
- Prometheus metrics: p95/p99 latency per tier, rejection rate
- Configurable window_size per endpoint (auth needs tighter limits than data endpoints)`,
    openers: [
      { agentName: "Sarah K.", message: "Today is your review. I'll be asking about every decision you made this week. Write your answers before the meeting — engineers who prepare written analysis earn more trust than engineers who wing it." },
      { agentName: "David L.", message: "Quick question — can you put together a one-pager for the board about how this affects customer satisfaction? Also does this help with GDPR compliance? Just 2 things." },
      { agentName: "Priya M.", message: "You crushed the last 2 days. For the review: be specific about tradeoffs. Don't just say 'O(n) is better than O(n²)' — explain why it matters at the scale we operate at. You've got this." },
    ],
  },
];

/* ── ML track ──────────────────────────────────────────────────── */

const ML_AGENTS: Agent[] = [
  { name: "Chen W.", role: "ML Lead",    style: "rigorous",  icon: "psychology", color: "#6366F1" },
  { name: "Alex R.", role: "Data Eng",   style: "pragmatic", icon: "storage",    color: "#2EC866" },
  { name: "Mia F.",  role: "Researcher", style: "curious",   icon: "science",    color: "#38bdf8" },
];

const ML_DAYS: DayData[] = [
  {
    day: 1, title: "Broken Data Pipeline", icon: "warning", type: "chaos", color: "#EF4444",
    scenario: `🚨 PIPELINE ALERT — Feature Store | Model: RecSys-v3 | P99 latency: 4200ms (normal: 180ms)\n\nThe recommendation model is serving stale feature vectors. Users are getting recommendations from 6 hours ago. Click-through rate dropped 31%.\n\nAlex traced it to the feature aggregation job: instead of a sliding window over the last 60 minutes of events, someone replaced it with a full table scan. Works fine on the 10k-event dev dataset. Production has 12M events per hour.\n\nChen in Slack: "We're burning GPU budget serving bad features. Find the bottleneck. Show your work."`,
    taskLabel: "Fix the Feature Aggregation Pipeline",
    taskDesc: "The aggregation job does a full scan when it should use a sliding window. Rewrite it to compute rolling 60-minute feature stats in O(n log n) instead of O(n²). Show before/after complexity analysis.",
    isCode: true,
    hints: [
      "A sliding window over time-sorted events maintains a running aggregate without re-scanning all events. Use two pointers: one to evict events older than 60min, one advancing forward.",
      "Sort events by timestamp first. Then maintain a deque — add new events to the right, remove expired from the left. Track running sum/count as you go.",
    ],
    starterCode: `# BROKEN — Full scan O(n²):
def compute_rolling_features_broken(events: list[dict], window_min=60):
    features = []
    for i, event in enumerate(events):
        window_start = event['ts'] - window_min * 60
        window_events = [e for e in events if window_start <= e['ts'] <= event['ts']]  # O(n) per event!
        features.append({
            'user_id': event['user_id'],
            'ts': event['ts'],
            'click_rate': sum(1 for e in window_events if e['action'] == 'click') / len(window_events)
        })
    return features

# FIXED — Sliding window O(n log n):
from collections import deque

def compute_rolling_features(events: list[dict], window_min=60):
    events = sorted(events, key=lambda e: e['ts'])   # O(n log n)
    window = deque()
    click_count = 0
    features = []

    for event in events:
        window_start = event['ts'] - window_min * 60
        while window and window[0]['ts'] < window_start:
            expired = window.popleft()
            if expired['action'] == 'click':
                click_count -= 1
        window.append(event)
        if event['action'] == 'click':
            click_count += 1
        features.append({
            'user_id': event['user_id'],
            'ts': event['ts'],
            'click_rate': click_count / len(window) if window else 0.0
        })
    return features

# Time: O(n log n) sort + O(n) window = O(n log n) total
# Space: O(w) where w = max events in any 60-min window`,
    openers: [
      { agentName: "Chen W.", message: "P99 is 23x baseline. Brute-force aggregation on 12M events/hour is unacceptable. I need a sliding window solution with proof of correctness and complexity analysis. Not a patch — a proper fix." },
      { agentName: "Alex R.", message: "I spotted the bug — a list comprehension that scans everything. The data is already sorted by timestamp so you don't even need to re-sort. The deque approach should get this under 200ms P99." },
      { agentName: "Mia F.", message: "This is actually a fascinating failure mode — the dev dataset was too small to expose quadratic behavior. Have you checked whether the user embedding aggregation has the same pattern? It might be systemic." },
    ],
  },
  {
    day: 2, title: "Similarity Search Sprint", icon: "construction", type: "build", color: "#6366F1",
    scenario: `Day 2 — Build Sprint\n\nPipeline is fixed. Now Chen wants to speed up the nearest-neighbor search.\n\nThe recommendation engine scans all 50M user embeddings per query — O(n). At 500 QPS that's 25 billion distance computations per second. CPU is maxed.\n\nThe approach: since embeddings are sorted by a primary clustering key, we can use two-pointer pruning to reduce the candidate set by 90% before running cosine similarity. Approximate-NN at 10% of the cost.\n\nMia is excited about the theoretical implications. Alex just wants it to ship before Tuesday's deploy window.`,
    taskLabel: "Implement Approximate Nearest Neighbor Search",
    taskDesc: "Implement a two-pointer pruning function that, given a query embedding and a sorted list of embeddings, returns top-K candidates within a primary-dimension threshold — pruning 90%+ of the search space before full similarity. Include complexity analysis.",
    isCode: true,
    hints: [
      "Binary search to find the region where embeddings are 'close' in the primary dimension. Then expand left/right pointers until the primary distance exceeds your threshold.",
      "This gives you a candidate window instead of all 50M vectors. Only run cosine similarity on the window. Trade: approximate results, massive speedup.",
    ],
    starterCode: `import bisect, math, random

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x*y for x,y in zip(a,b))
    norm_a = math.sqrt(sum(x**2 for x in a))
    norm_b = math.sqrt(sum(x**2 for x in b))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

def approx_nearest_neighbors(
    query: list[float],
    embeddings: list[list[float]],   # sorted by embeddings[i][0]
    k: int = 10,
    primary_threshold: float = 0.3,
) -> list[tuple[int, float]]:
    """
    Two-pointer pruning for approximate k-NN on sorted embeddings.
    Complexity: O(log n + w·d) where w=window size, d=embedding dim
    vs O(n·d) brute force.
    """
    primary_vals = [e[0] for e in embeddings]
    query_primary = query[0]
    mid = bisect.bisect_left(primary_vals, query_primary)

    left, right = mid - 1, mid
    candidates = []

    while left >= 0 or right < len(embeddings):
        left_dist  = abs(embeddings[left][0]  - query_primary) if left  >= 0                  else float('inf')
        right_dist = abs(embeddings[right][0] - query_primary) if right < len(embeddings) else float('inf')

        if left_dist > primary_threshold and right_dist > primary_threshold:
            break

        if left_dist <= right_dist and left >= 0:
            candidates.append(left); left -= 1
        elif right < len(embeddings):
            candidates.append(right); right += 1

    results = [(idx, cosine_similarity(query, embeddings[idx])) for idx in candidates]
    results.sort(key=lambda x: -x[1])
    return results[:k]

# Typical window: ~50k candidates vs 50M brute force = 1000x speedup
# Empirical recall@10 ~94% at threshold=0.3`,
    openers: [
      { agentName: "Chen W.", message: "50M users × 500 QPS = 25 billion distance computations per second. We're leveraging sorted embeddings — two-pointer pruning should reduce the candidate set to under 100k. I want the complexity proof, not just the code." },
      { agentName: "Alex R.", message: "Fair warning: embeddings sorted by primary cluster dimension, but secondary dimensions are noisy. This is approximate NN not exact — Chen's fine with that since we do re-ranking downstream anyway. Don't make the threshold too aggressive." },
      { agentName: "Mia F.", message: "This is essentially a simplified version of HNSW's entry point search! I'm curious: does your primary-dimension threshold have a provable recall bound? What's your intuition about the tradeoff between threshold tightness and recall@K?" },
    ],
  },
  {
    day: 3, title: "Model Review & Defense", icon: "speed", type: "review", color: "#2EC866",
    scenario: `Day 3 — Technical Review\n\nChen scheduled a model card review. In ML teams, a model card documents what you built, the tradeoffs, the failure modes, and the limitations.\n\nThis is your chance to show you understand not just the engineering but the ML systems thinking behind the decisions.\n\nAlex wants to know if approximate NN introduces systematic bias. Mia wants to understand the theoretical recall bounds. Chen wants to know what you'd build with more time.\n\nBe honest about limitations — engineers who acknowledge failure modes earn more trust than those who oversell.`,
    taskLabel: "Write a Model Card",
    taskDesc: "Write a technical model card for the feature pipeline + ANN system you built. Cover:\n1. System description and motivation\n2. Performance characteristics (complexity, latency)\n3. Known limitations and failure modes\n4. Potential bias from approximate NN pruning\n5. What you'd improve with more time",
    isCode: false,
    hints: [
      "For bias: think about users whose embeddings are outliers in the primary dimension. The two-pointer approach may systematically under-recall long-tail users.",
      "Good model cards are honest. 'This works well for X but fails for Y because Z' is more valuable than 'this works great.'",
    ],
    starterCode: `MODEL CARD — RecSys Feature Pipeline v2 + ANN Search
Author: Engineering Intern | Sprint: ML Feature Engineering

1. SYSTEM DESCRIPTION
What was built:
- Fixed feature aggregation: replaced O(n²) full-scan with O(n log n) sliding window (monotonic deque). Computes rolling 60-minute click rates per user.
- Approximate nearest-neighbor search: two-pointer pruning on embeddings sorted by primary cluster dimension. Reduces candidate set from 50M → ~50k before cosine similarity.

Why: RecSys model was serving stale features (aggregation couldn't keep up) and brute-force ANN was CPU-bound at 500 QPS.

2. PERFORMANCE CHARACTERISTICS
Feature pipeline: O(n²) → O(n log n). P99 restored from 4200ms to ~200ms.
ANN search: O(n·d) → O(log n + w·d), w≈50k. Empirical recall@10: ~94% at threshold=0.3. ~1000x query speedup.

3. KNOWN LIMITATIONS
- Sliding window assumes events are approximately time-sorted. Out-of-order events (network retries, delayed webhooks) may land in wrong windows.
- primary_threshold=0.3 is a manual constant with no adaptive mechanism for high-variance query vectors.
- Memory scales with concurrent users × window depth. Needs LRU eviction or Redis backend at 10M+ users.

4. POTENTIAL BIAS FROM APPROXIMATE NN
Two-pointer pruning may systematically under-recall users whose embeddings are outliers in the primary dimension — long-tail interest users who don't cluster tightly.
Risk: The recommendation system may underserve these users, reinforcing majority-interest feedback loops and reducing diversity.
Mitigation: Periodic brute-force re-ranking for users with low primary cluster confidence; content-based fallback for new users.

5. WHAT I'D BUILD WITH MORE TIME
- Adaptive threshold: auto-tune per query based on cluster membership confidence
- HNSW index for production-scale ANN with provable recall bounds
- Out-of-order event handling: reorder buffer accepting events up to 5min late
- A/B test: measure click-through rate impact of approximate vs exact NN`,
    openers: [
      { agentName: "Chen W.", message: "Today is your model card review. I want evidence you understand the failure modes, not just the happy path. An engineer who can articulate what breaks is more valuable than one who only documents what works." },
      { agentName: "Alex R.", message: "One thing for your card: does the approximate NN introduce systematic bias toward majority clusters? Some long-tail users have complained about stale recommendations — worth addressing explicitly." },
      { agentName: "Mia F.", message: "I've been thinking about the recall bound since yesterday. If you can bound recall@K analytically based on the threshold parameter — even loosely — that would be genuinely impressive. What's your intuition?" },
    ],
  },
];

/* ── Distributed track ─────────────────────────────────────────── */

const DIST_AGENTS: Agent[] = [
  { name: "Omar A.",  role: "Staff Eng",   style: "systems-thinker", icon: "hub",   color: "#a78bfa" },
  { name: "Julia T.", role: "SRE Lead",    style: "intense",         icon: "radar", color: "#EF4444" },
  { name: "Sam B.",   role: "Intern Peer", style: "collaborative",   icon: "group", color: "#F59E0B" },
];

const DIST_DAYS: DayData[] = [
  {
    day: 1, title: "Cascading Failure", icon: "warning", type: "chaos", color: "#EF4444",
    scenario: `🔴 SEV-1 INCIDENT | Distributed Queue Cluster | All regions degraded\n\nAt 03:22 UTC, queue-node-4 went unhealthy. Synchronized retries from all consumers created a thundering herd that took down 4 downstream services in 11 minutes.\n\nOmar traced the blast radius using a dependency graph. The hot path: Service A → Queue Node → Services B, C, D, E. Node failure triggered simultaneous retries from all consumers. Each retry wave hit the degraded node harder.\n\nJulia on the bridge: "We're at 23% throughput. I need a graph traversal of the dependency tree — identify which services can be isolated without expanding the blast radius. Now."`,
    taskLabel: "Trace the Blast Radius",
    taskDesc: "Given the service dependency graph, write a BFS traversal to identify: (1) all services downstream of the failed queue node, (2) which can be safely isolated, and (3) the order to restore service to minimize cascading re-failures using topological sort.",
    isCode: true,
    hints: [
      "Model the dependency graph as an adjacency list. BFS from the failed node gives all downstream services. Build the reverse graph (who depends on X) to find downstream direction.",
      "For restoration order: topological sort on the affected subgraph. Restore services with no remaining unhealthy dependencies first — essentially Kahn's algorithm.",
    ],
    starterCode: `from collections import deque, defaultdict

DEPS = {
    "api-gateway":  ["auth-service", "user-service"],
    "auth-service": ["queue-node-4"],   # FAILED
    "user-service": ["user-db", "cache"],
    "payment-svc":  ["queue-node-4", "payment-db"],   # FAILED
    "notif-svc":    ["queue-node-4", "email-gateway"], # FAILED
    "analytics":    ["queue-node-4"],   # FAILED
    "queue-node-4": [],  # ROOT FAILURE
    "payment-db": [], "user-db": [], "cache": [], "email-gateway": [],
}

FAILED_NODE = "queue-node-4"

def find_blast_radius(deps: dict, failed: str) -> list[str]:
    """BFS — find all services that depend (directly or transitively) on failed node."""
    reverse = defaultdict(list)
    for svc, dependencies in deps.items():
        for dep in dependencies:
            reverse[dep].append(svc)

    affected, queue, visited = [], deque([failed]), {failed}
    while queue:
        node = queue.popleft()
        for downstream in reverse[node]:
            if downstream not in visited:
                visited.add(downstream)
                affected.append(downstream)
                queue.append(downstream)
    return affected

def restoration_order(deps: dict, affected: list[str], failed: str) -> list[str]:
    """Topological sort — restore services with fewest unhealthy deps first."""
    unhealthy = set(affected) | {failed}
    in_degree = {svc: sum(1 for d in deps.get(svc, []) if d in unhealthy) for svc in affected}
    queue = deque(s for s in affected if in_degree[s] == 0)
    order = []
    reverse = defaultdict(list)
    for s, ds in deps.items():
        for d in ds:
            reverse[d].append(s)
    while queue:
        svc = queue.popleft()
        order.append(svc)
        for downstream in reverse[svc]:
            if downstream in in_degree:
                in_degree[downstream] -= 1
                if in_degree[downstream] == 0:
                    queue.append(downstream)
    return order

blast = find_blast_radius(DEPS, FAILED_NODE)
print(f"Blast radius: {blast}")
print(f"Restore order: {restoration_order(DEPS, blast, FAILED_NODE)}")`,
    openers: [
      { agentName: "Omar A.", message: "Before you write a single line, model the dependency graph topologically. What's the minimal cut that isolates the blast radius without taking down healthy services? Show your graph traversal logic." },
      { agentName: "Julia T.", message: "23% throughput and dropping. I need blast radius analysis in under 10 minutes. Graph traversal, isolation candidates, restoration order. Do not ship partial work. This is a production incident." },
      { agentName: "Sam B.", message: "This is intense but a great learning moment. BFS from the failed node gives you the downstream blast radius, then topological sort gives the safe restoration order. Let me know if you want to think through it together." },
    ],
  },
  {
    day: 2, title: "Circuit Breaker Build", icon: "construction", type: "build", color: "#6366F1",
    scenario: `Day 2 — Build Sprint\n\nThe incident is contained. Now Omar wants to prevent the next one.\n\nThe retry policy is the problem. When a service fails, all callers retry simultaneously with a fixed 1-second delay — thundering herd. The retry storm amplifies failures instead of damping them.\n\nOmar's spec: exponential backoff with full jitter, wrapped in a circuit breaker. Three states (closed/open/half-open), configurable failure threshold and timeout.\n\nJulia: "If this doesn't have a half-open probe mechanism I'm rejecting it in code review."`,
    taskLabel: "Implement Circuit Breaker + Exponential Backoff",
    taskDesc: "Build a circuit breaker class with 3 states (CLOSED, OPEN, HALF_OPEN) and exponential backoff + full jitter for retry delays. Include configurable failure threshold, recovery timeout, and the half-open probe mechanism.",
    isCode: true,
    hints: [
      "State transitions: CLOSED→OPEN on threshold exceeded, OPEN→HALF_OPEN after recovery timeout, HALF_OPEN→CLOSED on success, HALF_OPEN→OPEN on failure.",
      "Full jitter: delay = random(0, min(cap, base × 2^attempt)). This prevents synchronized retries (thundering herd) better than equal jitter.",
    ],
    starterCode: `import time, random
from enum import Enum

class State(Enum):
    CLOSED    = "closed"     # Normal — tracking failures
    OPEN      = "open"       # Failing — rejecting all requests
    HALF_OPEN = "half_open"  # Testing — one probe request allowed

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30.0, success_threshold=2):
        self.failure_threshold  = failure_threshold
        self.recovery_timeout   = recovery_timeout
        self.success_threshold  = success_threshold
        self.state              = State.CLOSED
        self.failure_count      = 0
        self.success_count      = 0
        self.last_failure_time  = 0.0

    def call(self, fn, *args, **kwargs):
        if self.state == State.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = State.HALF_OPEN
                self.success_count = 0
            else:
                raise RuntimeError("Circuit OPEN — request rejected")
        try:
            result = fn(*args, **kwargs)
            self._on_success()
            return result
        except Exception:
            self._on_failure(); raise

    def _on_success(self):
        if self.state == State.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = State.CLOSED; self.failure_count = 0
        elif self.state == State.CLOSED:
            self.failure_count = max(0, self.failure_count - 1)

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold or self.state == State.HALF_OPEN:
            self.state = State.OPEN

def full_jitter_backoff(attempt: int, base=0.5, cap=30.0) -> float:
    return random.uniform(0, min(cap, base * (2 ** attempt)))

def retry_with_circuit_breaker(fn, max_attempts=5, cb: CircuitBreaker = None):
    cb = cb or CircuitBreaker()
    for attempt in range(max_attempts):
        try:
            return cb.call(fn)
        except RuntimeError as e:
            if "Circuit OPEN" in str(e): raise
            time.sleep(full_jitter_backoff(attempt))
    raise RuntimeError(f"Max retries ({max_attempts}) exceeded")`,
    openers: [
      { agentName: "Omar A.", message: "Fixed retries with 1-second delays cause thundering herds at scale. I want a circuit breaker: closed/open/half-open, configurable failure threshold, recovery timeout. Sketch the state diagram before you code." },
      { agentName: "Julia T.", message: "No half-open probe = instant rejection in code review. The circuit breaker MUST test recovery with a single probe before fully re-opening. I've been paged at 3am because someone shipped a breaker without half-open. Don't be that person." },
      { agentName: "Sam B.", message: "I implemented something similar last month! Key insight for jitter: 'full jitter' (random between 0 and capped backoff) outperforms equal jitter at preventing thundering herds. The AWS exponential backoff blog post is great if you haven't read it." },
    ],
  },
  {
    day: 3, title: "Post-Mortem & RCA", icon: "speed", type: "review", color: "#2EC866",
    scenario: `Day 3 — Post-Mortem\n\nThe system is stable. Now comes the most important ritual in SRE culture: the blameless post-mortem.\n\nOmar: "Post-mortems aren't about who broke it. They're about why the system allowed it to break. A good post-mortem finds 3-5 contributing factors, not a single root cause."\n\nJulia wants the 5-why analysis. She says anyone who names a person as a cause automatically fails the review.\n\nWrite the post-mortem. Be rigorous. Be blameless.`,
    taskLabel: "Write a Blameless Post-Mortem",
    taskDesc: "Write a complete incident post-mortem for the cascading failure. Include:\n1. Incident summary (what happened, impact, duration)\n2. Timeline of events\n3. 5-why root cause analysis (system-level, not person-level)\n4. Contributing factors (at least 3)\n5. Action items with owners and deadlines",
    isCode: false,
    hints: [
      "5-why technique: start with the symptom, ask 'why?' 5 times, going deeper into system causes each time. The final 'why' should reveal a process or design gap.",
      "Good contributing factors are systemic: missing circuit breakers, no retry budgets, insufficient observability, no chaos testing. Avoid 'someone didn't test it.'",
    ],
    starterCode: `BLAMELESS POST-MORTEM
Incident: SEV-1 — Cascading Queue Failure
Duration: ~4 hours (03:22 UTC → 07:41 UTC) | Severity: SEV-1 | Status: Resolved

1. INCIDENT SUMMARY
queue-node-4 experienced a network partition at 03:22 UTC. All 5 dependent services began retrying against the degraded node simultaneously using fixed 1-second intervals (no jitter). The thundering herd prevented recovery and expanded the blast radius to 5 services in 11 minutes.
Peak impact: 23% of normal throughput. ~41,000 user sessions affected.

2. TIMELINE
03:22 — queue-node-4 network partition begins
03:24 — First alerts fire (P99 > 2000ms)
03:31 — auth-service begins returning 503s
03:33 — payment-service cascade begins
03:41 — analytics and notifications cascade
04:10 — Blast radius mapped via dependency graph traversal
04:25 — Affected services manually circuit-broken and isolated
05:00 — queue-node-4 restored by infra team
05:30 — Services restored in topological order
07:41 — All services fully healthy

3. ROOT CAUSE — 5 WHY
Why did 5 services fail when 1 node went down?
→ All 5 had synchronous, non-circuit-broken dependencies on queue-node-4.

Why didn't retry logic allow the node to recover?
→ Fixed 1-second retries caused synchronized thundering herds every second.

Why was there no circuit breaker to isolate the failure?
→ The circuit breaker spec was deferred from Q2 in favor of the service mesh upgrade.

Why was retry strategy not reviewed before the migration?
→ Retry policies are configured per-service with no cross-service audit process.

Why was there no cross-service retry audit process?
→ Retry configuration was treated as a per-team implementation detail with no platform-level policy.

ROOT CAUSE: Absence of platform-level retry governance combined with no graceful degradation path for queue dependency failures.

4. CONTRIBUTING FACTORS
1. No circuit breaker pattern — fixed retry intervals amplified rather than damped the failure
2. Synchronous hard dependencies — no fallback behavior when the queue was unavailable
3. Service topology not codified — blast radius calculation was manual during the incident
4. Alert threshold too conservative — P99 alert at 2000ms; a P95 alert at 500ms would have given 4 extra minutes
5. No chaos engineering — queue node failure mode had never been tested at production scale

5. ACTION ITEMS
[P0] Deploy circuit breakers across all queue consumers | Platform Eng | +7 days
[P0] Shared client library enforcing exponential backoff + full jitter | Platform Eng | +7 days
[P1] Machine-readable service dependency graph (YAML + API) | SRE | +14 days
[P1] Add P95 latency alerts at 500ms for all queue consumers | SRE | +3 days
[P2] Quarterly chaos engineering: queue node failure simulation | SRE + Platform | +30 days`,
    openers: [
      { agentName: "Omar A.", message: "Post-mortems are where engineers earn trust. I want 5 contributing factors minimum — not 'a node failed.' Every factor should be a system property. Blame is a signal that your analysis stopped too early." },
      { agentName: "Julia T.", message: "If I see a human's name in your contributing factors you are rewriting it. Blameless means blameless. Also: every action item needs an owner, a priority, and a deadline. No exceptions." },
      { agentName: "Sam B.", message: "I wrote my first post-mortem last month. The 5-why technique is harder than it looks — the first 2 whys are always obvious. The interesting ones are 3, 4, and 5. Want to talk through your analysis before you finalize?" },
    ],
  },
];

/* ── Track registry ────────────────────────────────────────────── */

const TRACK_REGISTRY: Record<string, TrackMeta> = {
  backend:     { id: "backend",     title: "Backend Systems Engineering", company: "FinTech Startup",        companyStage: "Series B · 280 employees", color: "#6366F1", agents: BACKEND_AGENTS, days: BACKEND_DAYS },
  ml:          { id: "ml",          title: "ML Feature Engineering",      company: "AI Research Lab",        companyStage: "Seed · 45 employees",       color: "#2EC866", agents: ML_AGENTS,      days: ML_DAYS      },
  distributed: { id: "distributed", title: "Distributed Systems",         company: "Cloud Infrastructure Co.", companyStage: "Series C · 620 employees", color: "#a78bfa", agents: DIST_AGENTS,    days: DIST_DAYS    },
};

/* ── Helpers ───────────────────────────────────────────────────── */

const DAY_TYPE_COLOR = { chaos: "#EF4444", build: "#6366F1", review: "#2EC866" };
const DAY_TYPE_LABEL = { chaos: "CHAOS", build: "BUILD", review: "REVIEW" };

function gradeFromScore(avg: number) {
  if (avg >= 88) return { letter: "S", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" };
  if (avg >= 72) return { letter: "A", color: "#2EC866", bg: "#F0FDF4", border: "#A7F3D0" };
  if (avg >= 55) return { letter: "B", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" };
  return { letter: "C", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };
}

function xpForGrade(grade: string) {
  return { S: 750, A: 600, B: 500, C: 350 }[grade] ?? 500;
}

/* ── Briefing screen ───────────────────────────────────────────── */

function BriefingScreen({ track, onStart }: { track: TrackMeta; onStart: () => void }) {
  const typeColor = DAY_TYPE_COLOR;
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Company header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${track.color}25`, border: `1px solid ${track.color}40` }}>
              <span className="material-symbols-outlined text-[24px]" style={{ color: track.color, fontVariationSettings: "'FILL' 1" }}>business_center</span>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-tight">{track.company}</p>
              <p className="text-white/40 text-xs">{track.companyStage}</p>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
            Engineering Internship — <span style={{ color: track.color }}>{track.title}</span>
          </h1>
          <p className="text-white/50 text-sm">3-day simulated sprint · AI colleagues · Real-time feedback</p>
        </div>

        {/* Tech Lead welcome */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: `${track.agents[0].color}25`, border: `1px solid ${track.agents[0].color}50`, color: track.agents[0].color }}>
              {track.agents[0].name[0]}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{track.agents[0].name}</p>
              <p className="text-white/40 text-[10px]">{track.agents[0].role}</p>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed italic">
            "Welcome to the team. These 3 days will be intense — real scenarios, real pressure, real feedback. Your colleagues will respond directly to what you submit, so be specific, be thorough, and show your work. We're watching how you think, not just what you produce. Good luck."
          </p>
        </div>

        {/* Sprint overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {track.days.map((day) => (
            <div key={day.day} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${typeColor[day.type]}20`, color: typeColor[day.type] }}>
                  {DAY_TYPE_LABEL[day.type]}
                </span>
              </div>
              <p className="text-white font-bold text-xs mb-1">Day {day.day}</p>
              <p className="text-white/60 text-[11px] leading-snug">{day.title}</p>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-2">Ground Rules</p>
          <ul className="space-y-1.5">
            {[
              "Your colleagues respond to what you actually submit — be specific and reference the task",
              "You can follow up with each colleague after they react",
              "Your submissions are scored — depth and tradeoff reasoning matter",
              "Progress is saved automatically — you can resume any time",
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-white/60 text-xs">
                <span className="text-white/30 flex-shrink-0 mt-0.5">→</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${track.color}, ${track.color}cc)` }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          Accept Internship — Start Day 1
        </button>
      </div>
    </div>
  );
}

/* ── Sprint dashboard ──────────────────────────────────────────── */

function SprintDashboard({
  track,
  currentDay,
  completedDays,
  onStartDay,
}: {
  track: TrackMeta;
  currentDay: number;
  completedDays: Record<number, DayResult>;
  onStartDay: (idx: number) => void;
}) {
  const navigate = useNavigate();
  const completedCount = Object.keys(completedDays).length;

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate("/internship")} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Internship Board
          </button>
          <div className="text-right">
            <p className="text-white font-bold">{track.company}</p>
            <p className="text-white/40 text-xs">{track.title}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/60 font-semibold">Sprint Progress</span>
            <span className="font-bold" style={{ color: track.color }}>{completedCount} / 3 days complete</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(completedCount / 3) * 100}%`, background: track.color }} />
          </div>
        </div>

        {/* Day cards */}
        <div className="flex flex-col gap-4 mb-8">
          {track.days.map((day, idx) => {
            const result = completedDays[idx];
            const isCurrent = idx === currentDay && !result;
            const isLocked = idx > currentDay && !result;
            const typeColor = DAY_TYPE_COLOR[day.type];

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border p-5 transition-all",
                  result ? "border-green-500/30 bg-green-500/5" :
                  isCurrent ? "border-white/20 bg-white/5" :
                  "border-white/5 bg-white/[0.02] opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${typeColor}20`, border: `1px solid ${typeColor}30` }}>
                      {result ? (
                        <span className="material-symbols-outlined text-[20px] text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px]" style={{ color: typeColor, fontVariationSettings: "'FILL' 1" }}>{day.icon}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${typeColor}20`, color: typeColor }}>{DAY_TYPE_LABEL[day.type]}</span>
                        {result && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{result.score}/100</span>}
                      </div>
                      <p className="text-white font-bold text-sm">Day {day.day} — {day.title}</p>
                    </div>
                  </div>

                  {result ? (
                    <button
                      onClick={() => onStartDay(idx)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
                    >
                      View Feedback
                    </button>
                  ) : isCurrent ? (
                    <button
                      onClick={() => onStartDay(idx)}
                      className="text-sm px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 transition-all hover:opacity-90"
                      style={{ background: track.color }}
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      {currentDay === 0 ? "Start Day 1" : "Continue"}
                    </button>
                  ) : (
                    <span className="material-symbols-outlined text-white/20 text-[20px]">lock</span>
                  )}
                </div>

                {result && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {result.strengths.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ {s}</span>
                      ))}
                      {result.gaps.map((g, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">△ {g}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Agent roster */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-3">Your Team</p>
          <div className="flex gap-4">
            {track.agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: `${agent.color}25`, border: `1px solid ${agent.color}50`, color: agent.color }}>
                    {agent.name[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-950" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{agent.name}</p>
                  <p className="text-white/40 text-[10px]">{agent.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Workspace (scenario → task → feedback) ────────────────────── */

type SubPhase = "scenario" | "task" | "feedback";

interface ReactionMsg {
  agent: Agent;
  message: string;
  loading: boolean;
}

function WorkspaceView({
  track,
  dayIdx,
  existingResult,
  onDayComplete,
  onBack,
}: {
  track: TrackMeta;
  dayIdx: number;
  existingResult?: DayResult;
  onDayComplete: (result: DayResult) => void;
  onBack: () => void;
}) {
  const day = track.days[dayIdx];
  const [subPhase, setSubPhase] = useState<SubPhase>(existingResult ? "feedback" : "scenario");
  const [code, setCode] = useState(existingResult?.submission ?? day.starterCode);
  const [reactions, setReactions] = useState<ReactionMsg[]>(
    existingResult ? existingResult.agentReactions.map(r => ({ agent: track.agents.find(a => a.name === r.name)!, message: r.message, loading: false })) : []
  );
  const [score, setScore] = useState<{ score: number; strengths: string[]; gaps: string[] } | null>(
    existingResult ? { score: existingResult.score, strengths: existingResult.strengths, gaps: existingResult.gaps } : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [followUps, setFollowUps] = useState<Record<string, { input: string; reply: string; loading: boolean; sent: boolean }>>(
    existingResult
      ? Object.fromEntries(existingResult.followUps.map(f => [f.agentName, { input: f.userMessage, reply: f.agentReply, loading: false, sent: true }]))
      : {}
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reactions, followUps]);

  async function handleSubmit() {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubPhase("feedback");

    // Placeholders
    const placeholders: ReactionMsg[] = track.agents.map(a => ({ agent: a, message: "...", loading: true }));
    setReactions(placeholders);

    const finalReactions: ReactionMsg[] = [...placeholders];

    // Sequential with stagger
    for (let i = 0; i < track.agents.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 900));
      const msg = await getAgentReaction(track.agents[i], code, day.taskDesc, day.isCode);
      finalReactions[i] = { agent: track.agents[i], message: msg, loading: false };
      setReactions([...finalReactions]);
    }

    // Score in background
    const scoreResult = await scoreSubmission(code, day.taskDesc, day.isCode);
    setScore(scoreResult);

    const result: DayResult = {
      submission: code,
      agentReactions: finalReactions.map(r => ({ name: r.agent.name, role: r.agent.role, color: r.agent.color, icon: r.agent.icon, message: r.message })),
      followUps: [],
      score: scoreResult.score,
      strengths: scoreResult.strengths,
      gaps: scoreResult.gaps,
    };

    onDayComplete(result);
    setIsSubmitting(false);
  }

  async function handleFollowUp(agentName: string) {
    const fu = followUps[agentName];
    if (!fu?.input.trim() || fu.loading || fu.sent) return;
    setFollowUps(prev => ({ ...prev, [agentName]: { ...prev[agentName], loading: true } }));
    const agent = track.agents.find(a => a.name === agentName)!;
    const reply = await getFollowUpReply(agent, code, day.taskDesc, fu.input);
    setFollowUps(prev => ({ ...prev, [agentName]: { ...prev[agentName], reply, loading: false, sent: true } }));
  }

  const typeColor = DAY_TYPE_COLOR[day.type];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Sprint Dashboard
        </button>
        <div className="flex items-center gap-2">
          {track.days.map((d, i) => (
            <div key={i} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all", i === dayIdx ? "text-white" : i < dayIdx ? "bg-green-500/20 text-green-400" : "text-white/20")} style={i === dayIdx ? { background: `${track.color}30`, color: track.color } : {}}>
              {i < dayIdx && <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
              Day {d.day}
            </div>
          ))}
        </div>
        <div className="text-right">
          <p className="text-white/60 text-xs">{track.company}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Chat */}
        <div className="w-[340px] flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
          {/* Scenario */}
          <div className="p-5 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${typeColor}20`, color: typeColor }}>{DAY_TYPE_LABEL[day.type]}</span>
              <span className="text-white/40 text-[10px]">Day {day.day}</span>
            </div>
            <p className="text-white font-bold text-sm mb-2">{day.title}</p>
            <p className="text-white/60 text-[11px] leading-relaxed whitespace-pre-line">{day.scenario}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Openers */}
            {(subPhase === "scenario" || subPhase === "task" || subPhase === "feedback") &&
              day.openers.map((opener, i) => {
                const agent = track.agents.find(a => a.name === opener.agentName);
                if (!agent) return null;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${agent.color}25`, border: `1px solid ${agent.color}50`, color: agent.color }}>
                      {agent.name[0]}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold mb-1" style={{ color: agent.color }}>{agent.name} · {agent.role}</p>
                      <div className="rounded-xl rounded-tl-none px-3 py-2 text-[11px] text-white/80 leading-relaxed" style={{ background: `${agent.color}12`, borderLeft: `2px solid ${agent.color}` }}>
                        {opener.message}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Reactions */}
            {subPhase === "feedback" && reactions.map((r, i) => (
              <div key={i}>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${r.agent.color}25`, border: `1px solid ${r.agent.color}50`, color: r.agent.color }}>
                    {r.agent.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold mb-1" style={{ color: r.agent.color }}>{r.agent.name} · {r.agent.role}</p>
                    <div className="rounded-xl rounded-tl-none px-3 py-2 text-[11px] text-white/80 leading-relaxed" style={{ background: `${r.agent.color}12`, borderLeft: `2px solid ${r.agent.color}` }}>
                      {r.loading ? <span className="animate-pulse">Reviewing your submission…</span> : r.message}
                    </div>
                    {/* Follow-up */}
                    {!r.loading && !existingResult && (() => {
                      const fu = followUps[r.agent.name];
                      if (fu?.sent) return (
                        <div className="mt-2 space-y-1.5">
                          <div className="ml-4 px-3 py-1.5 rounded-lg bg-white/5 text-[11px] text-white/50 italic">You: {fu.input}</div>
                          {fu.reply && <div className="rounded-xl rounded-tl-none px-3 py-2 text-[11px] text-white/80 leading-relaxed" style={{ background: `${r.agent.color}12`, borderLeft: `2px solid ${r.agent.color}` }}>{fu.reply}</div>}
                        </div>
                      );
                      return (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={fu?.input ?? ""}
                            onChange={e => setFollowUps(prev => ({ ...prev, [r.agent.name]: { input: e.target.value, reply: "", loading: false, sent: false } }))}
                            onKeyDown={e => e.key === "Enter" && handleFollowUp(r.agent.name)}
                            placeholder={`Reply to ${r.agent.name}…`}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                          />
                          <button
                            onClick={() => handleFollowUp(r.agent.name)}
                            disabled={fu?.loading}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-40 transition-all"
                            style={{ background: r.agent.color }}
                          >
                            {fu?.loading ? "…" : "Send"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {/* Score badge */}
            {score && subPhase === "feedback" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Day Score</p>
                  <span className="text-2xl font-black" style={{ color: score.score >= 80 ? "#2EC866" : score.score >= 60 ? "#F59E0B" : "#EF4444" }}>{score.score}/100</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {score.strengths.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ {s}</span>)}
                  {score.gaps.map((g, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">△ {g}</span>)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Team roster */}
          <div className="p-4 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-3">
              {track.agents.map(a => (
                <div key={a.name} className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `${a.color}25`, color: a.color }}>{a.name[0]}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-gray-950" />
                  </div>
                  <span className="text-white/40 text-[10px]">{a.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: task + editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {subPhase === "scenario" ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-lg text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: `${typeColor}20` }}>
                  <span className="material-symbols-outlined text-[32px]" style={{ color: typeColor, fontVariationSettings: "'FILL' 1" }}>{day.icon}</span>
                </div>
                <h2 className="text-white text-2xl font-extrabold mb-2">{day.title}</h2>
                <p className="text-white/50 text-sm mb-8">Read the scenario on the left, then click when you're ready to work.</p>
                <button
                  onClick={() => setSubPhase("task")}
                  className="px-8 py-3 rounded-xl text-white font-bold text-base flex items-center gap-2 mx-auto transition-all hover:opacity-90"
                  style={{ background: track.color }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
                  I'm ready — show me the task
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Task description */}
              <div className="p-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white font-bold mb-1">{day.taskLabel}</p>
                    <p className="text-white/60 text-xs leading-relaxed whitespace-pre-line">{day.taskDesc}</p>
                  </div>
                  {subPhase === "task" && (
                    <div className="flex-shrink-0">
                      {hintsShown < 2 && (
                        <button
                          onClick={() => setHintsShown(h => h + 1)}
                          className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                          Hint {hintsShown + 1}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {hintsShown > 0 && (
                  <div className="mt-3 space-y-2">
                    {day.hints.slice(0, hintsShown).map((hint, i) => (
                      <div key={i} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <span className="material-symbols-outlined text-amber-400 text-[14px] mt-0.5 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                        <p className="text-amber-200/80 text-[11px] leading-relaxed">{hint}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  disabled={subPhase === "feedback"}
                  className={cn(
                    "w-full h-full resize-none p-5 text-[13px] leading-relaxed font-mono focus:outline-none",
                    day.isCode
                      ? "bg-[#0d1117] text-[#e6edf3]"
                      : "bg-gray-900 text-white/80"
                  )}
                  placeholder={day.isCode ? "# Write your solution here…" : "Write your analysis here…"}
                  spellCheck={!day.isCode}
                />
              </div>

              {/* Submit bar */}
              {subPhase === "task" && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                  <p className="text-white/30 text-xs">
                    {code.length > day.starterCode.length ? `${code.length - day.starterCode.length} chars added` : "Edit the code above to submit"}
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !code.trim()}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: track.color }}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                    {isSubmitting ? "Submitting…" : "Submit to Team"}
                  </button>
                </div>
              )}

              {/* Feedback nav */}
              {subPhase === "feedback" && !existingResult && score && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
                  <p className="text-white/40 text-xs">Scored {score.score}/100 · You can reply to each colleague above</p>
                  <button
                    onClick={() => onDayComplete({
                      submission: code,
                      agentReactions: reactions.map(r => ({ name: r.agent.name, role: r.agent.role, color: r.agent.color, icon: r.agent.icon, message: r.message })),
                      followUps: Object.entries(followUps).filter(([, v]) => v.sent).map(([name, v]) => ({ agentName: name, userMessage: v.input, agentReply: v.reply })),
                      score: score.score,
                      strengths: score.strengths,
                      gaps: score.gaps,
                    })}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
                    style={{ background: track.color }}
                  >
                    {dayIdx < 2 ? "Next Day →" : "Complete Sprint →"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Performance review ────────────────────────────────────────── */

function PerformanceReview({ track, completedDays, letter, onBack }: {
  track: TrackMeta;
  completedDays: Record<number, DayResult>;
  letter: string;
  onBack: () => void;
}) {
  const scores = Object.values(completedDays).map(d => d.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const grade = gradeFromScore(avgScore);
  const xp = xpForGrade(grade.letter);
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    const text = `🎓 Completed the ${track.title} Internship Simulation on LearnAI\n\nGrade: ${grade.letter} · Score: ${avgScore}/100 · ${xp} XP earned\n\n${letter}\n\n— ${track.agents[0].name}, ${track.agents[0].role} at ${track.company}\n\nBuilt on LearnAI: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl font-black" style={{ background: grade.bg, border: `2px solid ${grade.border}`, color: grade.color }}>
            {grade.letter}
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Sprint Complete</h1>
          <p className="text-white/50 text-sm">{track.title} · {track.company}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Avg Score", value: `${avgScore}/100`, icon: "analytics" },
            { label: "XP Earned", value: `+${xp}`, icon: "bolt" },
            { label: "Days Completed", value: `${scores.length}/3`, icon: "event_available" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="material-symbols-outlined text-[20px] text-white/40 mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <p className="text-white font-black text-xl">{stat.value}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Day breakdown */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-4">Day-by-Day Breakdown</p>
          <div className="space-y-4">
            {Object.entries(completedDays).map(([idx, result]) => {
              const day = track.days[parseInt(idx)];
              const typeColor = DAY_TYPE_COLOR[day.type];
              return (
                <div key={idx} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${typeColor}20`, color: typeColor }}>
                    {parseInt(idx) + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-semibold text-xs">{day.title}</p>
                      <span className="text-xs font-black" style={{ color: result.score >= 80 ? "#2EC866" : result.score >= 60 ? "#F59E0B" : "#EF4444" }}>{result.score}/100</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.strengths.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">✓ {s}</span>)}
                      {result.gaps.map((g, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">△ {g}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Letter of recommendation */}
        {letter && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: `${track.agents[0].color}25`, border: `1px solid ${track.agents[0].color}50`, color: track.agents[0].color }}>
                {track.agents[0].name[0]}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{track.agents[0].name}</p>
                <p className="text-white/40 text-[10px]">{track.agents[0].role} · {track.company}</p>
              </div>
            </div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-3">Letter of Recommendation</p>
            <p className="text-white/80 text-sm leading-relaxed italic">{letter}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied!" : "Copy for LinkedIn"}
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: track.color }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Board
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */

type PagePhase = "briefing" | "dashboard" | "workspace" | "review";

export function InternshipWorkspacePage() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const track = TRACK_REGISTRY[trackId ?? ""];

  const { sprints, startSprint, saveDayResult, advanceDay, completeSprint } = useInternshipStore();
  const earnXP = useProgressStore(s => s.earnXP);
  const sprint = sprints[trackId ?? ""];

  const [phase, setPhase] = useState<PagePhase>(() => {
    if (!sprint?.started) return "briefing";
    if (sprint.sprintComplete) return "review";
    return "dashboard";
  });
  const [activeDayIdx, setActiveDayIdx] = useState<number>(sprint?.currentDay ?? 0);
  const [letterLoading, setLetterLoading] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(sprint?.letterOfRecommendation ?? "");

  if (!track) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Track not found</p>
          <button onClick={() => navigate("/internship")} className="text-white/50 hover:text-white text-sm">← Back to Internship Board</button>
        </div>
      </div>
    );
  }

  function handleBriefingStart() {
    startSprint(trackId!);
    setActiveDayIdx(0);
    setPhase("dashboard");
  }

  function handleStartDay(dayIdx: number) {
    setActiveDayIdx(dayIdx);
    setPhase("workspace");
  }

  async function handleDayComplete(result: DayResult) {
    saveDayResult(trackId!, activeDayIdx, result);

    if (activeDayIdx >= 2) {
      // Last day — generate letter and show review
      setLetterLoading(true);
      const allResults = { ...(sprint?.completedDays ?? {}), [activeDayIdx]: result };
      const letter = await generateLetter(track, allResults);
      setGeneratedLetter(letter);
      completeSprint(trackId!, letter);

      const scores = Object.values(allResults).map(d => d.score);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const grade = gradeFromScore(avg);
      const xp = xpForGrade(grade.letter);
      earnXP(xp);
      showXPToast(xp);
      fireConfetti();

      setLetterLoading(false);
      setPhase("review");
    } else {
      advanceDay(trackId!);
      setPhase("dashboard");
    }
  }

  if (letterLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-4" />
          <p className="text-white font-bold mb-1">Writing your letter of recommendation…</p>
          <p className="text-white/40 text-sm">Hang tight — {track.agents[0].name} is reflecting on your sprint</p>
        </div>
      </div>
    );
  }

  if (phase === "briefing") return <BriefingScreen track={track} onStart={handleBriefingStart} />;

  if (phase === "review") return (
    <PerformanceReview
      track={track}
      completedDays={sprint?.completedDays ?? {}}
      letter={generatedLetter || sprint?.letterOfRecommendation || ""}
      onBack={() => navigate("/internship")}
    />
  );

  if (phase === "workspace") return (
    <WorkspaceView
      track={track}
      dayIdx={activeDayIdx}
      existingResult={sprint?.completedDays?.[activeDayIdx]}
      onDayComplete={handleDayComplete}
      onBack={() => setPhase("dashboard")}
    />
  );

  return (
    <SprintDashboard
      track={track}
      currentDay={sprint?.currentDay ?? 0}
      completedDays={sprint?.completedDays ?? {}}
      onStartDay={handleStartDay}
    />
  );
}
