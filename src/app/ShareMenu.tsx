import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

type SharePlatform =
  | "x"
  | "threads"
  | "facebook"
  | "linkedin"
  | "truth"
  | "reddit";

interface ShareMenuProps {
  result: string;
}

const PLATFORMS: Array<{
  id: SharePlatform;
  label: string;
  mark: string;
}> = [
  { id: "x", label: "X", mark: "𝕏" },
  { id: "threads", label: "Threads", mark: "@" },
  { id: "facebook", label: "Facebook", mark: "f" },
  { id: "linkedin", label: "LinkedIn", mark: "in" },
  { id: "truth", label: "Truth Social", mark: "T" },
  { id: "reddit", label: "Reddit", mark: "r" },
];

function truncate(text: string, maximumLength: number): {
  text: string;
  truncated: boolean;
} {
  const normalized = text.trim();
  if (normalized.length <= maximumLength) {
    return { text: normalized, truncated: false };
  }
  return {
    text: `${normalized.slice(0, maximumLength - 1).trimEnd()}…`,
    truncated: true,
  };
}

function shareUrl(
  platform: SharePlatform,
  result: string,
): { url: string; copyResult: boolean; excerpted: boolean } {
  const title = truncate(result.split("\n")[0], 280).text;

  switch (platform) {
    case "x": {
      const excerpt = truncate(result, 275);
      const url = new URL("https://x.com/intent/tweet");
      url.searchParams.set("text", excerpt.text);
      return {
        url: url.toString(),
        copyResult: excerpt.truncated,
        excerpted: excerpt.truncated,
      };
    }
    case "threads": {
      const excerpt = truncate(result, 480);
      const url = new URL("https://www.threads.com/intent/post");
      url.searchParams.set("text", excerpt.text);
      return {
        url: url.toString(),
        copyResult: excerpt.truncated,
        excerpted: excerpt.truncated,
      };
    }
    case "truth": {
      const excerpt = truncate(result, 480);
      const url = new URL("https://truthsocial.com/share");
      url.searchParams.set("text", excerpt.text);
      return {
        url: url.toString(),
        copyResult: excerpt.truncated,
        excerpted: excerpt.truncated,
      };
    }
    case "facebook": {
      return {
        url: "https://www.facebook.com/",
        copyResult: true,
        excerpted: false,
      };
    }
    case "linkedin": {
      return {
        url: "https://www.linkedin.com/feed/?shareActive=true",
        copyResult: true,
        excerpted: false,
      };
    }
    case "reddit": {
      const url = new URL("https://www.reddit.com/submit");
      url.searchParams.set("title", title);
      url.searchParams.set("type", "TEXT");
      url.searchParams.set("selftext", result.trim());
      return { url: url.toString(), copyResult: false, excerpted: false };
    }
  }
}

async function copyResult(result: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(result);
    return true;
  } catch {
    return false;
  }
}

export function ShareMenu({ result }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const shareToPlatform = async (platform: SharePlatform) => {
    const destination = shareUrl(platform, result);
    const copied = destination.copyResult
      ? await copyResult(result)
      : false;

    await chrome.tabs.create({ url: destination.url });
    setOpen(false);
    setNotice(
      copied
        ? destination.excerpted
          ? "The composer opened with an excerpt. The full result was copied."
          : "The sharing page opened. The result was copied."
        : "The sharing page opened.",
    );
  };

  const shareMore = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: result,
        });
        setOpen(false);
        setNotice("The system share sheet opened.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyResult(result);
    setOpen(false);
    setNotice(
      copied
        ? "The result was copied for sharing."
        : "The system share sheet is unavailable.",
    );
  };

  return (
    <div className="share-control" ref={rootRef}>
      <button
        className={`icon-button small ${open ? "selected" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Share result"
        title="Share result"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="share" size={20} />
      </button>

      {open && (
        <div className="share-menu" role="menu" aria-label="Share result to">
          <div className="share-menu-heading">Share result</div>
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              role="menuitem"
              onClick={() => void shareToPlatform(platform.id)}
            >
              <span
                className={`social-mark ${platform.id}`}
                aria-hidden="true"
              >
                {platform.mark}
              </span>
              {platform.label}
            </button>
          ))}
          <div className="share-menu-divider" />
          <button role="menuitem" onClick={() => void shareMore()}>
            <span className="social-mark more" aria-hidden="true">
              …
            </span>
            More apps
          </button>
        </div>
      )}

      <span className="visually-hidden" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
