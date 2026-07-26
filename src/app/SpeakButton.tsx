import { Icon } from "./Icon";
import type { Speaker } from "./use-speech";

interface SpeakButtonProps {
  /** Distinguishes this button from every other one sharing the speaker. */
  id: string;
  label: string;
  text: string;
  language?: string;
  speaker: Speaker;
}

export function SpeakButton({
  id,
  label,
  text,
  language,
  speaker,
}: SpeakButtonProps) {
  const active = speaker.activeId === id;
  const loading = active && speaker.pending;
  const title = active ? `Stop reading ${label}` : `Read ${label} aloud`;

  return (
    <button
      aria-label={title}
      className={`icon-button small speak-button ${active ? "speaking" : ""}`}
      disabled={!text.trim() || !speaker.ready}
      title={title}
      onClick={() => speaker.toggle(id, text, language)}
    >
      {loading ? (
        <span className="speak-spinner" aria-hidden="true" />
      ) : (
        <Icon name={active ? "stop" : "volume-up"} size={20} />
      )}
    </button>
  );
}
