import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useVoice } from "../../hooks/useVoice";

/* ── Page context ─────────────────────────────────────────────── */

function getPageContext(pathname: string): { label: string; context: string } {
  if (pathname.startsWith("/dashboard"))
    return { label: "Dashboard", context: "The learner is on the main learning dashboard. They see their XP, level, recommended next challenge, today's spaced repetition review queue, and quick navigation to all platform features. Help them understand their progress and decide what to do next." };
  if (/^\/challenge\//.test(pathname))
    return { label: "Challenge Workspace", context: "The learner is actively solving a coding challenge in a Monaco code editor. They have access to the problem statement, examples, constraints, and a hint system. Use the Socratic method — give conceptual hints and explain the underlying pattern. NEVER write or complete the solution code for them." };
  if (pathname.startsWith("/challenges"))
    return { label: "Challenges", context: "The learner is browsing the challenges library, filterable by difficulty (easy/medium/hard) and skill tag (Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Dynamic Programming). Help them pick the right challenge for their current level." };
  if (pathname.startsWith("/courses")) {
    const isNotes = typeof window !== "undefined" && window.location.search.includes("tab=notes");
    if (isNotes)
      return { label: "My Notes", context: "The learner is in the My Notes tab of the Learn hub. They can upload .txt or .md study documents; the AI (Gemini) extracts key CS concepts, generates ELI5 summaries, and suggests related courses. They can push extracted concepts as flashcards into their spaced repetition review queue. Help them get the most from their notes." };
    return { label: "Learn", context: "The learner is viewing the unified Learn hub with Courses and My Notes tabs. Courses cover Arrays & Hashing, Two Pointers & Sliding Window, and advanced DSA topics. The My Notes tab lets them upload study documents for AI concept extraction. Help them choose what to study next or how to use their uploaded notes." };
  }
  if (pathname.startsWith("/lesson"))
    return { label: "Lesson", context: "The learner is studying a lesson with explanations, examples, and interactive content. Help them understand the concepts being taught and answer clarifying questions." };
  if (pathname.startsWith("/quiz"))
    return { label: "Quiz", context: "The learner is taking a knowledge quiz. Help them understand concepts if they're confused AFTER submitting an answer — do not give answers before they attempt." };
  if (pathname.startsWith("/review"))
    return { label: "Review Queue", context: "The learner is reviewing flashcards using the SM-2 spaced repetition algorithm. Cards are rated 0–5 (0=forgot, 5=perfect). Explain how to rate honestly, how intervals adapt, and why spaced repetition works for long-term retention." };
  if (pathname.startsWith("/knowledge"))
    return { label: "Knowledge Hub", context: "The learner can upload study documents (.txt, .md) to extract key concepts via AI, generate ELI5 summaries, and push flashcards into their spaced repetition review queue. Help them get the most out of their study materials." };
  if (pathname.startsWith("/reports"))
    return { label: "Weekly Report", context: "The learner is viewing their weekly analytics: total focus hours (Pomodoro), challenges solved, flashcards reviewed, retention rate, mastery trends, and an AI-curated target skill list. Help them interpret their data and plan next steps." };
  if (pathname.startsWith("/internship"))
    return { label: "Internship Simulations", context: "The learner is exploring AI simulation internship tracks (Backend Engineering, ML Feature Engineering, Distributed Systems). Each is a gated 3-day simulated sprint with AI colleague agents (Tech Lead, PM, SRE). Explain the requirements, what each track teaches, and how to unlock them." };
  if (pathname.startsWith("/skills"))
    return { label: "Skill Tree", context: "The learner is viewing an interactive D3 skill dependency graph. Green nodes are mastered, amber are in-progress, gray are locked. Nodes unlock based on prerequisites. Help them understand which skills to prioritize and what unlocks what." };
  if (pathname.startsWith("/recap"))
    return { label: "Session Recap", context: "The learner just finished a coding challenge and is viewing their session recap: mastery score (0–100), breakdown across time efficiency, explanation depth, first-try accuracy, hint independence, and code quality. AI insights and a recommended next challenge are shown. Help them understand their performance." };
  return { label: "LearnAI", context: "The learner is using LearnAI, an AI-powered coding education platform." };
}

function getSuggestions(pathname: string): string[] {
  if (pathname.startsWith("/dashboard"))   return ["What should I study next?", "How does XP and leveling work?", "How does the review queue work?"];
  if (/^\/challenge\//.test(pathname))     return ["I'm stuck — give me a hint", "What pattern does this problem use?", "How do I analyze time complexity here?"];
  if (pathname.startsWith("/challenges"))  return ["Which challenge should I start with?", "What is the Two Pointers pattern?", "Difference between sliding window and two pointers?"];
  if (pathname.startsWith("/courses")) {
    const isNotes = typeof window !== "undefined" && window.location.search.includes("tab=notes");
    if (isNotes) return ["How does AI concept extraction work?", "What file types can I upload?", "How are flashcards generated from my notes?"];
    return ["Which course should I start?", "What is Arrays & Hashing used for?", "Suggest a learning path for interviews"];
  }
  if (pathname.startsWith("/review"))      return ["How does spaced repetition work?", "How should I honestly rate my cards?", "What is the SM-2 algorithm?"];
  if (pathname.startsWith("/knowledge"))   return ["How does concept extraction work?", "What file types can I upload?", "How are flashcards generated from my notes?"];
  if (pathname.startsWith("/reports"))     return ["What does my retention rate mean?", "What should I focus on this week?", "Explain the AI target list"];
  if (pathname.startsWith("/internship"))  return ["How do internship tracks work?", "How do I unlock the Backend track?", "What skills does the ML track need?"];
  if (pathname.startsWith("/skills"))      return ["What does my mastery % mean?", "Which skill should I unlock next?", "How are skill prerequisites determined?"];
  if (pathname.startsWith("/recap"))       return ["What does my mastery score mean?", "How is the score calculated?", "What should I work on next?"];
  return ["How does LearnAI work?", "What is spaced repetition?", "How do I improve my mastery score?"];
}

/* ── System prompt ────────────────────────────────────────────── */

function buildSystemPrompt(context: string): string {
  return `You are LearnAI's AI Study Assistant — a friendly, encouraging Socratic tutor embedded in a coding education platform.

YOUR PURPOSE:
Help learners understand programming concepts, navigate platform features, interpret their learning analytics, and develop effective study habits.

TOPIC SCOPE (only answer questions in these areas):
- Algorithms and data structures (arrays, hashing, two pointers, sliding window, stack, binary search, trees, graphs, dynamic programming, etc.)
- CS concepts and computational complexity (Big O, time/space analysis)
- The LearnAI platform features (challenges, courses, review queue, skill tree, knowledge hub, reports, internships, spaced repetition, Pomodoro)
- Learning strategies, study techniques, and motivation
- Coding interview preparation

STRICT GUARDRAILS:
1. OFF-TOPIC: If asked about anything outside the above scope (politics, general chat, other subjects, personal advice unrelated to learning), respond: "I'm your coding study assistant — I can only help with learning topics. What are you working on today?"
2. NO DIRECT SOLUTIONS: For active coding challenges, give Socratic hints that guide thinking. Explain the pattern or approach conceptually. NEVER write or complete the solution code.
3. CONCISE: Keep responses to 2-4 sentences max. Use bullet points for lists. Only write more if explaining a complex algorithm.
4. ENCOURAGING: Be warm and motivating. Learning to code is hard — acknowledge effort and celebrate progress.
5. SAFETY: For any harmful, inappropriate, or manipulative requests, refuse politely and redirect to the learning context.

CURRENT PAGE CONTEXT:
${context}

Be specifically helpful about what the user is currently working on in this context.`;
}

/* ── Gemini API ───────────────────────────────────────────────── */

interface Message { role: "user" | "assistant"; content: string; }

const GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? "") as string;

async function callGemini(messages: Message[], systemPrompt: string): Promise<string> {
  if (!GEMINI_KEY) throw new Error("NO_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 450, temperature: 0.7 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error("NO_KEY");
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

/* ── Browser TTS ──────────────────────────────────────────────── */

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1;
  // prefer a natural-sounding English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /en-(US|GB)/i.test(v.lang) && v.localService);
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

/* ── Shared send logic (used by both panels) ──────────────────── */

type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

/* ── Chat Panel ───────────────────────────────────────────────── */

interface ChatPanelProps {
  label: string;
  suggestions: string[];
  messages: Message[];
  loading: boolean;
  errorKind: "no_key" | "network" | null;
  onSendText: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
  speakingIdx: number | null;
  onReplay: (idx: number, text: string) => void;
  onStopReplay: () => void;
}

function ChatPanel({
  label, suggestions, messages, loading, errorKind,
  onSendText, onClear, onClose, speakingIdx, onReplay, onStopReplay,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const { isListening, startListening, stopListening } = useVoice({
    onTranscript: (text) => { setInput(text); setTimeout(() => onSendText(text), 80); },
    onError: () => {},
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const send = () => { if (input.trim() && !loading) { onSendText(input.trim()); setInput(""); } };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="w-[340px] h-[500px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#2EC866] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 leading-none">Study Chat</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button onClick={onClear} title="Clear chat"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scrollbar-hide">
        {messages.length === 0 && !errorKind && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] text-gray-400 text-center">
              Ask anything about <span className="font-semibold text-gray-600">{label}</span>
            </p>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => onSendText(s)}
                className="text-left text-[11px] px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-[#2EC866]/50 hover:bg-[#D1FAE5]/30 text-gray-600 transition-colors leading-snug">
                {s}
              </button>
            ))}
          </div>
        )}

        {errorKind === "no_key" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-800 mb-1.5">API Key Not Configured</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_GEMINI_API_KEY</code> to your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> file.
            </p>
          </div>
        )}
        {errorKind === "network" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] text-red-600">Couldn't reach the AI — check your connection and try again.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#2EC866] text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-[230px]">
              <div className={cn(
                "text-[11px] px-3 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap",
                m.role === "user" ? "bg-[#2EC866] text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
              )}>
                {m.content}
              </div>
              {m.role === "assistant" && (
                <button
                  onClick={() => speakingIdx === i ? onStopReplay() : onReplay(i, m.content)}
                  className="self-start flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#2EC866] transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {speakingIdx === i ? "stop_circle" : "play_circle"}
                  </span>
                  {speakingIdx === i ? "Stop" : "Listen"}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#2EC866] text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(d => (
                <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <button
          onClick={() => isListening ? stopListening() : startListening()}
          title={isListening ? "Stop listening" : "Speak"}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isListening ? "mic" : "mic_none"}
          </span>
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isListening ? "Listening…" : "Type your question…"}
          disabled={loading || isListening}
          className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2EC866]/60 focus:ring-2 focus:ring-[#2EC866]/10 text-gray-800 placeholder-gray-400 disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading || isListening}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            input.trim() && !loading && !isListening
              ? "bg-[#2EC866] hover:bg-[#1EA34E] text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
        </button>
      </div>
    </div>
  );
}

/* ── Voice Panel ──────────────────────────────────────────────── */

interface VoicePanelProps {
  label: string;
  loading: boolean;
  errorKind: "no_key" | "network" | null;
  lastReply: string | null;
  phase: VoicePhase;
  onMicToggle: () => void;
  onStopSpeaking: () => void;
  onClose: () => void;
  onClear: () => void;
  hasHistory: boolean;
}

function VoicePanel({
  label, loading, errorKind, lastReply, phase,
  onMicToggle, onStopSpeaking, onClose, onClear, hasHistory,
}: VoicePanelProps) {
  const phaseLabel: Record<VoicePhase, string> = {
    idle:      "Tap the mic to speak",
    listening: "Listening…",
    thinking:  "Thinking…",
    speaking:  "Speaking…",
  };

  const micActive = phase === "listening";
  const busy      = phase === "thinking" || loading;

  return (
    <div className="w-[300px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-indigo-500 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 leading-none">Voice Assistant</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {hasHistory && (
            <button onClick={onClear} title="Clear history"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </div>

      {/* Mic area */}
      <div className="flex flex-col items-center justify-center py-8 px-6 gap-5">

        {/* Animated mic button with ripple rings */}
        <div className="relative flex items-center justify-center">
          {/* Ripple rings — only when listening */}
          {micActive && [1, 2, 3].map(n => (
            <span
              key={n}
              className="absolute rounded-full border-2 border-indigo-400 opacity-0"
              style={{
                width: 72 + n * 24,
                height: 72 + n * 24,
                animation: `voiceRipple 1.6s ease-out ${n * 0.3}s infinite`,
              }}
            />
          ))}
          <button
            onClick={busy ? undefined : onMicToggle}
            disabled={busy}
            className={cn(
              "w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all shadow-lg",
              micActive
                ? "bg-red-500 text-white scale-110"
                : busy
                  ? "bg-indigo-100 text-indigo-300 cursor-wait"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white active:scale-95"
            )}
          >
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {micActive ? "mic" : "mic_none"}
            </span>
          </button>
        </div>

        {/* Phase label */}
        <p className={cn(
          "text-xs font-semibold text-center",
          micActive ? "text-red-500" : busy ? "text-indigo-500" : "text-gray-400"
        )}>
          {phaseLabel[phase]}
        </p>

        {/* Error states */}
        {errorKind === "no_key" && (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-bold text-amber-800 mb-1">API Key Not Configured</p>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              Add <code className="bg-amber-100 px-1 rounded font-mono">VITE_GEMINI_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded font-mono">.env</code> file.
            </p>
          </div>
        )}
        {errorKind === "network" && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] text-red-600">Connection error — check your network and try again.</p>
          </div>
        )}

        {/* Last AI reply */}
        {lastReply && (
          <div className="w-full rounded-xl bg-indigo-50 border border-indigo-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Response</p>
              {phase === "speaking" ? (
                <button onClick={onStopSpeaking}
                  className="text-[10px] text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5 transition-colors">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>stop_circle</span>
                  Stop
                </button>
              ) : (
                <button onClick={() => speak(lastReply)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5 transition-colors">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  Replay
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">{lastReply}</p>
          </div>
        )}

        {!lastReply && !errorKind && (
          <p className="text-[10px] text-gray-300 text-center">Responses will be read aloud automatically</p>
        )}
      </div>
    </div>
  );
}

/* ── Ripple keyframes injected once ───────────────────────────── */
const RIPPLE_STYLE = `@keyframes voiceRipple {
  0%   { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}`;

let rippleInjected = false;
function injectRipple() {
  if (rippleInjected) return;
  const s = document.createElement("style");
  s.textContent = RIPPLE_STYLE;
  document.head.appendChild(s);
  rippleInjected = true;
}

/* ── Root component ───────────────────────────────────────────── */

export function AIAssistant() {
  const location = useLocation();

  const [chatOpen,  setChatOpen]  = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Shared message history (both panels talk to the same assistant)
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [errorKind,  setErrorKind]  = useState<"no_key" | "network" | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  // Voice-panel state
  const [voicePhase,  setVoicePhase]  = useState<VoicePhase>("idle");
  const [lastReply,   setLastReply]   = useState<string | null>(null);

  const { label, context } = getPageContext(location.pathname);
  const systemPrompt = buildSystemPrompt(context);
  const suggestions  = getSuggestions(location.pathname);

  useEffect(() => { injectRipple(); }, []);

  // Voice STT for the dedicated voice panel
  const { isListening, startListening, stopListening } = useVoice({
    onTranscript: (text) => {
      setVoicePhase("thinking");
      sendText(text, true);
    },
    onError: () => { setVoicePhase("idle"); setErrorKind("network"); },
  });

  // Keep voicePhase in sync with listening state
  useEffect(() => {
    if (isListening) setVoicePhase("listening");
  }, [isListening]);

  // Reset on navigation
  useEffect(() => {
    setMessages([]);
    setErrorKind(null);
    setLastReply(null);
    setVoicePhase("idle");
    stopSpeaking();
  }, [location.pathname]);

  // Close both panels when navigating
  useEffect(() => {
    setChatOpen(false);
    setVoiceOpen(false);
  }, [location.pathname]);

  // Shared send function; voiceMode=true → auto-TTS + update lastReply
  const sendText = useCallback(async (content: string, voiceMode = false) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    setErrorKind(null);

    try {
      const reply = await callGemini(history, systemPrompt);
      const next = [...history, { role: "assistant" as const, content: reply }];
      setMessages(next);

      if (voiceMode) {
        setLastReply(reply);
        setVoicePhase("speaking");
        speak(reply);
        const ms = Math.max(2500, reply.length * 55);
        setTimeout(() => setVoicePhase("idle"), ms);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "NO_KEY") setErrorKind("no_key");
      else setErrorKind("network");
      if (voiceMode) setVoicePhase("idle");
    } finally {
      setLoading(false);
    }
  }, [loading, messages, systemPrompt]);

  const handleClear = () => {
    setMessages([]);
    setErrorKind(null);
    setLastReply(null);
    stopSpeaking();
    setSpeakingIdx(null);
    setVoicePhase("idle");
  };

  const handleReplay = (idx: number, text: string) => {
    stopSpeaking();
    setSpeakingIdx(idx);
    speak(text);
    const ms = Math.max(2000, text.length * 55);
    setTimeout(() => setSpeakingIdx(null), ms);
  };

  const handleStopReplay = () => {
    stopSpeaking();
    setSpeakingIdx(null);
  };

  const toggleVoiceMic = () => {
    if (isListening) { stopListening(); setVoicePhase("idle"); }
    else startListening();
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setVoicePhase("idle");
  };

  // Mutually exclusive panels
  const openChat  = () => { setChatOpen(true);  setVoiceOpen(false); stopSpeaking(); };
  const openVoice = () => { setVoiceOpen(true); setChatOpen(false); };

  // Lesson page has its own inline AI panel — hide global FABs there
  if (location.pathname.startsWith("/lesson")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat panel ───────────────────────────────────────── */}
      {chatOpen && (
        <ChatPanel
          label={label}
          suggestions={suggestions}
          messages={messages}
          loading={loading}
          errorKind={errorKind}
          onSendText={(t) => sendText(t, false)}
          onClear={handleClear}
          onClose={() => setChatOpen(false)}
          speakingIdx={speakingIdx}
          onReplay={handleReplay}
          onStopReplay={handleStopReplay}
        />
      )}

      {/* ── Voice panel ──────────────────────────────────────── */}
      {voiceOpen && (
        <VoicePanel
          label={label}
          loading={loading}
          errorKind={errorKind}
          lastReply={lastReply}
          phase={voicePhase}
          onMicToggle={toggleVoiceMic}
          onStopSpeaking={handleStopSpeaking}
          onClose={() => { setVoiceOpen(false); stopListening(); stopSpeaking(); setVoicePhase("idle"); }}
          onClear={handleClear}
          hasHistory={messages.length > 0}
        />
      )}

      {/* ── FAB row: voice (indigo) + chat (green) ───────────── */}
      <div className="flex items-center gap-2">

        {/* Voice FAB */}
        <button
          onClick={() => voiceOpen ? (setVoiceOpen(false), stopListening(), stopSpeaking(), setVoicePhase("idle")) : openVoice()}
          title="Voice Assistant"
          className={cn(
            "w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95",
            voiceOpen
              ? "bg-gray-800 hover:bg-gray-700 text-white"
              : isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
          )}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {voiceOpen ? "close" : isListening ? "mic" : "mic_none"}
          </span>
        </button>

        {/* Chat FAB */}
        <button
          onClick={() => chatOpen ? setChatOpen(false) : openChat()}
          title="Study Chat"
          className={cn(
            "w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95",
            chatOpen
              ? "bg-gray-800 hover:bg-gray-700 text-white"
              : "bg-[#2EC866] hover:bg-[#1EA34E] text-white"
          )}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {chatOpen ? "close" : "chat"}
          </span>
        </button>
      </div>
    </div>
  );
}
