import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../services/api";
import { useAuthStore } from "../../stores/store";

const CODE_LINES = [
  { text: "def two_sum(nums, target):", color: "#c792ea" },
  { text: "    seen = {}", color: "#82aaff" },
  { text: "    for i, n in enumerate(nums):", color: "#c792ea" },
  { text: "        if target - n in seen:", color: "#c792ea" },
  { text: "            return [seen[target-n], i]", color: "#c3e88d" },
  { text: "        seen[n] = i", color: "#82aaff" },
];

const STATS = [
  { value: "12", label: "Algorithms" },
  { value: "92%", label: "Mastery" },
  { value: "12", label: "Day streak" },
];

function AnimatedCode() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible((v) => (v < CODE_LINES.length ? v + 1 : v));
    }, 350);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-mono text-sm leading-7 bg-gray-950/60 rounded-xl border border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-gray-500 text-xs">two_sum.py</span>
      </div>
      {CODE_LINES.map((line, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            color: line.color,
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? "translateX(0)" : "translateX(-8px)",
          }}
        >
          <span className="text-gray-600 select-none mr-4">{i + 1}</span>
          {line.text}
        </div>
      ))}
      {visible < CODE_LINES.length && (
        <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
      )}
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("demo@learnai.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser, setTokens } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: tokens } = await authApi.login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      const { data: user } = await authApi.me();
      setUser(user);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex overflow-hidden">
      {/* animated gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-700/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-700/15 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-800/10 blur-[100px]" />
      </div>

      {/* LEFT — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative p-14">
        {/* logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">NeuralPath</span>
        </div>

        {/* headline */}
        <div className="space-y-8 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              AI-Powered Socratic Learning
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Master algorithms
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                by thinking, not copying.
              </span>
            </h1>
            <p className="mt-5 text-lg text-gray-400 leading-relaxed">
              Your AI tutor asks the right questions. You find the answer yourself. That's how mastery actually sticks.
            </p>
          </div>

          <AnimatedCode />

          {/* stats row */}
          <div className="flex gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* feature pills */}
          <div className="flex flex-wrap gap-2">
            {["SM-2 Spaced Repetition", "Live Code Execution", "Voice Tutor", "Skill Graph"].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-sm">© 2025 NeuralPath · Built for serious learners</p>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* glass card */}
        <div className="w-full max-w-[420px] bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          {/* mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">NeuralPath</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-1">Continue your learning streak</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all duration-200"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs text-purple-400 hover:text-purple-300 transition">Forgot?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.07] transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white overflow-hidden group transition-all duration-200 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            >
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200 rounded-xl" />
              <span className="relative">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : "Continue →"}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-500 text-sm">
              New here?{" "}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition">
                Create free account
              </Link>
            </p>
          </div>

          {/* demo hint */}
          <div className="mt-4 bg-purple-500/5 border border-purple-500/15 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-gray-500">
              Demo pre-filled · just hit <span className="text-purple-400 font-medium">Continue →</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
