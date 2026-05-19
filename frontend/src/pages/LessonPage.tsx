import { useParams, Link, useNavigate } from "react-router-dom";
import { SAMPLE_LESSONS, SAMPLE_COURSES } from "../data/sample";
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Code2, Lightbulb, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../lib/utils";
import { PomodoroWidget } from "../components/productivity/PomodoroWidget";
import { useLearnerStore } from "../stores/learnerStore";
import { useVoice } from "../hooks/useVoice";
import type { KnowledgeDoc } from "../stores/learnerStore";

/* ── Lesson content renderer ─────────────────────────────────── */

function getRelatedDocs(courseTags: string[], docs: KnowledgeDoc[]): KnowledgeDoc[] {
  return docs.filter(doc =>
    doc.concepts.some(concept =>
      courseTags.some(tag =>
        concept.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(concept.toLowerCase())
      )
    )
  );
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## "))
      return <h2 key={i} className="text-xl font-extrabold text-gray-900 mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("# "))
      return <h1 key={i} className="text-2xl font-extrabold text-gray-900 mt-8 mb-3">{line.slice(2)}</h1>;
    if (line.trim() === "") return <div key={i} className="h-3" />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-gray-600 leading-relaxed text-base">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="text-gray-900 font-bold">{part}</strong> : part
        )}
      </p>
    );
  });
}

/* ── Gemini + TTS helpers ────────────────────────────────────── */

const GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? "") as string;

interface Msg { role: "user" | "assistant"; content: string; }

async function callGemini(messages: Msg[], systemPrompt: string): Promise<string> {
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
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) throw new Error("Empty response");
  return text.trim();
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05; utt.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /en-(US|GB)/i.test(v.lang) && v.localService);
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

/* ── Inline AI Study Panel ───────────────────────────────────── */

type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

const RIPPLE_STYLE = `@keyframes lessonRipple {
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

function LessonAIPanel({ lessonTitle, keyPoints }: { lessonTitle: string; keyPoints: string[] }) {
  const [tab, setTab] = useState<"chat" | "voice">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState<"no_key" | "network" | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [lastReply, setLastReply] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { injectRipple(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const systemPrompt = `You are a focused AI tutor helping a learner study "${lessonTitle}".

Key concepts in this lesson: ${keyPoints.join(", ")}.

Rules:
- Be concise (2-4 sentences max). Use bullets for lists.
- Socratic and encouraging — guide thinking, don't just give answers.
- Never write complete algorithm implementations.
- Only answer CS/DSA/programming/learning-strategy questions.
- For off-topic questions reply: "I'm here to help with this lesson — what would you like to understand better?"`;

  const suggestions = [
    `Explain ${lessonTitle} in simpler terms`,
    "Give me a real-world analogy",
    "How is this used in coding interviews?",
  ];

  const sendText = useCallback(async (content: string, voiceMode = false) => {
    if (!content.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: content.trim() };
    setMessages(prev => {
      const history = [...prev, userMsg];
      setLoading(true);
      setErrorKind(null);
      setInput("");

      callGemini(history, systemPrompt)
        .then(reply => {
          setMessages([...history, { role: "assistant", content: reply }]);
          if (voiceMode) {
            setLastReply(reply);
            setVoicePhase("speaking");
            speak(reply);
            setTimeout(() => setVoicePhase("idle"), Math.max(2500, reply.length * 55));
          }
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.message === "NO_KEY") setErrorKind("no_key");
          else setErrorKind("network");
          if (voiceMode) setVoicePhase("idle");
        })
        .finally(() => setLoading(false));

      return history;
    });
  }, [loading, systemPrompt]);

  const sendTextRef = useRef(sendText);
  useEffect(() => { sendTextRef.current = sendText; }, [sendText]);

  const { isListening, startListening, stopListening } = useVoice({
    onTranscript: (text) => { setVoicePhase("thinking"); sendTextRef.current(text, true); },
    onError: () => { setVoicePhase("idle"); setErrorKind("network"); },
  });

  useEffect(() => { if (isListening) setVoicePhase("listening"); }, [isListening]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-[#D1FAE5] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#2EC866] text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <span className="text-xs font-bold text-gray-800">AI Study Tutor</span>
          <span className="ml-auto text-[10px] text-gray-400 font-medium truncate max-w-[110px]" title={lessonTitle}>{lessonTitle}</span>
        </div>
        {/* Chat / Voice tabs */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["chat", "voice"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all",
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {t === "chat" ? "chat" : "mic"}
              </span>
              {t === "chat" ? "Chat" : "Voice"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat tab ─────────────────────────────────────────── */}
      {tab === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scrollbar-hide">
            {messages.length === 0 && !errorKind && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-gray-400 text-center font-medium pt-1">Ask anything about this lesson</p>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendText(s)}
                    className="text-left text-[11px] px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:border-[#2EC866]/50 hover:bg-[#D1FAE5]/20 text-gray-600 transition-colors leading-snug">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {errorKind === "no_key" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-bold text-amber-800 mb-1">API key not configured</p>
                <p className="text-[10px] text-amber-700">Add <code className="bg-amber-100 px-1 rounded font-mono">VITE_GEMINI_API_KEY</code> to .env</p>
              </div>
            )}
            {errorKind === "network" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[10px] text-red-600">Connection error — please try again.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-5 h-5 rounded-md bg-[#D1FAE5] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#2EC866] text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                )}
                <div className={cn(
                  "text-[11px] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap max-w-[210px]",
                  m.role === "user"
                    ? "bg-[#2EC866] text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-5 h-5 rounded-md bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#2EC866] text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center">
                  {[0, 1, 2].map(d => (
                    <div key={d} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <button
              onClick={() => isListening ? stopListening() : startListening()}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isListening ? "mic" : "mic_none"}
              </span>
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); } }}
              placeholder={isListening ? "Listening…" : "Ask the AI tutor…"}
              disabled={loading || isListening}
              className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2EC866]/60 focus:ring-1 focus:ring-[#2EC866]/10 text-gray-800 placeholder-gray-400 disabled:opacity-60"
            />
            <button
              onClick={() => sendText(input)}
              disabled={!input.trim() || loading || isListening}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                input.trim() && !loading && !isListening
                  ? "bg-[#2EC866] hover:bg-[#1EA34E] text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </>
      )}

      {/* ── Voice tab ────────────────────────────────────────── */}
      {tab === "voice" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
          {/* Mic with ripple rings */}
          <div className="relative flex items-center justify-center">
            {voicePhase === "listening" && [1, 2, 3].map(n => (
              <span key={n} className="absolute rounded-full border-2 border-indigo-400 opacity-0"
                style={{ width: 56 + n * 20, height: 56 + n * 20, animation: `lessonRipple 1.6s ease-out ${n * 0.3}s infinite` }} />
            ))}
            <button
              onClick={() => {
                if (voicePhase === "listening") { stopListening(); setVoicePhase("idle"); }
                else if (voicePhase === "idle") startListening();
              }}
              disabled={voicePhase === "thinking" || voicePhase === "speaking"}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md",
                voicePhase === "listening"  ? "bg-red-500 text-white scale-110"
                : voicePhase === "thinking" || voicePhase === "speaking" ? "bg-indigo-100 text-indigo-300 cursor-wait"
                : "bg-indigo-500 hover:bg-indigo-600 text-white active:scale-95"
              )}
            >
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {voicePhase === "listening" ? "mic" : "mic_none"}
              </span>
            </button>
          </div>

          <p className={cn(
            "text-xs font-semibold text-center",
            voicePhase === "listening" ? "text-red-500"
            : voicePhase === "thinking" ? "text-indigo-500 animate-pulse"
            : voicePhase === "speaking" ? "text-indigo-500"
            : "text-gray-400"
          )}>
            {voicePhase === "idle"      ? "Tap mic to ask aloud"
            : voicePhase === "listening" ? "Listening…"
            : voicePhase === "thinking"  ? "Thinking…"
            : "Speaking…"}
          </p>

          {errorKind === "no_key" && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] text-amber-700">Add <code className="bg-amber-100 px-1 rounded font-mono">VITE_GEMINI_API_KEY</code> to .env</p>
            </div>
          )}
          {errorKind === "network" && (
            <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] text-red-600">Connection error — try again.</p>
            </div>
          )}

          {lastReply && (
            <div className="w-full rounded-xl bg-indigo-50 border border-indigo-100 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Response</p>
                {voicePhase === "speaking" ? (
                  <button onClick={() => { window.speechSynthesis?.cancel(); setVoicePhase("idle"); }}
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
            <p className="text-[10px] text-gray-300 text-center">Replies are read aloud automatically</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── LessonPage ──────────────────────────────────────────────── */

export function LessonPage() {
  const { lessonId, courseId } = useParams<{ lessonId: string; courseId: string }>();
  const [completed, setCompleted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const navigate = useNavigate();
  const { knowledgeDocuments } = useLearnerStore();
  const courseTags = SAMPLE_COURSES.find(c => c.id === courseId)?.tags ?? [];
  const relatedDocs = getRelatedDocs(courseTags, knowledgeDocuments);
  const lesson = lessonId ? SAMPLE_LESSONS[lessonId] : null;

  if (!lesson) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-6 transition font-semibold group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to course
        </Link>
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-gray-900 font-extrabold text-xl mb-2">Lesson content coming soon</h2>
          <p className="text-gray-400 text-sm font-medium">This lesson is being prepared by our AI curriculum team.</p>
          <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-2 mt-6 btn-primary">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    /* Fill the scrollable <main> and take over its layout */
    <div className="h-full flex flex-col overflow-hidden">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-3.5 flex items-center justify-between flex-shrink-0" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <Link to={courseId ? `/courses/${courseId}` : "/courses"} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition group font-semibold">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to course
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lesson</span>
        </div>
        <div className="flex items-center gap-3">
          <PomodoroWidget />
          {completed ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle className="w-4 h-4" /> Completed
            </div>
          ) : (
            <button
              onClick={() => setCompleted(true)}
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full font-bold transition"
            >
              Mark complete
            </button>
          )}
        </div>
      </div>

      {/* Body: lesson content + AI panel side by side */}
      <div className="flex flex-1 overflow-hidden">

        {/* Scrollable lesson content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-2xl mx-auto px-8 py-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">{lesson.title}</h1>

            {/* Content */}
            <div className="space-y-2 mb-10 leading-relaxed">
              {renderContent(lesson.content)}
            </div>

            {/* Key takeaways */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-gray-900 font-extrabold">Key Takeaways</h3>
              </div>
              <ul className="space-y-3">
                {lesson.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-extrabold">{i + 1}</span>
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Code example */}
            {lesson.code_example && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-4 h-4 text-violet-500" />
                  <h3 className="text-gray-900 font-extrabold">Code Example</h3>
                </div>
                <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="text-xs text-gray-500 ml-2 font-medium">Python</span>
                  </div>
                  <pre className="p-6 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {lesson.code_example.trim()}
                  </pre>
                </div>
              </div>
            )}

            {/* Study Notes */}
            <div className="mb-6">
              <button
                onClick={() => setNotesOpen(v => !v)}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors w-full text-left"
              >
                <FileText className="w-4 h-4" />
                Study Notes
                {relatedDocs.length > 0 && (
                  <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-bold">
                    {relatedDocs.length} matched
                  </span>
                )}
                <span className="ml-auto text-gray-300">
                  {notesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {notesOpen && (
                <div className="mt-3 space-y-2">
                  {relatedDocs.length > 0 ? (
                    relatedDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.filename}</p>
                          <p className="text-xs text-gray-400">{doc.concepts.length} concepts extracted</p>
                        </div>
                        <Link to="/courses?tab=notes" className="text-xs text-violet-600 font-bold hover:text-violet-800 transition-colors">
                          Open →
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center">
                      <p className="text-sm text-gray-400">
                        No matching notes yet.{" "}
                        <Link to="/courses?tab=notes" className="text-violet-600 font-bold hover:underline">
                          Upload notes for this topic →
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <Link
                to={courseId ? `/courses/${courseId}` : "/courses"}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm transition font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to course
              </Link>

              {!completed ? (
                <button
                  onClick={() => setCompleted(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-full transition"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as complete
                </button>
              ) : (
                <Link
                  to={courseId ? `/courses/${courseId}` : "/courses"}
                  className="btn-primary flex items-center gap-2"
                >
                  Next module <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* AI Study Panel — sticky right sidebar, only on lg+ screens */}
        <aside className="hidden lg:flex flex-col w-[290px] flex-shrink-0 border-l border-gray-100 overflow-hidden">
          <LessonAIPanel lessonTitle={lesson.title} keyPoints={lesson.key_points} />
        </aside>
      </div>
    </div>
  );
}
