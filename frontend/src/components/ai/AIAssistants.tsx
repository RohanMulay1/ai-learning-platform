import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Mic, MicOff, X, MessageSquare, Send, Bot, Volume2, Waves } from "lucide-react";

type ChatMessage = { role: "ai" | "user"; text: string };

const CHAT_STARTERS: ChatMessage[] = [
  { role: "ai", text: "Hi! I'm your AI tutor. I use Socratic questioning — I won't just give you answers, but I'll guide you to find them yourself. What are you working on?" },
];

const SAMPLE_RESPONSES = [
  "Interesting approach! What's the time complexity of that solution?",
  "Good thinking. Can you explain why you chose that data structure?",
  "You're on the right track. What happens when the input is empty?",
  "Walk me through your logic step by step — where does it break down?",
  "Think about the edge cases. What if all elements are the same?",
  "Great question! Consider: which data structure gives O(1) lookup?",
  "You've got the concept. Now how would you optimize the space complexity?",
];

function VoiceModal({ onClose }: { onClose: () => void }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const barHeights = useRef<number[]>(Array(14).fill(0).map(() => Math.random() * 60 + 20));

  function toggleListen() {
    if (isListening) {
      setIsListening(false);
      setPhase("processing");
      setTimeout(() => {
        setTranscript("How do I approach the two-sum problem efficiently?");
        setPhase("speaking");
        setResponse("Great question! Think about what you really need — for each number, you need to quickly check if its complement exists. What data structure lets you do that in O(1) time?");
        setTimeout(() => setPhase("idle"), 3000);
      }, 1000);
    } else {
      setIsListening(true);
      setPhase("listening");
      setTranscript("");
      setResponse("");
    }
  }

  const phaseColor = phase === "listening" ? "bg-rose-500" : phase === "speaking" ? "bg-emerald-500" : "bg-amber-400";
  const phaseLabel = phase === "idle" ? "Ready" : phase === "listening" ? "Listening…" : phase === "processing" ? "Thinking…" : "Speaking…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", phase === "idle" ? "bg-violet-600" : phaseColor)}>
              <Waves className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm leading-tight">Voice AI Tutor</p>
              <p className="text-xs text-gray-400">{phaseLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Waveform */}
        <div className="flex items-center justify-center gap-1 h-16 mb-6 bg-gray-50 rounded-2xl">
          {barHeights.current.map((h, i) => (
            <div
              key={i}
              className={cn("w-1.5 rounded-full transition-all", phase === "idle" ? "bg-gray-200" : phase === "listening" ? "bg-rose-400" : phase === "speaking" ? "bg-emerald-400" : "bg-amber-300")}
              style={{
                height: phase === "idle" ? "6px" : `${h * 0.5}%`,
                ...(phase !== "idle" ? { animation: `wave 0.${4 + (i % 5)}s ease-in-out infinite alternate`, animationDelay: `${i * 0.05}s` } : {}),
              }}
            />
          ))}
        </div>

        {transcript && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 text-sm text-gray-700">
            <span className="text-xs text-gray-400 font-semibold block mb-1">You said:</span>
            {transcript}
          </div>
        )}

        {response && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4 text-sm text-gray-700">
            <span className="text-xs text-violet-500 font-semibold flex items-center gap-1 mb-1">
              <Volume2 className="w-3 h-3" /> AI Tutor:
            </span>
            {response}
          </div>
        )}

        {phase === "idle" && !transcript && (
          <p className="text-center text-gray-400 text-sm mb-5 font-medium">Press the button and ask anything about your current problem.</p>
        )}

        <button
          onClick={toggleListen}
          className={cn(
            "w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
            isListening ? "bg-rose-500 hover:bg-rose-600 text-white" : "btn-primary"
          )}
        >
          {isListening ? <><MicOff className="w-4 h-4" /> Stop listening</> : <><Mic className="w-4 h-4" /> {phase === "processing" ? "Processing…" : "Start speaking"}</>}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">Powered by Web Speech API + Claude Sonnet</p>
      </div>
      <style>{`@keyframes wave { from { height: 4px; } to { height: 40px; } }`}</style>
    </div>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_STARTERS);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)] }]);
      setTyping(false);
    }, 700 + Math.random() * 600);
  }

  return (
    <div
      className="fixed bottom-24 right-6 z-40 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ height: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-gray-900 text-sm font-bold leading-tight">AI Tutor</p>
            <p className="text-xs text-emerald-500 font-semibold">Online · Socratic mode</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: "#F5F4FF" }}>
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={cn(
              "text-sm rounded-2xl px-3 py-2.5 max-w-[82%] leading-relaxed shadow-sm",
              m.role === "user"
                ? "bg-violet-600 text-white rounded-br-sm font-medium"
                : "bg-white text-gray-700 rounded-bl-sm border border-gray-100"
            )}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 border border-gray-100 shadow-sm">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask your tutor…"
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400 transition font-medium"
        />
        <button
          onClick={send}
          className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AIAssistants() {
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <>
      {voiceOpen && <VoiceModal onClose={() => setVoiceOpen(false)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}

      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        <button
          onClick={() => { setVoiceOpen(true); setChatOpen(false); }}
          className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center transition-all hover:scale-105 hover:border-violet-300 hover:shadow-xl group relative"
          title="Voice AI Tutor"
        >
          <Waves className="w-5 h-5 text-violet-500" />
          <span className="absolute right-14 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Voice Tutor
          </span>
        </button>

        <button
          onClick={() => setChatOpen((o) => !o)}
          className={cn(
            "w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center transition-all hover:scale-105 group relative",
            chatOpen
              ? "bg-violet-600 border-violet-600 shadow-violet-200"
              : "bg-white border-gray-200 hover:border-violet-300 hover:shadow-xl"
          )}
          title="AI Tutor Chat"
        >
          <MessageSquare className={cn("w-5 h-5", chatOpen ? "text-white" : "text-violet-500")} />
          {!chatOpen && (
            <span className="absolute right-14 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
              AI Tutor Chat
            </span>
          )}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
        </button>
      </div>
    </>
  );
}
