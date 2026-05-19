import { useState } from "react";
import { useParams } from "react-router-dom";
import { cn } from "../lib/utils";
import { CheckCircle, XCircle, ArrowRight, Zap, Target, RotateCcw, ArrowLeft } from "lucide-react";
import { PomodoroWidget } from "../components/productivity/PomodoroWidget";
const QUIZZES: Record<string, { title: string; topic: string; questions: { question: string; options: string[]; correct: number; explanation: string }[] }> = {
  "arrays": {
    title: "Arrays & Hashing", topic: "Data Structures",
    questions: [
      { question: "What is the average time complexity of a hash map lookup?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correct: 2, explanation: "Hash maps use a hash function to map keys to indices, giving O(1) average-case lookup. Worst case is O(n) due to hash collisions, but this is rare with a good hash function." },
      { question: "You need to find if two strings are anagrams. Which approach is most efficient?", options: ["Sort both strings and compare — O(n log n)", "Use a frequency count hash map — O(n)", "Compare every character pair — O(n²)", "Use a trie — O(n)"], correct: 1, explanation: "A frequency count hash map is O(n) time and O(1) space (fixed alphabet size). Sorting works but is O(n log n). The hash map approach is optimal." },
      { question: "What does the sliding window technique avoid?", options: ["Time for space — slower but less memory", "Recomputing by reusing the previous window's result", "Converts O(n) to O(log n)", "Requires sorting the input first"], correct: 1, explanation: "Sliding window avoids redundant computation. Instead of recalculating from scratch, you add one element (right) and remove one (left), keeping the window's state up to date in O(1) per step." },
      { question: "When should you prefer a hash set over a hash map?", options: ["When you need to store key-value pairs", "When you need O(log n) lookups", "When you only need to check membership, not store a value", "When the input is sorted"], correct: 2, explanation: "Use a hash set when you only care about whether an element exists — for example, 'have I seen this number before?' A hash map is needed when you need to store associated data." },
      { question: "What is the space complexity of storing a frequency map for a string of length n?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], correct: 1, explanation: "In the worst case (all unique characters), you store n entries — O(n). If the alphabet is fixed size (e.g. 26 letters), it's technically O(1) since the map is bounded by alphabet, not n." },
    ],
  },
  "two-pointers": {
    title: "Two Pointers", topic: "Algorithms",
    questions: [
      { question: "Two pointers is most commonly applied to which type of input?", options: ["Random unsorted arrays", "Sorted arrays or strings", "Trees", "Graphs with cycles"], correct: 1, explanation: "The opposite-direction two-pointer technique works because sorted order lets you make decisions: if the sum is too high, move the right pointer left; if too low, move the left pointer right." },
      { question: "What is the time complexity of the two-pointer approach for pair sum in a sorted array?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], correct: 2, explanation: "Each pointer moves at most n steps total (they never go backward), so total work is O(n). This is what makes two pointers powerful — linear time without extra space." },
      { question: "In the 'fast and slow pointer' pattern, what problem is it classically used for?", options: ["Finding pairs that sum to a target", "Detecting a cycle in a linked list", "Sorting an array", "Computing max subarray"], correct: 1, explanation: "Floyd's cycle detection uses two pointers: a slow pointer moves one step, the fast moves two. If there's a cycle, they'll eventually meet. If not, the fast pointer reaches null." },
    ],
  },
  "binary-search": {
    title: "Binary Search", topic: "Algorithms",
    questions: [
      { question: "What is the time complexity of binary search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], correct: 2, explanation: "Binary search halves the search space each iteration. Starting from n elements, after k steps you have n/2^k left. When that equals 1: k = log₂(n), so it's O(log n)." },
      { question: "Binary search requires the search space to be:", options: ["Random", "Monotonic — you can determine which half to discard", "Unsorted", "Contain no duplicates"], correct: 1, explanation: "The core requirement is monotonicity — you need to be able to decide which half to discard. Sorted arrays are the classic case, but it works anywhere you can write a predicate that transitions false → true." },
      { question: "You're finding the leftmost position where arr[i] >= target. Which condition continues searching left?", options: ["arr[mid] < target → go left", "arr[mid] >= target → go left", "arr[mid] > target → go right", "arr[mid] == target → stop"], correct: 1, explanation: "When arr[mid] >= target, we've found a valid position but there might be an earlier one — so we record mid and continue left (hi = mid - 1). Only when arr[mid] < target do we go right." },
    ],
  },
};

function Result({ score, total, onRetry, onBack }: { score: number; total: number; onRetry: () => void; onBack: () => void }) {
  const pct = Math.round((score / total) * 100);
  const xp = score * 50;
  const label = pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : "Keep practicing";
  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "⚡" : "📚";
  const color = pct >= 80 ? "from-violet-600 to-indigo-600" : pct >= 60 ? "from-amber-500 to-orange-500" : "from-rose-500 to-rose-600";

  return (
    <div className="flex flex-col items-center text-center py-10">
      <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-xl bg-gradient-to-br", color)}>
        {emoji}
      </div>
      <h2 className="text-4xl font-extrabold text-gray-900 mb-2">{label}</h2>
      <p className="text-gray-500 font-medium mb-10">You scored {score} out of {total} — {pct}%</p>

      <div className="flex items-center gap-8 mb-10">
        {[
          { label: "Score",   value: `${pct}%`,   color: "text-gray-900"   },
          { label: "XP",      value: `+${xp}`,    color: "text-amber-500"  },
          { label: "Correct", value: `${score}/${total}`, color: "text-emerald-600" },
        ].map(({ label, value, color }, i, a) => (
          <div key={label} className="flex items-center gap-8">
            <div className="text-center">
              <p className={cn("text-3xl font-extrabold", color)}>{value}</p>
              <p className="text-gray-400 text-sm font-medium mt-0.5">{label}</p>
            </div>
            {i < a.length - 1 && <div className="w-px h-10 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry} className="btn-secondary flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
        <button onClick={onBack} className="btn-primary flex items-center gap-2">
          Done <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const quiz = (quizId && QUIZZES[quizId]) ? QUIZZES[quizId] : QUIZZES["arrays"];
  const total = quiz.questions.length;

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz.questions[idx];
  const progress = (idx / total) * 100;

  function confirm() {
    if (selected === null) return;
    setConfirmed(true);
    if (selected === q.correct) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= total) { setDone(true); return; }
    setIdx((i) => i + 1);
    setSelected(null);
    setConfirmed(false);
  }

  function retry() {
    setIdx(0); setSelected(null); setConfirmed(false); setScore(0); setDone(false);
  }

  if (done) return (
    <div className="p-8 max-w-2xl mx-auto">
      <Result score={score} total={total} onRetry={retry} onBack={() => window.history.back()} />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm font-semibold transition group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Exit
        </button>
        <div className="flex items-center gap-3">
          <PomodoroWidget />
          <span className="text-gray-400 font-semibold text-sm">{idx + 1} / {total}</span>
          <span className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-50 px-3 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5" />{score * 50} XP
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-2.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 mb-4" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-600" />
          </div>
          <span className="text-violet-600 text-xs font-bold uppercase tracking-widest">{quiz.topic}</span>
        </div>

        <h2 className="text-gray-900 text-xl font-extrabold leading-snug mb-7">{q.question}</h2>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let cls = "border-2 border-gray-200 bg-gray-50 text-gray-700 hover:border-violet-300 hover:bg-violet-50 cursor-pointer";
            if (selected === i && !confirmed) cls = "border-2 border-violet-500 bg-violet-50 text-violet-900";
            if (confirmed) {
              if (i === q.correct)                        cls = "border-2 border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (i === selected && i !== q.correct) cls = "border-2 border-rose-400 bg-rose-50 text-rose-800";
              else                                         cls = "border-2 border-gray-100 bg-white text-gray-400";
            }
            return (
              <button
                key={i}
                onClick={() => !confirmed && setSelected(i)}
                disabled={confirmed}
                className={cn("w-full text-left px-5 py-4 rounded-2xl text-sm font-semibold transition-all flex items-center gap-3", cls)}
              >
                <span className={cn("w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-all",
                  confirmed && i === q.correct                      ? "bg-emerald-500 text-white" :
                  confirmed && i === selected && i !== q.correct    ? "bg-rose-500 text-white" :
                  selected === i && !confirmed                       ? "bg-violet-600 text-white" :
                  "bg-white text-gray-400 border border-gray-200"
                )}>
                  {confirmed && i === q.correct ? <CheckCircle className="w-4 h-4" /> :
                   confirmed && i === selected && i !== q.correct ? <XCircle className="w-4 h-4" /> :
                   String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {confirmed && (
        <div className={cn("rounded-2xl p-5 mb-4 border-2",
          selected === q.correct ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
        )}>
          <p className={cn("font-bold mb-1", selected === q.correct ? "text-emerald-700" : "text-rose-700")}>
            {selected === q.correct ? "✓ Correct!" : "✗ Not quite —"}
          </p>
          <p className="text-gray-700 text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Action */}
      {!confirmed ? (
        <button onClick={confirm} disabled={selected === null} className={cn("w-full py-4 rounded-2xl font-bold text-sm transition-all", selected !== null ? "btn-primary" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
          Confirm answer
        </button>
      ) : (
        <button onClick={next} className="btn-primary w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
          {idx + 1 >= total ? "See results" : "Next question"} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
