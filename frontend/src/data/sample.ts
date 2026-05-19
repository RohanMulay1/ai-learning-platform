export const SAMPLE_USER = {
  id: "demo", email: "rohanm1307@gmail.com", first_name: "Rohan", last_name: "Mulay",
  current_level: 7, current_xp: 3400, current_streak: 12,
};

export const SAMPLE_CHALLENGES = [
  { id: "1", title: "Two Sum", difficulty: "easy", estimated_time_minutes: 15, companies: ["Google", "Amazon", "Apple"], skill_tags: ["Arrays & Hashing"], description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.", is_generated: false, examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9" }], constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9", hints: [{ level: 1, content: "Try using a hash map to store seen values." }, { level: 2, content: "For each num, check if (target - num) exists in the map." }] },
  { id: "2", title: "Valid Anagram", difficulty: "easy", estimated_time_minutes: 10, companies: ["Amazon", "Microsoft"], skill_tags: ["Arrays & Hashing"], description: "Given two strings s and t, return true if t is an anagram of s.", is_generated: false, examples: [{ input: 's = "anagram", t = "nagaram"', output: "true", explanation: "" }], constraints: "1 <= s.length, t.length <= 5 * 10^4", hints: [{ level: 1, content: "Count frequency of each character." }] },
  { id: "3", title: "Contains Duplicate", difficulty: "easy", estimated_time_minutes: 10, companies: ["Adobe", "Airbnb"], skill_tags: ["Arrays & Hashing"], description: "Given an integer array nums, return true if any value appears at least twice.", is_generated: false, examples: [{ input: "nums = [1,2,3,1]", output: "true", explanation: "" }], constraints: "1 <= nums.length <= 10^5", hints: [{ level: 1, content: "Use a set to track seen values." }] },
  { id: "4", title: "Best Time to Buy and Sell Stock", difficulty: "easy", estimated_time_minutes: 20, companies: ["Amazon", "Goldman Sachs", "Facebook"], skill_tags: ["Two Pointers"], description: "You are given an array prices. Maximize profit by choosing a single day to buy and a future day to sell.", is_generated: false, examples: [{ input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy day 2, sell day 5" }], constraints: "1 <= prices.length <= 10^5", hints: [{ level: 1, content: "Use two pointers: left (buy) and right (sell)." }] },
  { id: "5", title: "Longest Substring Without Repeating Characters", difficulty: "medium", estimated_time_minutes: 25, companies: ["Amazon", "Bloomberg", "Facebook"], skill_tags: ["Sliding Window"], description: "Given a string s, find the length of the longest substring without repeating characters.", is_generated: false, examples: [{ input: 's = "abcabcbb"', output: "3", explanation: '"abc" has length 3' }], constraints: "0 <= s.length <= 5 * 10^4", hints: [{ level: 1, content: "Use a sliding window with a set." }] },
  { id: "6", title: "Valid Parentheses", difficulty: "easy", estimated_time_minutes: 15, companies: ["Google", "Facebook", "Spotify"], skill_tags: ["Stack"], description: "Given a string containing just bracket characters, determine if the input string is valid.", is_generated: false, examples: [{ input: 's = "()"', output: "true", explanation: "" }], constraints: "1 <= s.length <= 10^4", hints: [{ level: 1, content: "Use a stack. Push open brackets, pop when closing." }] },
  { id: "7", title: "Binary Search", difficulty: "easy", estimated_time_minutes: 15, companies: ["Microsoft", "Apple"], skill_tags: ["Binary Search"], description: "Given a sorted array nums and target, return the index if found, else -1. Must be O(log n).", is_generated: false, examples: [{ input: "nums = [-1,0,3,5,9,12], target = 9", output: "4", explanation: "9 exists at index 4" }], constraints: "1 <= nums.length <= 10^4", hints: [{ level: 1, content: "Use left and right pointers, compute mid each iteration." }] },
  { id: "8", title: "Merge Two Sorted Lists", difficulty: "easy", estimated_time_minutes: 20, companies: ["Amazon", "Microsoft", "Google"], skill_tags: ["Linked List"], description: "Merge two sorted linked lists and return the head of the merged list.", is_generated: false, examples: [{ input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]", explanation: "" }], constraints: "0 to 50 nodes each", hints: [{ level: 1, content: "Use a dummy node to simplify edge cases." }] },
  { id: "9", title: "Invert Binary Tree", difficulty: "easy", estimated_time_minutes: 15, companies: ["Google", "Uber", "Apple"], skill_tags: ["Trees"], description: "Given the root of a binary tree, invert the tree and return its root.", is_generated: false, examples: [{ input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]", explanation: "" }], constraints: "0 to 100 nodes", hints: [{ level: 1, content: "Recursively swap left and right subtrees." }] },
  { id: "10", title: "Climbing Stairs", difficulty: "easy", estimated_time_minutes: 20, companies: ["Amazon", "Google", "Apple"], skill_tags: ["Dynamic Programming"], description: "It takes n steps to reach the top. Each time you can climb 1 or 2 steps. How many distinct ways?", is_generated: false, examples: [{ input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1" }], constraints: "1 <= n <= 45", hints: [{ level: 1, content: "ways(n) = ways(n-1) + ways(n-2)" }] },
  { id: "11", title: "3Sum", difficulty: "medium", estimated_time_minutes: 30, companies: ["Facebook", "Amazon", "Microsoft"], skill_tags: ["Two Pointers"], description: "Return all triplets that sum to zero. No duplicate triplets.", is_generated: false, examples: [{ input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]", explanation: "" }], constraints: "3 <= nums.length <= 3000", hints: [{ level: 1, content: "Sort first, fix one element, two pointers for the rest." }] },
  { id: "12", title: "Word Search", difficulty: "medium", estimated_time_minutes: 35, companies: ["Facebook", "Amazon"], skill_tags: ["Graphs"], description: "Given an m×n grid and a word, return true if the word exists using adjacent cells.", is_generated: false, examples: [{ input: 'board = [["A","B","C","E"],...], word = "ABCCED"', output: "true", explanation: "" }], constraints: "1 <= m, n <= 6", hints: [{ level: 1, content: "DFS + backtracking. Mark cells visited temporarily." }] },
];

export const SAMPLE_COURSES = [
  {
    id: "c1", title: "Arrays & Hashing Mastery", topic: "Data Structures", difficulty: "beginner",
    estimated_hours: 8, progress: 100, enrolled: true,
    description: "Master the most fundamental data structure. Learn hash maps, sets, and array manipulation patterns used in 40% of all coding interviews.",
    modules: [
      { id: "m1", title: "Hash Maps & Sets", duration: "45 min", type: "lesson", completed: true, description: "Understanding O(1) lookup and when to use it", lesson_id: "l1" },
      { id: "m2", title: "Two Sum Pattern", duration: "30 min", type: "challenge", completed: true, description: "Classic hash map application", challenge_id: "1" },
      { id: "m3", title: "Anagram Detection", duration: "25 min", type: "challenge", completed: true, description: "Frequency counting technique", challenge_id: "2" },
      { id: "m4", title: "Sliding Window Intro", duration: "50 min", type: "lesson", completed: true, description: "Transitioning from arrays to windows", lesson_id: "l2" },
      { id: "m5", title: "Group Anagrams", duration: "35 min", type: "challenge", completed: true, description: "Advanced grouping with hash maps", challenge_id: "2" },
      { id: "m6", title: "Arrays & Hashing Quiz", duration: "10 min", type: "quiz", completed: true, description: "Test your conceptual understanding", quiz_id: "arrays" },
    ],
    tags: ["Arrays", "Hash Maps", "Interview Prep"],
    instructor: "AI Tutor",
    rating: 4.9, students: 1240,
  },
  {
    id: "c2", title: "Two Pointers & Sliding Window", topic: "Algorithms", difficulty: "beginner",
    estimated_hours: 6, progress: 60, enrolled: true,
    description: "The two most powerful O(n) patterns. Once you internalize these, you'll solve medium problems in minutes.",
    modules: [
      { id: "m1", title: "The Two Pointer Technique", duration: "40 min", type: "lesson", completed: true, description: "Left/right pointer mental model", lesson_id: "l3" },
      { id: "m2", title: "Valid Palindrome", duration: "20 min", type: "challenge", completed: true, description: "Classic two-pointer application", challenge_id: "4" },
      { id: "m3", title: "Fixed-Size Sliding Window", duration: "45 min", type: "lesson", completed: true, description: "Max sum subarray of size k", lesson_id: "l4" },
      { id: "m4", title: "Variable Window", duration: "50 min", type: "lesson", completed: false, description: "Shrink/expand based on conditions", lesson_id: "l5" },
      { id: "m5", title: "Longest Substring", duration: "35 min", type: "challenge", completed: false, description: "Classic variable window problem", challenge_id: "5" },
      { id: "m6", title: "Two Pointers Quiz", duration: "8 min", type: "quiz", completed: false, description: "Check your conceptual understanding", quiz_id: "two-pointers" },
    ],
    tags: ["Two Pointers", "Sliding Window", "O(n)"],
    instructor: "AI Tutor",
    rating: 4.8, students: 980,
  },
  // Future courses — uncomment to unlock
  /*
  {
    id: "c3", title: "Binary Search Deep Dive", topic: "Algorithms", difficulty: "intermediate",
    estimated_hours: 7, progress: 30, enrolled: true,
    description: "Binary search isn't just for sorted arrays. Learn to apply it to any monotonic search space — a superpower in technical interviews.",
    modules: [
      { id: "m1", title: "Classic Binary Search", duration: "30 min", type: "lesson", completed: true, description: "The foundation — lo/hi/mid", lesson_id: "l6" },
      { id: "m2", title: "Search in Rotated Array", duration: "40 min", type: "challenge", completed: false, description: "Handling non-standard sorted arrays", challenge_id: "7" },
      { id: "m3", title: "Find First/Last Position", duration: "35 min", type: "challenge", completed: false, description: "Template-based approach", challenge_id: "7" },
      { id: "m4", title: "Abstract Binary Search", duration: "55 min", type: "lesson", completed: false, description: "Apply to answer-space problems", lesson_id: "l7" },
    ],
    tags: ["Binary Search", "O(log n)", "Search Spaces"],
    instructor: "AI Tutor",
    rating: 4.9, students: 756,
  },
  {
    id: "c4", title: "Trees & Recursion", topic: "Data Structures", difficulty: "intermediate",
    estimated_hours: 10, progress: 10, enrolled: false,
    description: "Trees appear in 30% of system design and 25% of algorithm interviews. Master DFS, BFS, and recursive thinking.",
    modules: [
      { id: "m1", title: "Binary Tree Fundamentals", duration: "45 min", type: "lesson", completed: false, description: "Nodes, edges, height, depth", lesson_id: "l8" },
      { id: "m2", title: "DFS Traversals", duration: "50 min", type: "lesson", completed: false, description: "Pre/in/post order", lesson_id: "l9" },
      { id: "m3", title: "BFS Level-Order", duration: "40 min", type: "lesson", completed: false, description: "Queue-based traversal", lesson_id: "l10" },
      { id: "m4", title: "Invert Binary Tree", duration: "25 min", type: "challenge", completed: false, description: "Classic recursion", challenge_id: "9" },
      { id: "m5", title: "Max Depth", duration: "25 min", type: "challenge", completed: false, description: "Tree recursion pattern", challenge_id: "9" },
    ],
    tags: ["Trees", "DFS", "BFS", "Recursion"],
    instructor: "AI Tutor",
    rating: 4.7, students: 1560,
  },
  {
    id: "c5", title: "Dynamic Programming Fundamentals", topic: "Algorithms", difficulty: "advanced",
    estimated_hours: 20, progress: 0, enrolled: false,
    description: "The topic that separates senior engineers from the rest. Build intuition for memoization, tabulation, and state design from the ground up.",
    modules: [
      { id: "m1", title: "What is DP? Fibonacci Intuition", duration: "60 min", type: "lesson", completed: false, description: "Overlapping subproblems explained", lesson_id: "l11" },
      { id: "m2", title: "Memoization (Top-Down)", duration: "50 min", type: "lesson", completed: false, description: "Caching recursive results", lesson_id: "l12" },
      { id: "m3", title: "Tabulation (Bottom-Up)", duration: "50 min", type: "lesson", completed: false, description: "Iterative DP", lesson_id: "l13" },
      { id: "m4", title: "Climbing Stairs", duration: "30 min", type: "challenge", completed: false, description: "DP entry point", challenge_id: "10" },
      { id: "m5", title: "House Robber", duration: "35 min", type: "challenge", completed: false, description: "1D DP", challenge_id: "10" },
    ],
    tags: ["DP", "Memoization", "Tabulation"],
    instructor: "AI Tutor",
    rating: 4.9, students: 2100,
  },
  {
    id: "c6", title: "Graph Algorithms", topic: "Algorithms", difficulty: "advanced",
    estimated_hours: 15, progress: 0, enrolled: false,
    description: "Graphs model everything: social networks, maps, dependencies. Learn DFS, BFS, union-find, topological sort, and Dijkstra.",
    modules: [
      { id: "m1", title: "Graph Representations", duration: "40 min", type: "lesson", completed: false, description: "Adjacency list vs matrix", lesson_id: "l14" },
      { id: "m2", title: "DFS on Graphs", duration: "45 min", type: "lesson", completed: false, description: "Recursive and iterative", lesson_id: "l15" },
      { id: "m3", title: "BFS & Shortest Path", duration: "45 min", type: "lesson", completed: false, description: "Level-by-level exploration", lesson_id: "l16" },
      { id: "m4", title: "Number of Islands", duration: "35 min", type: "challenge", completed: false, description: "Classic graph DFS", challenge_id: "12" },
      { id: "m5", title: "Course Schedule", duration: "45 min", type: "challenge", completed: false, description: "Topological sort / cycle detection", challenge_id: "12" },
    ],
    tags: ["Graphs", "DFS", "BFS", "Union-Find"],
    instructor: "AI Tutor",
    rating: 4.8, students: 890,
  },
  */
];

export const SAMPLE_LESSONS: Record<string, { title: string; content: string; key_points: string[]; code_example?: string }> = {
  l1: {
    title: "Hash Maps & Sets",
    content: `A **hash map** (or dictionary) stores key-value pairs and provides O(1) average-time lookup, insertion, and deletion. Under the hood, it uses a hash function to map keys to array indices.

A **hash set** is the same idea but only stores keys — useful when you just need to check membership.

## When to use a hash map

Use a hash map when you need to:
- Count frequencies (character counts, word counts)
- Cache/memoize previous results
- Look up whether you've seen a value before
- Group items by a key

## The core pattern

For many problems, you can reduce O(n²) brute force to O(n) by trading space for time — store values you've seen in a hash map, then check against it in O(1) instead of re-scanning the array.`,
    key_points: [
      "Hash maps give O(1) average lookup — use them to eliminate nested loops",
      "Hash sets are for membership testing — 'have I seen this before?'",
      "Space complexity is O(n) — you're trading memory for speed",
      "Common patterns: frequency count, complement lookup, grouping",
    ],
    code_example: `# Frequency count pattern
def char_frequency(s: str) -> dict:
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    return freq

# Complement lookup pattern (Two Sum)
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i`,
  },
  l2: {
    title: "Sliding Window Intro",
    content: `The **sliding window** technique is used to efficiently process subarrays or substrings of a fixed or variable size. Instead of recomputing from scratch each time, you "slide" a window across the data, adding one element and removing another.

## Fixed-size window

When you need the max/min/sum of every subarray of length k:

1. Compute the result for the first window of size k
2. Slide right: add the new element, subtract the leftmost element
3. Update your answer

## Variable-size window

When you need the longest/shortest subarray satisfying a condition:

1. Expand the right pointer until the condition is violated
2. Shrink the left pointer until the condition is satisfied again
3. Track the best window seen so far`,
    key_points: [
      "Fixed window: slide by adding right element and removing left element",
      "Variable window: expand right until invalid, shrink left until valid",
      "O(n) time — each element enters and exits the window exactly once",
      "Use a hash map inside the window to track frequencies",
    ],
    code_example: `# Variable window — longest substring without repeating chars
def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = 0
    best = 0

    for right, ch in enumerate(s):
        if ch in char_index and char_index[ch] >= left:
            left = char_index[ch] + 1  # shrink window
        char_index[ch] = right
        best = max(best, right - left + 1)

    return best`,
  },
  l3: {
    title: "The Two Pointer Technique",
    content: `**Two pointers** is a pattern where you maintain two indices into an array or string, typically moving toward each other or in the same direction, to solve problems in O(n) instead of O(n²).

## Opposite-direction pointers

Used when the array is sorted (or can be sorted). Start one pointer at the left, one at the right, and converge based on the condition.

**Example**: Find a pair that sums to a target in a sorted array.

## Same-direction pointers (fast/slow)

Used for partitioning or removing elements in-place. The slow pointer tracks where to write, the fast pointer scans ahead.

**Example**: Remove duplicates from sorted array in-place.`,
    key_points: [
      "Opposite pointers: sorted array, converge from both ends",
      "Same-direction: fast pointer scans, slow pointer writes",
      "Always O(n) — each pointer moves at most n steps total",
      "Works for palindrome checks, pair sums, Dutch flag partitioning",
    ],
    code_example: `# Opposite pointers — pair sum in sorted array
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []`,
  },
};

export const SAMPLE_SKILLS = [
  { skill_id: "s1", skill_name: "Arrays & Hashing", mastery_level: 0.92, is_unlocked: true, problems_solved: 14, category: "Foundation" },
  { skill_id: "s2", skill_name: "Two Pointers", mastery_level: 0.78, is_unlocked: true, problems_solved: 8, category: "Foundation" },
  { skill_id: "s3", skill_name: "Sliding Window", mastery_level: 0.65, is_unlocked: true, problems_solved: 5, category: "Foundation" },
  { skill_id: "s4", skill_name: "Stack", mastery_level: 0.70, is_unlocked: true, problems_solved: 6, category: "Foundation" },
  { skill_id: "s5", skill_name: "Binary Search", mastery_level: 0.55, is_unlocked: true, problems_solved: 4, category: "Searching" },
  { skill_id: "s6", skill_name: "Linked List", mastery_level: 0.40, is_unlocked: true, problems_solved: 3, category: "Data Structures" },
  { skill_id: "s7", skill_name: "Trees", mastery_level: 0.25, is_unlocked: true, problems_solved: 2, category: "Data Structures" },
  { skill_id: "s8", skill_name: "Heap / Priority Queue", mastery_level: 0.0, is_unlocked: false, problems_solved: 0, category: "Data Structures" },
  { skill_id: "s9", skill_name: "Tries", mastery_level: 0.0, is_unlocked: false, problems_solved: 0, category: "Data Structures" },
  { skill_id: "s10", skill_name: "Graphs", mastery_level: 0.10, is_unlocked: false, problems_solved: 1, category: "Advanced" },
  { skill_id: "s11", skill_name: "Dynamic Programming", mastery_level: 0.05, is_unlocked: false, problems_solved: 0, category: "Advanced" },
  { skill_id: "s12", skill_name: "Greedy", mastery_level: 0.0, is_unlocked: false, problems_solved: 0, category: "Advanced" },
];

export const SKILL_EDGES: [string, string][] = [
  ["s1", "s2"], ["s1", "s4"], ["s1", "s5"],
  ["s2", "s3"], ["s2", "s6"],
  ["s6", "s7"], ["s7", "s8"], ["s7", "s9"], ["s7", "s10"],
  ["s10", "s11"], ["s10", "s12"],
];

export const SAMPLE_REVIEW_CARDS = [
  { challenge_id: "3", challenge_title: "Contains Duplicate", challenge_difficulty: "easy", interval: 7, ease_factor: 2.4, repetitions: 3, next_review_date: new Date().toISOString().split("T")[0], last_reviewed: new Date(Date.now() - 7 * 86400000).toISOString() },
  { challenge_id: "4", challenge_title: "Best Time to Buy and Sell Stock", challenge_difficulty: "easy", interval: 6, ease_factor: 2.5, repetitions: 2, next_review_date: new Date().toISOString().split("T")[0], last_reviewed: new Date(Date.now() - 6 * 86400000).toISOString() },
  { challenge_id: "5", challenge_title: "Longest Substring Without Repeating Characters", challenge_difficulty: "medium", interval: 1, ease_factor: 2.3, repetitions: 1, next_review_date: new Date().toISOString().split("T")[0], last_reviewed: new Date(Date.now() - 86400000).toISOString() },
  { challenge_id: "6", challenge_title: "Valid Parentheses", challenge_difficulty: "easy", interval: 1, ease_factor: 2.0, repetitions: 0, next_review_date: new Date().toISOString().split("T")[0], last_reviewed: null },
];

export const SAMPLE_BADGES = [
  { id: "b1", name: "First Blood", description: "Solve your first challenge", rarity: "common", xp_reward: 100, status: "earned", completion_percentage: 100, earned_at: "2026-04-05", is_masterpiece: false },
  { id: "b2", name: "Hash Hacker", description: "Solve 5 Array & Hashing problems", rarity: "common", xp_reward: 200, status: "earned", completion_percentage: 100, earned_at: "2026-04-15", is_masterpiece: true },
  { id: "b3", name: "Streak Warrior", description: "Maintain a 7-day learning streak", rarity: "rare", xp_reward: 500, status: "earned", completion_percentage: 100, earned_at: "2026-04-25", is_masterpiece: false },
  { id: "b4", name: "Speed Demon", description: "Solve a hard problem in under 15 minutes", rarity: "rare", xp_reward: 750, status: "in_progress", completion_percentage: 60, earned_at: null, is_masterpiece: false },
  { id: "b5", name: "Socratic Scholar", description: "Complete 20 AI tutor sessions", rarity: "epic", xp_reward: 1000, status: "in_progress", completion_percentage: 35, earned_at: null, is_masterpiece: false },
  { id: "b6", name: "Algorithm Artisan", description: "Reach 80% mastery in 5 different skills", rarity: "epic", xp_reward: 2000, status: "in_progress", completion_percentage: 40, earned_at: null, is_masterpiece: false },
  { id: "b7", name: "Legendary Coder", description: "Solve 100 problems with explanation", rarity: "legendary", xp_reward: 5000, status: "locked", completion_percentage: 0, earned_at: null, is_masterpiece: false },
  { id: "b8", name: "Night Owl", description: "Solve 3 problems between midnight and 4am", rarity: "rare", xp_reward: 300, status: "in_progress", completion_percentage: 66, earned_at: null, is_masterpiece: false },
];

// Activity heatmap — last 16 weeks
export const ACTIVITY_HEATMAP = (() => {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const isRecent = i < 30;
    const isWeekend = dow === 0 || dow === 6;
    let count = 0;
    if (!isWeekend || Math.random() > 0.4) {
      if (i % 3 === 0) count = 0;
      else if (isRecent) count = Math.floor(Math.random() * 5) + 1;
      else count = Math.floor(Math.random() * 4);
    }
    data.push({ date: d.toISOString().split("T")[0], count });
  }
  return data;
})();
