import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; first_name?: string; last_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// Challenges
export const challengeApi = {
  list: (params?: { page?: number; limit?: number; difficulty?: string }) =>
    api.get("/challenges", { params }),
  get: (id: string) => api.get(`/challenges/${id}`),
  attempt: (id: string, data: { code: string; language: string; explanation?: string }) =>
    api.post(`/challenges/${id}/attempt`, data),
  hint: (id: string, level: number) => api.post(`/challenges/${id}/hint`, { hint_level: level }),
  generate: (data: { skill_id: string; difficulty: string; topic?: string }) =>
    api.post("/challenges/generate", data),
};

// Assessment
export const assessmentApi = {
  start: (topic: string) => api.post(`/assessment/start?topic=${encodeURIComponent(topic)}`),
  submit: (data: { session_id: string; question_id: string; answer: string }) =>
    api.post("/assessment/submit", data),
  result: (session_id: string) => api.get(`/assessment/result/${session_id}`),
};

// Spaced repetition
export const reviewApi = {
  queue: () => api.get("/review/queue"),
  submit: (challenge_id: string, quality: number) =>
    api.post(`/review/${challenge_id}`, { quality }),
  stats: () => api.get("/review/stats"),
};

// Progress
export const progressApi = {
  snapshot: () => api.get("/progress/snapshot"),
  timeline: (time_range: string) => api.get("/progress/timeline", { params: { time_range } }),
  heatmap: (year: number) => api.get("/progress/heatmap", { params: { year } }),
};

// Gamification
export const gamificationApi = {
  streaks: () => api.get("/streaks"),
  badges: () => api.get("/badges"),
  xp: () => api.get("/xp"),
};

// Simulation
export const simulationApi = {
  run: (data: { code: string; language: string; test_cases?: unknown[] }) =>
    api.post("/simulation/run", data),
  visualize: (data: { code: string; language: string; algorithm: string }) =>
    api.post("/simulation/visualize", data),
};

// Tutor session
export const tutorApi = {
  startSession: (data: { challenge_id?: string; topic?: string }) =>
    api.post("/tutor/session", data),
};

export const WS_BASE = (import.meta.env.VITE_WS_URL || "ws://localhost:8000/api/v1");
