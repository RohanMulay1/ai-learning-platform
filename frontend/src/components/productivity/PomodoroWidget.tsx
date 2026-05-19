import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { useProductivityStore } from "../../stores/productivityStore";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const WORK_TOTAL: Record<string, number> = { "25/5": 25 * 60, "50/10": 50 * 60 };

export function PomodoroWidget() {
  const {
    mode, phase, secondsLeft, sessionCount, isRunning,
    startTimer, pauseTimer, resetTimer, setMode, tickSecond,
  } = useProductivityStore();

  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tickSecond, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tickSecond]);

  const total = WORK_TOTAL[mode];
  const progress = phase === "break"
    ? 1
    : secondsLeft / total;
  const strokeOffset = CIRCUMFERENCE * progress;

  const phaseColor = phase === "break" ? "#2EC866" : phase === "work" ? "#6366F1" : "#9CA3AF";
  const phasLabel = phase === "idle" ? "Ready" : phase === "work" ? "Focus" : "Break";

  const todayDots = Math.min(sessionCount, 4);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-bold",
          isRunning
            ? "bg-[#D1FAE5] border-green-300 text-[#16a34a]"
            : "bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-gray-900"
        )}
      >
        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {phase === "break" ? "coffee" : "timer"}
        </span>
        <span className="font-mono text-xs">{formatTime(secondsLeft)}</span>
        {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[#2EC866] animate-pulse" />}
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pomodoro</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-300 hover:text-gray-500 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">expand_less</span>
        </button>
      </div>

      {/* Circular ring */}
      <div className="flex justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={RADIUS} fill="none"
              stroke={phaseColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-extrabold text-gray-900 leading-none">{formatTime(secondsLeft)}</span>
            <span className="text-[9px] uppercase tracking-widest font-bold mt-0.5" style={{ color: phaseColor }}>{phasLabel}</span>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
          {(["25/5", "50/10"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                mode === m ? "bg-[#2EC866] text-white" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={resetTimer}
          className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-all border border-gray-200"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
        </button>
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          className="w-12 h-9 rounded-lg bg-[#2EC866] hover:bg-[#1EA34E] text-white flex items-center justify-center transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isRunning ? "pause" : "play_arrow"}
          </span>
        </button>
      </div>

      {/* Session dots */}
      <div className="flex justify-center items-center gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn("w-2 h-2 rounded-full transition-all", i < todayDots ? "bg-[#2EC866]" : "bg-gray-200")}
          />
        ))}
        <span className="text-[10px] text-gray-400 ml-1">{sessionCount} today</span>
      </div>
    </div>
  );
}
