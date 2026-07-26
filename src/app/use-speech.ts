import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_PROVIDER_DEFINITIONS } from "../shared/constants";
import {
  hasCachedSpeech,
  isSpeechProviderReady,
  speak,
} from "../providers/speech";
import type { AppSettings } from "../shared/types";

/** Browser voices arrive asynchronously on first load in Chrome. */
export function useBrowserVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synthesis = window.speechSynthesis;
    const update = () => setVoices(synthesis.getVoices());
    update();
    synthesis.addEventListener("voiceschanged", update);
    return () => synthesis.removeEventListener("voiceschanged", update);
  }, []);

  return voices;
}

export interface Speaker {
  /** Identifier of whatever is currently playing, if anything. */
  activeId?: string;
  /** True while a cloud engine is synthesizing and no audio plays yet. */
  pending: boolean;
  error: string;
  ready: boolean;
  play: (id: string, text: string, language?: string) => void;
  toggle: (id: string, text: string, language?: string) => void;
  stop: () => void;
  dismissError: () => void;
}

/**
 * Single playback slot shared by every speak button, so starting one
 * automatically stops another.
 */
export function useSpeaker(settings: AppSettings | null): Speaker {
  const [activeId, setActiveId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | undefined>(undefined);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = undefined;
    setActiveId(undefined);
    setPending(false);
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const speechProvider = settings?.speech.provider ?? "webspeech";
  const ready = settings ? isSpeechProviderReady(speechProvider, settings) : false;
  const definition = SPEECH_PROVIDER_DEFINITIONS[speechProvider];
  const apiKey =
    settings && definition.credentialProvider
      ? settings.providers[definition.credentialProvider].apiKey.trim()
      : "";
  const voice = settings?.speech.providers[speechProvider].voice ?? "";

  // A provider or voice change mid-playback would keep speaking the old voice.
  useEffect(() => stop, [speechProvider, voice, stop]);

  const play = useCallback(
    (id: string, text: string, language?: string) => {
      stop();
      if (!text.trim() || !ready) return;

      const abort = new AbortController();
      controller.current = abort;
      setActiveId(id);
      setError("");
      // Cached audio plays immediately, so skip the synthesizing indicator.
      setPending(
        speechProvider !== "webspeech" &&
          !hasCachedSpeech(speechProvider, text, voice),
      );

      speak({
        provider: speechProvider,
        text,
        voice,
        apiKey,
        language,
        signal: abort.signal,
      })
        .catch((cause: unknown) => {
          if (abort.signal.aborted) return;
          setError(
            cause instanceof Error ? cause.message : "Could not play this text.",
          );
        })
        .finally(() => {
          // A newer request may already own the slot; leave its state alone.
          if (controller.current !== abort) return;
          controller.current = undefined;
          setActiveId(undefined);
          setPending(false);
        });
    },
    [apiKey, ready, speechProvider, stop, voice],
  );

  const toggle = useCallback(
    (id: string, text: string, language?: string) => {
      if (activeId === id) {
        stop();
        return;
      }
      play(id, text, language);
    },
    [activeId, play, stop],
  );

  return {
    activeId,
    pending,
    error,
    ready,
    play,
    toggle,
    stop,
    dismissError: () => setError(""),
  };
}
