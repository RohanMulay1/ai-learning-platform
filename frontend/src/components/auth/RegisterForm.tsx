import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../services/api";
import { useAuthStore } from "../../stores/store";

export function RegisterForm() {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser, setTokens } = useAuthStore();
  const navigate = useNavigate();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: tokens } = await authApi.register(form);
      setTokens(tokens.access_token, tokens.refresh_token);
      const { data: user } = await authApi.me();
      setUser(user);
      navigate("/onboarding");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">LearnAI</h1>
          <p className="text-gray-400">Start learning by doing</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First name</label>
                <input
                  value={form.first_name}
                  onChange={update("first_name")}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last name</label>
                <input
                  value={form.last_name}
                  onChange={update("last_name")}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition"
            >
              {loading ? "Creating account..." : "Get started — it's free"}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
