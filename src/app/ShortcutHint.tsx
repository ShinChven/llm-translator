import { useEffect, useState } from "react";

const COMMAND_NAME = "translate-selection";

/** Matches the manifest's suggested key, rendered the way Chrome shows it. */
const SUGGESTED_SHORTCUT = navigator.userAgent.includes("Mac")
  ? "⌥T"
  : "Alt+T";

/**
 * Quiet reminder of the key that pulls a page selection into this panel.
 * The user may rebind or clear the command, so trust `chrome.commands` over
 * the manifest and stay silent once the command has no key at all.
 */
export function ShortcutHint() {
  const [shortcut, setShortcut] = useState<string | undefined>(
    SUGGESTED_SHORTCUT,
  );

  useEffect(() => {
    chrome.commands.getAll((commands) => {
      const bound = commands
        .find((command) => command.name === COMMAND_NAME)
        ?.shortcut?.trim();
      setShortcut(bound || undefined);
    });
  }, []);

  if (!shortcut) return null;

  return (
    <p className="shortcut-hint">
      Press <kbd>{shortcut}</kbd> on any page to translate the selection here.
    </p>
  );
}
