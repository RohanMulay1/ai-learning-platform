import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { authApi } from "./services/api";
import { useAuthStore } from "./stores/store";

async function bootstrap() {
  // Auto-login with demo account so the app opens directly
  try {
    const { data: tokens } = await authApi.login({
      email: "demo@learnai.dev",
      password: "demo1234",
    });
    const store = useAuthStore.getState();
    store.setTokens(tokens.access_token, tokens.refresh_token);
    const { data: user } = await authApi.me();
    store.setUser(user);
  } catch {
    // already logged in or server not ready — proceed anyway
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
