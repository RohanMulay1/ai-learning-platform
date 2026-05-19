import { useState, useRef, useCallback } from "react";

// Browser Speech Recognition types are not in the default TypeScript lib
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionResultEvent extends Event {
    results: SpeechRecognitionResultList;
  }
}

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
}

export function useVoice({ onTranscript, onError }: UseVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SR) {
      onError?.("Speech recognition not supported in this browser.");
      return;
    }

    recognition.current = new SR();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-US";

    recognition.current.onresult = (e: SpeechRecognitionResultEvent) => {
      const transcript = e.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.current.onerror = () => {
      onError?.("Could not understand audio. Please try again.");
      setIsListening(false);
    };

    recognition.current.onend = () => setIsListening(false);

    recognition.current.start();
    setIsListening(true);
  }, [onTranscript, onError]);

  const stopListening = useCallback(() => {
    recognition.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}
