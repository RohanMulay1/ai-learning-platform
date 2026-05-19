import { useState, useRef, useEffect } from "react";
import { useTutorStore } from "../../stores/store";
import { useTutorSocket } from "../../hooks/useWebSocket";
import { useVoice } from "../../hooks/useVoice";
import { cn } from "../../lib/utils";
import { X, Send, Mic, MicOff, Bot, User, Zap } from "lucide-react";

function MessageBubble({ msg }: { msg: { role: string; content: string; intent?: string; mastery_signal?: number } }) {
  const isStudent = msg.role === "student";
  return (
    <div className={cn("flex gap-3 mb-4", isStudent ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isStudent ? "bg-purple-700" : "bg-cyan-700"
      )}>
        {isStudent ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
        isStudent
          ? "bg-purple-900/60 text-purple-100 rounded-tr-sm"
          : "bg-gray-800 text-gray-200 rounded-tl-sm"
      )}>
        {msg.content}
        {msg.mastery_signal !== undefined && msg.mastery_signal > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
            <Zap className="w-3 h-3" />
            Mastery: {Math.round(msg.mastery_signal * 100)}%
          </div>
        )}
        {msg.intent === "celebrate" && (
          <div className="mt-1 text-xs text-amber-400">🎉 Skill unlocked!</div>
        )}
      </div>
    </div>
  );
}

export function TutorPanel() {
  const { isOpen, setOpen, sessionId, messages } = useTutorStore();
  const { send } = useTutorSocket(sessionId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening } = useVoice({
    onTranscript: (text) => {
      setInput(text);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  function handleSend() {
    if (!input.trim()) return;
    send(input.trim());
    setInput("");
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-gray-900 border-l border-gray-800 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Tutor</h3>
            <p className="text-gray-500 text-xs">Socratic mode — guides, never gives answers</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm mt-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p>Ask me anything about this challenge.</p>
            <p className="mt-1">I'll guide you with questions, not answers.</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question or share your thinking..."
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 resize-none transition"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition",
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl flex items-center justify-center transition"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-xs mt-2 text-center">
          Enter to send · Shift+Enter for new line · 🎤 voice input supported
        </p>
      </div>
    </div>
  );
}
