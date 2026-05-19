# LearnAI — AI-Powered Coding Education Platform

> A fully interactive coding education platform with adaptive learning, AI tutoring, spaced repetition, internship simulations, and gamification.

**Live demo:** https://ai-learning-platform-gold.vercel.app

---

## What is LearnAI?

LearnAI is a demo-grade coding education platform built to showcase how AI can transform the way developers learn data structures, algorithms, and software engineering. It combines structured courses, a live code editor, spaced repetition flashcards, an AI study assistant, and realistic internship simulations — all in one cohesive experience.

---

## Features

### Adaptive Onboarding
- New users complete a short adaptive quiz (easy → medium → hard) that detects their current level
- AI generates a personalised 2-sentence insight based on quiz performance
- Goal and timeline selection to customise the learning path

### Courses & Lessons
- Structured DSA courses: Arrays & Hashing, Two Pointers & Sliding Window, and more
- Rich lesson pages with prose explanations, code examples, key takeaways, and expandable hints
- Two-column layout: lesson content on the left, sticky AI study panel on the right
- Mark-complete button awards XP and fires a full-screen confetti celebration

### Challenge Workspace
- Monaco code editor (VS Code engine) with syntax highlighting
- Submit code and get instant pass/fail feedback with runtime + memory stats
- AI tutor reacts to your submission using the Socratic method — hints, not answers
- Passing a challenge fires confetti and awards XP

### AI Study Assistant
- **Chat mode:** Ask anything about DSA, CS concepts, platform features, or interview prep
- **Voice mode:** Hands-free study using the Web Speech API (microphone input + browser TTS)
- Context-aware: the assistant knows which page you're on and tailors suggestions accordingly
- Guardrails: off-topic questions, direct solution requests, and harmful prompts are all blocked
- Lesson pages have a dedicated inline AI panel so you never leave the reading flow
- Powered by **Groq (Llama 3.3-70b-versatile)** — free, fast, and unlimited for demo use

### Spaced Repetition Review Queue
- SM-2 algorithm: cards are rated 0–5 and intervals adapt automatically
- Cards generated from course content and uploaded study notes
- Dashboard shows today's due count and streak

### Knowledge Hub
- Upload `.txt` or `.md` study documents
- AI extracts up to 12 key CS concepts and writes an ELI5 summary
- One-click push to add extracted concepts as flashcards into the review queue
- Related courses are suggested automatically based on extracted concepts

### Internship Simulations
- Realistic 3-day sprint simulations set inside a Series B fintech startup
- **Backend Systems Engineering track** (always unlocked for demo)
  - Day 1: Production outage — fix an O(n²) loop under SLA pressure
  - Day 2: Feature build — design and implement a rate limiter
  - Day 3: Architecture review — present a system design write-up
- Three AI colleague agents (Tech Lead, PM, SRE) each react to your submission in character
- Agents are powered by Groq with distinct personalities (demanding, helpful, non-technical)

### Gamification
- XP system with levels (XP thresholds scale per level)
- Streak tracking (days active in a row)
- `⚡ +XP` toast notification slides in from top-right on every XP award
- Full-screen canvas confetti fires from both screen edges on lesson complete or challenge pass
- Weekly XP leaderboard (league system)
- Daily XP quest tracker

### Productivity
- Pomodoro timer built into every lesson and challenge page
- Floating popover design with click-outside to close
- Session stats tracked for the weekly report

### Weekly Report
- Total focus hours, challenges solved, flashcards reviewed
- Retention rate trends and mastery breakdown by skill
- AI-curated target skill list for the coming week

### Skill Tree
- Interactive D3 force graph showing skill dependencies
- Green = mastered, amber = in-progress, gray = locked
- Nodes unlock based on completed challenges and lessons

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v3 + Radix UI primitives |
| Routing | React Router v6 |
| State management | Zustand with `persist` middleware (localStorage) |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Charts | Recharts |
| Skill graph | D3 v7 |
| Animations | Framer Motion + custom canvas confetti |
| AI provider | Groq API (`llama-3.3-70b-versatile`) |
| Voice input | Web Speech API (`SpeechRecognition`) |
| Voice output | Browser TTS (`window.speechSynthesis`) |
| Deployment | Vercel (SPA with catch-all rewrite) |

---

## Project Structure

```
frontend/
└── src/
    ├── agents/
    │   ├── masteryAgent.ts          # P_m mastery score calculation
    │   ├── recommendationAgent.ts   # Next challenge recommendation logic
    │   └── tutorAgent.ts            # Socratic tutor response generation
    ├── components/
    │   ├── ai-assistant/
    │   │   └── AIAssistant.tsx      # Global chat + voice overlay
    │   ├── dashboard/
    │   │   ├── Dashboard.tsx        # Main dashboard view
    │   │   └── ReviewQueue.tsx      # Spaced repetition queue widget
    │   ├── productivity/
    │   │   └── PomodoroWidget.tsx   # Floating Pomodoro timer
    │   ├── skill-tree/
    │   │   └── SkillTree.tsx        # D3 skill dependency graph
    │   └── workspace/
    │       ├── ChallengeWorkspace.tsx  # Monaco editor + submission logic
    │       └── SessionRecap.tsx        # Post-challenge performance recap
    ├── data/
    │   └── sample.ts                # All demo courses, lessons, challenges
    ├── hooks/
    │   └── useVoice.ts              # Web Speech API hook
    ├── lib/
    │   ├── confetti.ts              # Canvas confetti + XP toast
    │   └── utils.ts                 # cn() and shared helpers
    ├── pages/
    │   ├── ChallengesPage.tsx       # Challenge library with filters
    │   ├── CoursesPage.tsx          # Course browser + detail view
    │   ├── InternshipPage.tsx       # Internship track selection
    │   ├── InternshipWorkspacePage.tsx  # 3-day sprint workspace
    │   ├── KnowledgeHubPage.tsx     # Document upload + AI extraction
    │   ├── LessonPage.tsx           # Lesson reader + inline AI panel
    │   ├── OnboardingPage.tsx       # Adaptive quiz onboarding
    │   ├── QuizPage.tsx             # Knowledge quiz
    │   └── WeeklyReportPage.tsx     # Weekly analytics report
    ├── stores/
    │   ├── learnerStore.ts          # XP, level, streaks, flashcards
    │   ├── productivityStore.ts     # Pomodoro session tracking
    │   └── store.ts                 # Progress, challenges, onboarding
    └── App.tsx                      # Routes + top nav bar
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A free [Groq API key](https://console.groq.com) (for AI features)

### Local development

```bash
# Clone the repo
git clone https://github.com/RohanMulay1/ai-learning-platform.git
cd ai-learning-platform/frontend

# Install dependencies
npm install

# Create your env file
echo "VITE_GROQ_API_KEY=your_groq_key_here" > .env

# Start the dev server
npm run dev
```

Open `http://localhost:5173`.

### Production build

```bash
npm run build
# Output is in dist/
```

---

## Deployment (Vercel)

The repo includes a `vercel.json` at `frontend/vercel.json` that handles SPA routing:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Required environment variable in Vercel:**

| Variable | Description |
|---|---|
| `VITE_GROQ_API_KEY` | Your Groq API key — set under Settings → Environment Variables |

> VITE_ variables are baked into the bundle at build time. Always redeploy after adding or changing them.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GROQ_API_KEY` | Yes | Groq API key for all AI features (chat, voice, agents, extraction) |

---

## AI Architecture

All AI calls go directly from the browser to Groq's API (no backend needed):

```
Browser → Groq API (api.groq.com/openai/v1/chat/completions)
         Model: llama-3.3-70b-versatile
```

**AI touch-points:**
| Feature | Prompt type | Max tokens |
|---|---|---|
| Study chat assistant | Multi-turn with system prompt | 450 |
| Lesson AI panel | Multi-turn with lesson context | 400 |
| Internship AI agents | Single-turn, character roleplay | 130 |
| Knowledge Hub extraction | Single-turn, JSON output | 600 |
| Onboarding insight | Single-turn, 2-sentence summary | 90 |

---

## Demo Flow (for presentations)

1. **Landing** — visit the live URL as a new user to see the onboarding quiz
2. **Dashboard** — XP bar, streak, recommended next challenge, review queue
3. **Courses** → Arrays & Hashing Mastery → open "Group Anagrams" lesson → read content, use the AI panel, mark complete (confetti + XP toast)
4. **Challenges** → pick any challenge → write or paste code → submit → see AI tutor react
5. **Internship** → Backend Systems Engineering → Day 1 (code is pre-filled) → submit → watch three AI colleagues respond in character
6. **Knowledge Hub** → upload any `.txt` CS notes → AI extracts concepts + ELI5
7. **AI Chat** → ask anything about DSA from any page — try asking something off-topic to see guardrails

---

## License

MIT
