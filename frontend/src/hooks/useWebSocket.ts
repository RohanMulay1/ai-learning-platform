import { useEffect, useRef, useCallback } from "react";
import { WS_BASE } from "../services/api";
import { useTutorStore } from "../stores/store";
import type { TutorMessage } from "../types";

export function useTutorSocket(sessionId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { addMessage, setConnected } = useTutorStore();

  const connect = useCallback(() => {
    if (!sessionId) return;
    const token = localStorage.getItem("access_token");
    const url = `${WS_BASE}/ws/tutor/${sessionId}?token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);
    ws.current.onerror = () => setConnected(false);

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const msg: TutorMessage = {
        id: data.id || crypto.randomUUID(),
        role: "tutor",
        type: data.type,
        content: data.content,
        intent: data.intent,
        follow_up: data.follow_up,
        mastery_signal: data.mastery_signal,
        audio_url: data.audio_url,
        timestamp: new Date(),
      };
      addMessage(msg);

      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play().catch(() => {});
      }
    };
  }, [sessionId, addMessage, setConnected]);

  const send = useCallback((content: string, type = "message") => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const studentMsg: TutorMessage = {
        id: crypto.randomUUID(),
        role: "student",
        type,
        content,
        timestamp: new Date(),
      };
      addMessage(studentMsg);
      ws.current.send(JSON.stringify({ type, content }));
    }
  }, [addMessage]);

  const disconnect = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    setConnected(false);
  }, [setConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { send, disconnect, reconnect: connect };
}
