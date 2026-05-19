import { useEffect } from "react";
import { useProductivityStore } from "../../stores/productivityStore";

export function RewardToast() {
  const { pendingReward, dismissReward } = useProductivityStore();

  useEffect(() => {
    if (!pendingReward) return;
    const t = setTimeout(dismissReward, 4000);
    return () => clearTimeout(t);
  }, [pendingReward, dismissReward]);

  if (!pendingReward) return null;

  return (
    <>
      <style>{`
        @keyframes rewardSlideUp {
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(60px)  rotate(720deg); opacity: 0; }
        }
        .reward-toast { animation: rewardSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .confetti-bit { animation: confettiFall 1s ease-in forwards; position: absolute; width: 6px; height: 6px; border-radius: 2px; }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50 reward-toast">
        {/* Confetti burst */}
        <div className="relative">
          {[
            { color: "#6366F1", left: "10%", delay: "0s" }, { color: "#2EC866", left: "25%", delay: "0.05s" },
            { color: "#F59E0B", left: "40%", delay: "0.1s" }, { color: "#EF4444", left: "55%", delay: "0.05s" },
            { color: "#6366F1", left: "70%", delay: "0.15s" }, { color: "#2EC866", left: "85%", delay: "0s" },
            { color: "#F59E0B", left: "15%", delay: "0.2s" }, { color: "#EF4444", left: "60%", delay: "0.1s" },
            { color: "#6366F1", left: "80%", delay: "0.05s" }, { color: "#2EC866", left: "35%", delay: "0.15s" },
            { color: "#F59E0B", left: "50%", delay: "0.2s" }, { color: "#EF4444", left: "90%", delay: "0s" },
          ].map((c, i) => (
            <div
              key={i}
              className="confetti-bit"
              style={{ backgroundColor: c.color, left: c.left, animationDelay: c.delay, top: 0 }}
            />
          ))}
        </div>

        {/* Toast card */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg min-w-[260px]">
          <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] border border-[#86efac] flex items-center justify-center text-xl flex-shrink-0">
            {pendingReward.emoji}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a] mb-0.5">Pomodoro Complete!</p>
            <p className="text-sm font-bold text-gray-900">{pendingReward.label}</p>
          </div>
          <button
            onClick={dismissReward}
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>
    </>
  );
}
