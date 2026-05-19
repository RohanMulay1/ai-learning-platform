import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn, diffClass } from "../../lib/utils";
import { useLearnerStore } from "../../stores/learnerStore";
import { useProductivityStore } from "../../stores/productivityStore";
import { SAMPLE_CHALLENGES } from "../../data/sample";

const RATINGS = [
  { q: 0, label: "Forgot",   bg: "bg-red-50",    text: "text-red-500",    border: "border-red-200" },
  { q: 1, label: "Hard",     bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-200" },
  { q: 2, label: "OK",       bg: "bg-amber-50",  text: "text-amber-500",  border: "border-amber-200" },
  { q: 3, label: "Good",     bg: "bg-indigo-50", text: "text-indigo-500", border: "border-indigo-200" },
  { q: 4, label: "Easy",     bg: "bg-green-50",  text: "text-green-600",  border: "border-green-200" },
  { q: 5, label: "Perfect!", bg: "bg-[#2EC866]", text: "text-white",      border: "border-[#2EC866]" },
];

function nextInterval(card: { interval: number; easeFactor: number; repetitions: number }, quality: number): string {
  if (quality < 3) return "→ 1d";
  let interval = card.interval;
  if (card.repetitions === 0) interval = 1;
  else if (card.repetitions === 1) interval = 6;
  else interval = Math.round(interval * card.easeFactor);
  return `→ ${interval}d`;
}

export function ReviewQueue() {
  const navigate = useNavigate();
  const { reviewCards, rateReviewCard } = useLearnerStore();
  const logActivity = useProductivityStore(s => s.logActivity);

  const today = new Date().toISOString().slice(0, 10);
  const due = reviewCards.filter(c => c.nextReviewDate <= today);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [reviewed, setReviewed] = useState(0);

  // Dynamic stats
  const totalCards = reviewCards.length;
  const avgInterval = totalCards > 0
    ? Math.round(reviewCards.reduce((s, c) => s + c.interval, 0) / totalCards * 10) / 10
    : 0;
  const retainedCount = reviewCards.filter(c => c.repetitions >= 2).length;
  const retentionPct = totalCards > 0 ? Math.round((retainedCount / totalCards) * 100) : 0;

  function submitRating(q: number) {
    if (!currentCard) return;
    rateReviewCard(currentCard.challengeId, q);
    logActivity("reviews");
    setReviewed(r => r + 1);
    setCurrentIdx(i => i + 1);
  }

  const done = currentIdx >= due.length;
  const currentCard = due[currentIdx];
  const challenge = currentCard
    ? SAMPLE_CHALLENGES.find(c => c.id === currentCard.challengeId)
    : undefined;
  const progress = due.length > 0 ? (reviewed / due.length) * 100 : 0;

  // Empty state: no attempts yet
  if (reviewCards.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 bg-[#D1FAE5] border border-[#86efac] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[#16a34a] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Your queue is empty</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Complete a challenge to start building your spaced repetition queue. The AI will schedule reviews at the perfect moment before you forget.
          </p>
          <button
            onClick={() => navigate("/challenges")}
            className="bg-[#2EC866] hover:bg-[#1EA34E] text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            Browse Challenges
          </button>
        </div>
      </div>
    );
  }

  // Empty state: cards exist but nothing due
  if (due.length === 0) {
    const nextDue = reviewCards.reduce((earliest, c) =>
      c.nextReviewDate < earliest ? c.nextReviewDate : earliest,
      "9999-99-99"
    );
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 bg-[#D1FAE5] border border-[#86efac] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[#2EC866] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-500 text-sm mb-2 leading-relaxed">
            Nothing due today. Your next review is on <span className="text-[#16a34a] font-bold">{nextDue}</span>.
          </p>
          <p className="text-gray-400 text-xs mb-6">{totalCards} cards in queue · {retentionPct}% retention rate</p>
          <button
            onClick={() => navigate("/challenges")}
            className="bg-gray-100 hover:bg-[#2EC866] hover:text-white text-gray-900 font-bold px-6 py-3 rounded-xl transition-all border border-gray-200"
          >
            Solve Another Challenge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] z-[1]"
        style={{ backgroundImage: "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2EC866]/5 rounded-full blur-[120px] pointer-events-none" />

      <section className="w-full max-w-[680px] px-6 py-12 flex flex-col items-center z-10">
        {/* Header */}
        <div className="w-full mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Review Queue</h1>
              <p className="text-gray-500 mt-1">{due.length} card{due.length !== 1 ? "s" : ""} due today</p>
            </div>
            <div className="flex flex-wrap gap-4 text-[11px] font-medium tracking-tight text-gray-500 uppercase opacity-80">
              <span><span className="text-[#2EC866] font-bold">{retentionPct}%</span> retention</span>
              <span><span className="text-[#6366F1] font-bold">{avgInterval}</span> avg interval</span>
              <span><span className="text-gray-900 font-bold">{totalCards}</span> total cards</span>
            </div>
          </div>
          <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-[#2EC866] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-bold text-[#16a34a] uppercase tracking-wider">Session Progress</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{reviewed}/{due.length} Reviewed</span>
          </div>
        </div>

        {done ? (
          <div className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-[#D1FAE5] border border-[#86efac] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[#2EC866] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Session Complete!</h3>
            <p className="text-gray-500 mb-8">You reviewed all {due.length} cards due today. Come back tomorrow!</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-[#2EC866] hover:bg-[#1EA34E] text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-[0.98]"
            >
              Back to Dashboard
            </button>
          </div>
        ) : currentCard ? (
          <>
            {/* Flashcard */}
            <div
              className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl p-8 mb-8 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
            >
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", diffClass(currentCard.difficulty))}>
                      {currentCard.difficulty}
                    </span>
                    {currentCard.skillTags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{currentCard.challengeTitle}</h2>
                  {challenge?.companies?.slice(0, 2).map(c => (
                    <span key={c} className="inline-block mr-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] border border-gray-200">{c}</span>
                  ))}
                </div>

                <div className="py-4 border-y border-gray-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                    <span className="material-symbols-outlined text-sm">history</span>
                    {currentCard.lastReviewed
                      ? `Last reviewed ${currentCard.lastReviewed} · Interval: ${currentCard.interval}d`
                      : "First review — never seen before"}
                  </div>
                  {challenge && (
                    <p className="text-gray-700 leading-relaxed font-medium text-sm line-clamp-3">
                      {challenge.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Last mastery score:</span>
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(currentCard.lastMasteryScore * 100)}%`,
                          background: currentCard.lastMasteryScore >= 0.7 ? "#2EC866"
                            : currentCard.lastMasteryScore >= 0.4 ? "#6366F1" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-900">{Math.round(currentCard.lastMasteryScore * 100)}%</span>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <span className="text-sm italic text-gray-400 flex items-center gap-2">
                    Recall your solution, then rate how well you remembered it
                    <span className="material-symbols-outlined text-base">touch_app</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Rating buttons */}
            <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-3">
              {RATINGS.map(({ q, label, bg, text, border }) => (
                <button
                  key={q}
                  onClick={() => submitRating(q)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn("w-full h-12 rounded-lg flex items-center justify-center font-bold text-lg group-hover:brightness-95 transition-all border", bg, text, border)}>
                    {q}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase text-gray-700 opacity-80">{label}</span>
                    <span className={cn("text-[10px] font-mono", text)}>{nextInterval(currentCard, q)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom */}
            <div className="w-full mt-10 flex justify-between items-center text-gray-400">
              <button
                onClick={() => submitRating(2)}
                className="text-sm font-medium hover:text-gray-700 transition-colors flex items-center gap-2"
              >
                Skip for now
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2EC866] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#16a34a]">
                  {due.length - reviewed} remaining
                </span>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
