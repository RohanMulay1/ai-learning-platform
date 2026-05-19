"""
Seed script — populates the SQLite database with rich sample data.
Run: python seed.py  (from the backend/ directory)
"""
import asyncio
import uuid
from datetime import datetime, date, timedelta
from passlib.context import CryptContext

from app.db.database import engine, Base
from app.models import user, skill, challenge, review_card, tutor_session, badge  # noqa: F401 register all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL = "demo@learnai.dev"
DEMO_PASSWORD = "demo1234"

SKILLS = [
    {"name": "Arrays & Hashing", "category": "Data Structures", "difficulty": 1, "estimated_hours": 8,
     "description": "Foundation of algorithm problems. Master hash maps, sets, and array manipulation."},
    {"name": "Two Pointers", "category": "Algorithms", "difficulty": 2, "estimated_hours": 6,
     "description": "Efficient O(n) solutions using left/right pointer technique."},
    {"name": "Sliding Window", "category": "Algorithms", "difficulty": 2, "estimated_hours": 6,
     "description": "Variable and fixed-size window patterns for subarray problems."},
    {"name": "Stack", "category": "Data Structures", "difficulty": 2, "estimated_hours": 5,
     "description": "LIFO structure for bracket matching, monotonic stack, and more."},
    {"name": "Binary Search", "category": "Algorithms", "difficulty": 2, "estimated_hours": 7,
     "description": "Search sorted spaces and abstract search problems in O(log n)."},
    {"name": "Linked List", "category": "Data Structures", "difficulty": 3, "estimated_hours": 8,
     "description": "Pointer manipulation, fast/slow pointers, reversal patterns."},
    {"name": "Trees", "category": "Data Structures", "difficulty": 3, "estimated_hours": 10,
     "description": "BST, DFS/BFS traversals, and recursive tree patterns."},
    {"name": "Tries", "category": "Data Structures", "difficulty": 3, "estimated_hours": 5,
     "description": "Prefix tree for autocomplete and word search problems."},
    {"name": "Heap / Priority Queue", "category": "Data Structures", "difficulty": 3, "estimated_hours": 6,
     "description": "Min/max heap for k-largest, merge sorted streams, scheduling."},
    {"name": "Graphs", "category": "Algorithms", "difficulty": 4, "estimated_hours": 15,
     "description": "DFS, BFS, union-find, topological sort for complex graph problems."},
    {"name": "Dynamic Programming", "category": "Algorithms", "difficulty": 5, "estimated_hours": 20,
     "description": "Memoization and tabulation for optimal substructure problems."},
    {"name": "Greedy", "category": "Algorithms", "difficulty": 4, "estimated_hours": 8,
     "description": "Locally optimal choices that lead to globally optimal solutions."},
]

PREREQUISITES = [
    ("Two Pointers", "Arrays & Hashing"),
    ("Sliding Window", "Two Pointers"),
    ("Stack", "Arrays & Hashing"),
    ("Binary Search", "Arrays & Hashing"),
    ("Linked List", "Two Pointers"),
    ("Trees", "Linked List"),
    ("Tries", "Trees"),
    ("Heap / Priority Queue", "Trees"),
    ("Graphs", "Trees"),
    ("Dynamic Programming", "Graphs"),
    ("Greedy", "Dynamic Programming"),
]

CHALLENGES = [
    {
        "title": "Two Sum",
        "description": (
            "Given an array of integers `nums` and an integer `target`, return indices of the two numbers "
            "such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, "
            "and you may not use the same element twice."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 15,
        "skill_tags": ["Arrays & Hashing"],
        "companies": ["Google", "Amazon", "Apple"],
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]",
             "explanation": "nums[0] + nums[1] == 9, so return [0, 1]."},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": ""},
        ],
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
        "hints": [
            {"level": 1, "content": "Try using a hash map to store seen values."},
            {"level": 2, "content": "For each num, check if (target - num) exists in the map."},
            {"level": 3, "content": "Return [map[complement], i] when found."},
        ],
        "test_cases": [
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1]},
            {"input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2]},
            {"input": {"nums": [3, 3], "target": 6}, "expected": [0, 1]},
        ],
        "solution": "def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i",
    },
    {
        "title": "Valid Anagram",
        "description": (
            "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\n"
            "An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, "
            "typically using all the original letters exactly once."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 10,
        "skill_tags": ["Arrays & Hashing"],
        "companies": ["Amazon", "Microsoft"],
        "examples": [
            {"input": 's = "anagram", t = "nagaram"', "output": "true", "explanation": ""},
            {"input": 's = "rat", t = "car"', "output": "false", "explanation": ""},
        ],
        "constraints": "1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.",
        "hints": [
            {"level": 1, "content": "Count frequency of each character."},
            {"level": 2, "content": "Compare the two frequency maps."},
        ],
        "test_cases": [
            {"input": {"s": "anagram", "t": "nagaram"}, "expected": True},
            {"input": {"s": "rat", "t": "car"}, "expected": False},
        ],
        "solution": "def isAnagram(s, t):\n    from collections import Counter\n    return Counter(s) == Counter(t)",
    },
    {
        "title": "Contains Duplicate",
        "description": (
            "Given an integer array `nums`, return `true` if any value appears at least twice in the array, "
            "and return `false` if every element is distinct."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 10,
        "skill_tags": ["Arrays & Hashing"],
        "companies": ["Adobe", "Airbnb"],
        "examples": [
            {"input": "nums = [1,2,3,1]", "output": "true", "explanation": ""},
            {"input": "nums = [1,2,3,4]", "output": "false", "explanation": ""},
        ],
        "constraints": "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
        "hints": [{"level": 1, "content": "Use a set to track seen values."}],
        "test_cases": [
            {"input": {"nums": [1, 2, 3, 1]}, "expected": True},
            {"input": {"nums": [1, 2, 3, 4]}, "expected": False},
        ],
        "solution": "def containsDuplicate(nums):\n    return len(set(nums)) < len(nums)",
    },
    {
        "title": "Best Time to Buy and Sell Stock",
        "description": (
            "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\n"
            "You want to maximize your profit by choosing a single day to buy one stock and choosing a different day "
            "in the future to sell that stock. Return the maximum profit you can achieve from this transaction. "
            "If you cannot achieve any profit, return `0`."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 20,
        "skill_tags": ["Two Pointers", "Arrays & Hashing"],
        "companies": ["Amazon", "Goldman Sachs", "Facebook"],
        "examples": [
            {"input": "prices = [7,1,5,3,6,4]", "output": "5",
             "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."},
            {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "No profit possible."},
        ],
        "constraints": "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
        "hints": [
            {"level": 1, "content": "Use two pointers: left (buy) and right (sell)."},
            {"level": 2, "content": "Move left forward when prices[left] >= prices[right]."},
            {"level": 3, "content": "Track max profit = max(profit, right - left)."},
        ],
        "test_cases": [
            {"input": {"prices": [7, 1, 5, 3, 6, 4]}, "expected": 5},
            {"input": {"prices": [7, 6, 4, 3, 1]}, "expected": 0},
        ],
        "solution": "def maxProfit(prices):\n    l, r = 0, 1\n    max_p = 0\n    while r < len(prices):\n        if prices[l] < prices[r]:\n            max_p = max(max_p, prices[r] - prices[l])\n        else:\n            l = r\n        r += 1\n    return max_p",
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "description": (
            "Given a string `s`, find the length of the longest substring without repeating characters."
        ),
        "difficulty": "medium",
        "estimated_time_minutes": 25,
        "skill_tags": ["Sliding Window"],
        "companies": ["Amazon", "Bloomberg", "Facebook"],
        "examples": [
            {"input": 's = "abcabcbb"', "output": "3", "explanation": 'The answer is "abc", with length 3.'},
            {"input": 's = "bbbbb"', "output": "1", "explanation": 'The answer is "b", with length 1.'},
            {"input": 's = "pwwkew"', "output": "3", "explanation": '"wke" has length 3.'},
        ],
        "constraints": "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.",
        "hints": [
            {"level": 1, "content": "Use a sliding window with a set to track characters."},
            {"level": 2, "content": "Shrink the window from the left when a duplicate is found."},
        ],
        "test_cases": [
            {"input": {"s": "abcabcbb"}, "expected": 3},
            {"input": {"s": "bbbbb"}, "expected": 1},
            {"input": {"s": "pwwkew"}, "expected": 3},
        ],
        "solution": "def lengthOfLongestSubstring(s):\n    char_set = set()\n    l = 0\n    res = 0\n    for r in range(len(s)):\n        while s[r] in char_set:\n            char_set.remove(s[l])\n            l += 1\n        char_set.add(s[r])\n        res = max(res, r - l + 1)\n    return res",
    },
    {
        "title": "Valid Parentheses",
        "description": (
            "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, "
            "determine if the input string is valid.\n\nAn input string is valid if:\n"
            "1. Open brackets must be closed by the same type of brackets.\n"
            "2. Open brackets must be closed in the correct order.\n"
            "3. Every close bracket has a corresponding open bracket of the same type."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 15,
        "skill_tags": ["Stack"],
        "companies": ["Google", "Facebook", "Spotify"],
        "examples": [
            {"input": 's = "()"', "output": "true", "explanation": ""},
            {"input": 's = "()[]{}"', "output": "true", "explanation": ""},
            {"input": 's = "(]"', "output": "false", "explanation": ""},
        ],
        "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
        "hints": [
            {"level": 1, "content": "Use a stack. Push open brackets, pop when closing."},
            {"level": 2, "content": "Use a map: ')' -> '(', ']' -> '[', '}' -> '{'."},
        ],
        "test_cases": [
            {"input": {"s": "()"}, "expected": True},
            {"input": {"s": "()[]{}"}, "expected": True},
            {"input": {"s": "(]"}, "expected": False},
        ],
        "solution": "def isValid(s):\n    stack = []\n    close = {')': '(', ']': '[', '}': '{'}\n    for c in s:\n        if c in close:\n            if not stack or stack[-1] != close[c]:\n                return False\n            stack.pop()\n        else:\n            stack.append(c)\n    return not stack",
    },
    {
        "title": "Binary Search",
        "description": (
            "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, "
            "write a function to search `target` in `nums`. If `target` exists, then return its index. "
            "Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 15,
        "skill_tags": ["Binary Search"],
        "companies": ["Microsoft", "Apple"],
        "examples": [
            {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists at index 4."},
            {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "2 doesn't exist."},
        ],
        "constraints": "1 <= nums.length <= 10^4\nAll integers are unique.\nnums is sorted in ascending order.",
        "hints": [
            {"level": 1, "content": "Use left and right pointers, compute mid each iteration."},
            {"level": 2, "content": "Shrink the search space based on whether target < mid or > mid."},
        ],
        "test_cases": [
            {"input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 9}, "expected": 4},
            {"input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 2}, "expected": -1},
        ],
        "solution": "def search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        m = (l + r) // 2\n        if nums[m] == target: return m\n        elif nums[m] < target: l = m + 1\n        else: r = m - 1\n    return -1",
    },
    {
        "title": "Merge Two Sorted Lists",
        "description": (
            "You are given the heads of two sorted linked lists `list1` and `list2`.\n\n"
            "Merge the two lists into one sorted list. The list should be made by splicing together the nodes "
            "of the first two lists. Return the head of the merged linked list."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 20,
        "skill_tags": ["Linked List"],
        "companies": ["Amazon", "Microsoft", "Google"],
        "examples": [
            {"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]", "explanation": ""},
            {"input": "list1 = [], list2 = []", "output": "[]", "explanation": ""},
        ],
        "constraints": "The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100",
        "hints": [
            {"level": 1, "content": "Use a dummy node to simplify edge cases."},
            {"level": 2, "content": "Compare values and advance the pointer on the smaller side."},
        ],
        "test_cases": [
            {"input": {"list1": [1, 2, 4], "list2": [1, 3, 4]}, "expected": [1, 1, 2, 3, 4, 4]},
        ],
        "solution": "def mergeTwoLists(list1, list2):\n    dummy = ListNode()\n    cur = dummy\n    while list1 and list2:\n        if list1.val <= list2.val:\n            cur.next = list1; list1 = list1.next\n        else:\n            cur.next = list2; list2 = list2.next\n        cur = cur.next\n    cur.next = list1 or list2\n    return dummy.next",
    },
    {
        "title": "Invert Binary Tree",
        "description": (
            "Given the `root` of a binary tree, invert the tree, and return its root."
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 15,
        "skill_tags": ["Trees"],
        "companies": ["Google", "Uber", "Apple"],
        "examples": [
            {"input": "root = [4,2,7,1,3,6,9]", "output": "[4,7,2,9,6,3,1]", "explanation": ""},
        ],
        "constraints": "The number of nodes in the tree is in the range [0, 100].\n-100 <= Node.val <= 100",
        "hints": [
            {"level": 1, "content": "Recursively swap left and right subtrees."},
        ],
        "test_cases": [
            {"input": {"root": [4, 2, 7, 1, 3, 6, 9]}, "expected": [4, 7, 2, 9, 6, 3, 1]},
        ],
        "solution": "def invertTree(root):\n    if not root: return None\n    root.left, root.right = invertTree(root.right), invertTree(root.left)\n    return root",
    },
    {
        "title": "Climbing Stairs",
        "description": (
            "You are climbing a staircase. It takes `n` steps to reach the top.\n\n"
            "Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?"
        ),
        "difficulty": "easy",
        "estimated_time_minutes": 20,
        "skill_tags": ["Dynamic Programming"],
        "companies": ["Amazon", "Google", "Apple"],
        "examples": [
            {"input": "n = 2", "output": "2", "explanation": "1+1 or 2."},
            {"input": "n = 3", "output": "3", "explanation": "1+1+1, 1+2, or 2+1."},
        ],
        "constraints": "1 <= n <= 45",
        "hints": [
            {"level": 1, "content": "This is like Fibonacci — ways(n) = ways(n-1) + ways(n-2)."},
        ],
        "test_cases": [
            {"input": {"n": 2}, "expected": 2},
            {"input": {"n": 3}, "expected": 3},
            {"input": {"n": 10}, "expected": 89},
        ],
        "solution": "def climbStairs(n):\n    a, b = 1, 1\n    for _ in range(n - 1):\n        a, b = b, a + b\n    return b",
    },
    {
        "title": "3Sum",
        "description": (
            "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that "
            "`i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\n"
            "Notice that the solution set must not contain duplicate triplets."
        ),
        "difficulty": "medium",
        "estimated_time_minutes": 30,
        "skill_tags": ["Two Pointers"],
        "companies": ["Facebook", "Amazon", "Microsoft"],
        "examples": [
            {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]", "explanation": ""},
            {"input": "nums = [0,1,1]", "output": "[]", "explanation": ""},
        ],
        "constraints": "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
        "hints": [
            {"level": 1, "content": "Sort the array first. Fix one element and use two pointers for the rest."},
            {"level": 2, "content": "Skip duplicates for the fixed element and for the two pointers."},
        ],
        "test_cases": [
            {"input": {"nums": [-1, 0, 1, 2, -1, -4]}, "expected": [[-1, -1, 2], [-1, 0, 1]]},
        ],
        "solution": "def threeSum(nums):\n    nums.sort()\n    res = []\n    for i, a in enumerate(nums):\n        if i > 0 and a == nums[i-1]: continue\n        l, r = i+1, len(nums)-1\n        while l < r:\n            s = a + nums[l] + nums[r]\n            if s > 0: r -= 1\n            elif s < 0: l += 1\n            else:\n                res.append([a, nums[l], nums[r]])\n                l += 1\n                while nums[l] == nums[l-1] and l < r: l += 1\n    return res",
    },
    {
        "title": "Word Search",
        "description": (
            "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists "
            "in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where "
            "adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once."
        ),
        "difficulty": "medium",
        "estimated_time_minutes": 35,
        "skill_tags": ["Graphs"],
        "companies": ["Facebook", "Amazon"],
        "examples": [
            {"input": 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
             "output": "true", "explanation": ""},
            {"input": 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
             "output": "true", "explanation": ""},
        ],
        "constraints": "m == board.length\nn = board[i].length\n1 <= m, n <= 6\n1 <= word.length <= 15",
        "hints": [
            {"level": 1, "content": "Use DFS + backtracking. Mark visited cells temporarily."},
            {"level": 2, "content": "Restore the cell value after DFS returns."},
        ],
        "test_cases": [
            {"input": {"board": [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "word": "ABCCED"}, "expected": True},
        ],
        "solution": "def exist(board, word):\n    rows, cols = len(board), len(board[0])\n    def dfs(r, c, i):\n        if i == len(word): return True\n        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]: return False\n        tmp, board[r][c] = board[r][c], '#'\n        found = dfs(r+1,c,i+1) or dfs(r-1,c,i+1) or dfs(r,c+1,i+1) or dfs(r,c-1,i+1)\n        board[r][c] = tmp\n        return found\n    for r in range(rows):\n        for c in range(cols):\n            if dfs(r, c, 0): return True\n    return False",
    },
]

BADGES = [
    {"name": "First Blood", "description": "Solve your first challenge", "rarity": "common",
     "xp_reward": 100, "requirements": {"challenges_solved": 1}},
    {"name": "Hash Hacker", "description": "Solve 5 Array & Hashing problems", "rarity": "common",
     "xp_reward": 200, "requirements": {"skill": "Arrays & Hashing", "count": 5}},
    {"name": "Streak Warrior", "description": "Maintain a 7-day learning streak", "rarity": "rare",
     "xp_reward": 500, "requirements": {"streak_days": 7}},
    {"name": "Speed Demon", "description": "Solve a hard problem in under 15 minutes", "rarity": "rare",
     "xp_reward": 750, "requirements": {"difficulty": "hard", "time_minutes": 15}},
    {"name": "Socratic Scholar", "description": "Complete 20 AI tutor sessions", "rarity": "epic",
     "xp_reward": 1000, "requirements": {"tutor_sessions": 20}},
    {"name": "Algorithm Artisan", "description": "Reach 80% mastery in 5 different skills", "rarity": "epic",
     "xp_reward": 2000, "requirements": {"skills_at_80pct": 5}},
    {"name": "Legendary Coder", "description": "Solve 100 problems with explanation", "rarity": "legendary",
     "xp_reward": 5000, "requirements": {"problems_with_explanation": 100}},
    {"name": "Night Owl", "description": "Solve 3 problems between midnight and 4am", "rarity": "rare",
     "xp_reward": 300, "requirements": {"late_night_solves": 3}},
]


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as db:
        # ── Check if already seeded ──────────────────────────────────────
        existing = await db.execute(
            select(user.User).where(user.User.email == DEMO_EMAIL)
        )
        if existing.scalar_one_or_none():
            print("Already seeded — skipping.")
            return

        # ── Skills ────────────────────────────────────────────────────────
        skill_map: dict[str, skill.Skill] = {}
        for s in SKILLS:
            obj = skill.Skill(id=uuid.uuid4(), **s)
            db.add(obj)
            skill_map[s["name"]] = obj
        await db.flush()

        # ── Skill Prerequisites ────────────────────────────────────────────
        for child_name, parent_name in PREREQUISITES:
            db.add(skill.SkillPrerequisite(
                skill_id=skill_map[child_name].id,
                prerequisite_id=skill_map[parent_name].id,
                required=True,
            ))

        # ── Challenges ────────────────────────────────────────────────────
        challenge_list: list[challenge.Challenge] = []
        for c in CHALLENGES:
            obj = challenge.Challenge(
                id=uuid.uuid4(),
                title=c["title"],
                description=c["description"],
                difficulty=c["difficulty"],
                estimated_time_minutes=c["estimated_time_minutes"],
                skill_tags=c["skill_tags"],
                companies=c["companies"],
                examples=c["examples"],
                constraints=c["constraints"],
                hints=c["hints"],
                test_cases=c["test_cases"],
                solution=c["solution"],
                is_generated=False,
            )
            db.add(obj)
            challenge_list.append(obj)
        await db.flush()

        # ── Badges ────────────────────────────────────────────────────────
        badge_list: list[badge.Badge] = []
        for b in BADGES:
            obj = badge.Badge(id=uuid.uuid4(), **b)
            db.add(obj)
            badge_list.append(obj)
        await db.flush()

        # ── Demo User ─────────────────────────────────────────────────────
        demo_user = user.User(
            id=uuid.uuid4(),
            email=DEMO_EMAIL,
            password_hash=pwd_ctx.hash(DEMO_PASSWORD),
            first_name="Alex",
            last_name="Chen",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=45),
        )
        db.add(demo_user)
        await db.flush()

        # User preferences
        db.add(user.UserPreferences(
            user_id=demo_user.id,
            theme="dark",
            daily_xp_goal=500,
            notifications_enabled=True,
        ))

        # User level (level 7, 3400 XP)
        db.add(user.UserLevel(
            user_id=demo_user.id,
            current_level=7,
            current_xp=3400,
            total_xp_earned=3400,
            last_level_up=datetime.utcnow() - timedelta(days=3),
        ))

        # User streak (12-day streak)
        today = date.today()
        db.add(user.UserStreak(
            user_id=demo_user.id,
            current_streak=12,
            longest_streak=21,
            streak_start_date=today - timedelta(days=11),
            last_activity_date=today,
        ))

        # ── XP Ledger (45 days of activity) ──────────────────────────────
        xp_reasons = [
            ("challenge_solve", 150), ("challenge_solve", 100), ("daily_login", 50),
            ("challenge_solve", 200), ("tutor_session", 75), ("review_complete", 25),
        ]
        for day_offset in range(45, 0, -1):
            if day_offset % 3 == 0:
                continue  # simulate some days missed
            for reason, xp in xp_reasons[:3]:
                db.add(user.UserXPLedger(
                    id=uuid.uuid4(),
                    user_id=demo_user.id,
                    xp_amount=xp,
                    reason=reason,
                    created_at=datetime.utcnow() - timedelta(days=day_offset, hours=2),
                ))

        # ── Skill Mastery ─────────────────────────────────────────────────
        mastery_data = {
            "Arrays & Hashing": (0.92, True, 14),
            "Two Pointers": (0.78, True, 8),
            "Sliding Window": (0.65, True, 5),
            "Stack": (0.70, True, 6),
            "Binary Search": (0.55, True, 4),
            "Linked List": (0.40, True, 3),
            "Trees": (0.25, True, 2),
            "Graphs": (0.10, False, 1),
            "Dynamic Programming": (0.05, False, 0),
            "Heap / Priority Queue": (0.0, False, 0),
            "Tries": (0.0, False, 0),
            "Greedy": (0.0, False, 0),
        }
        for skill_name, (level, unlocked, solved) in mastery_data.items():
            if skill_name in skill_map:
                db.add(skill.UserSkillMastery(
                    user_id=demo_user.id,
                    skill_id=skill_map[skill_name].id,
                    mastery_level=level,
                    is_unlocked=unlocked,
                    problems_solved=solved,
                    last_practiced=datetime.utcnow() - timedelta(days=1) if solved else None,
                ))

        # ── Challenge Attempts (history) ──────────────────────────────────
        attempt_data = [
            (0, "success", 0.92, 200, 1),
            (1, "success", 0.85, 150, 1),
            (2, "success", 0.88, 150, 1),
            (3, "success", 0.75, 150, 1),
            (4, "success", 0.70, 100, 2),
            (5, "success", 0.82, 150, 1),
            (6, "success", 0.78, 100, 1),
            (7, "success", 0.65, 100, 2),
            (8, "success", 0.60, 100, 2),
            (9, "success", 0.72, 100, 1),
        ]
        for idx, status, mastery, xp, attempt_num in attempt_data:
            if idx < len(challenge_list):
                db.add(challenge.ChallengeAttempt(
                    id=uuid.uuid4(),
                    user_id=demo_user.id,
                    challenge_id=challenge_list[idx].id,
                    code=challenge_list[idx].solution or "# solution here",
                    language="python",
                    status=status,
                    output="All test cases passed!",
                    test_cases_passed=3,
                    test_cases_total=3,
                    mastery_score=mastery,
                    xp_earned=xp,
                    attempt_number=attempt_num,
                    created_at=datetime.utcnow() - timedelta(days=40 - idx * 3),
                ))

        # ── Review Cards (SM-2 data) ───────────────────────────────────────
        review_card_data = [
            # (challenge_idx, interval, ease, reps, days_until_due)
            (0, 21, 2.8, 5, 5),   # mastered, due in 5 days
            (1, 14, 2.6, 4, 2),   # good, due in 2 days
            (2, 7,  2.4, 3, 0),   # due TODAY
            (3, 6,  2.5, 2, 0),   # due TODAY
            (4, 1,  2.3, 1, 0),   # due TODAY
            (5, 3,  2.2, 2, 1),   # due tomorrow
            (6, 1,  2.0, 0, 0),   # new card, due TODAY
            (7, 1,  2.5, 0, 3),   # not yet due
            (8, 1,  2.5, 0, 7),   # not yet due
        ]
        for cidx, interval, ease, reps, days_until in review_card_data:
            if cidx < len(challenge_list):
                due = today + timedelta(days=days_until)
                db.add(review_card.ReviewCard(
                    user_id=demo_user.id,
                    challenge_id=challenge_list[cidx].id,
                    interval=interval,
                    ease_factor=ease,
                    repetitions=reps,
                    next_review_date=due,
                    last_reviewed=datetime.utcnow() - timedelta(days=interval),
                    difficulty_rating="medium",
                    created_at=datetime.utcnow() - timedelta(days=30),
                ))

        # ── Badge Progress ────────────────────────────────────────────────
        badge_progress = [
            (0, "earned", 100, datetime.utcnow() - timedelta(days=40)),   # First Blood
            (1, "earned", 100, datetime.utcnow() - timedelta(days=30)),   # Hash Hacker
            (2, "earned", 100, datetime.utcnow() - timedelta(days=20)),   # Streak Warrior
            (3, "in_progress", 60, None),   # Speed Demon
            (4, "in_progress", 35, None),   # Socratic Scholar
            (5, "in_progress", 40, None),   # Algorithm Artisan
            (6, "locked", 0, None),         # Legendary Coder
            (7, "in_progress", 66, None),   # Night Owl
        ]
        for bidx, status, pct, earned_at in badge_progress:
            if bidx < len(badge_list):
                db.add(badge.UserBadgeProgress(
                    user_id=demo_user.id,
                    badge_id=badge_list[bidx].id,
                    status=status,
                    completion_percentage=pct,
                    earned_at=earned_at,
                    is_masterpiece=(bidx == 1),
                ))

        # ── Tutor Sessions ────────────────────────────────────────────────
        for i in range(5):
            session = tutor_session.TutorSession(
                id=uuid.uuid4(),
                user_id=demo_user.id,
                challenge_id=challenge_list[i].id,
                started_at=datetime.utcnow() - timedelta(days=10 - i * 2),
                ended_at=datetime.utcnow() - timedelta(days=10 - i * 2, hours=-1),
                conversation_turns=4 + i,
                detected_misconceptions=["off-by-one errors", "forgetting edge cases"] if i % 2 == 0 else [],
                inferred_mastery_level=0.6 + i * 0.05,
            )
            db.add(session)
            await db.flush()

            for turn_num in range(1, 4):
                db.add(tutor_session.ConversationTurn(
                    id=uuid.uuid4(),
                    session_id=session.id,
                    turn_number=turn_num,
                    student_message=f"I'm not sure how to handle the edge case when the input is empty.",
                    tutor_response=f"Great question! What do you think would happen if we passed an empty array? What does your current code return?",
                    tutor_intent="deepen",
                    mastery_signal=0.5 + turn_num * 0.1,
                    created_at=datetime.utcnow() - timedelta(days=10 - i * 2, minutes=-turn_num * 5),
                ))

        await db.commit()
        print(f"✓ Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print(f"✓ {len(SKILLS)} skills, {len(CHALLENGES)} challenges, {len(BADGES)} badges")
        print(f"✓ 4 review cards due today for spaced repetition demo")
        print(f"✓ 45-day XP history for heatmap")


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    asyncio.run(seed())
