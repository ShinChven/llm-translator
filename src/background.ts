import { STORAGE_KEYS } from "./shared/constants";
import {
  generateWithProvider,
  listProviderModels,
} from "./providers/registry";
import { providerOriginPattern } from "./shared/provider-url";
import { loadSettings } from "./shared/storage";
import type {
  GenerationPortEvent,
  GenerationPortMessage,
  PendingTask,
  ProcessTaskMessage,
  ProviderId,
  RuntimeRequest,
  ModelListResponse,
  PageContentResponse,
} from "./shared/types";

const PROCESS_SELECTION = "process-selection";
const OPEN_TRANSLATOR = "open-translator";
const TRANSLATE_SELECTION_COMMAND = "translate-selection";

async function ensureProviderHostPermission(
  provider: ProviderId,
  baseUrl: string,
): Promise<void> {
  if (provider !== "litellm") return;

  const origin = providerOriginPattern(baseUrl);
  const granted = await chrome.permissions.contains({ origins: [origin] });
  if (!granted) {
    throw new Error(
      "LiteLLM endpoint access is not authorized. Open Settings and save or discover models again.",
    );
  }
}

async function createContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: PROCESS_SELECTION,
    title: 'Translate “%s”',
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: OPEN_TRANSLATOR,
    title: "Open LLM Translator",
    contexts: ["page", "editable"],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void createContextMenus();
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  void createContextMenus();
});

/**
 * Must run directly inside the user gesture callback. Waiting on anything
 * first — storage, script injection — causes Chrome to reject the request.
 */
function openSidePanel(tab?: chrome.tabs.Tab): Promise<void> | undefined {
  if (tab?.id !== undefined) return chrome.sidePanel.open({ tabId: tab.id });
  if (tab?.windowId !== undefined) {
    return chrome.sidePanel.open({ windowId: tab.windowId });
  }
  return undefined;
}

function deliverTask(task: PendingTask, openPanel?: Promise<void>): void {
  const stored = chrome.storage.session
    .set({
      [STORAGE_KEYS.pendingTask]: task,
    })
    .catch(() => undefined);
  const taskMessage: ProcessTaskMessage = { type: "process-task", task };

  // Deliver immediately when a side panel is already alive.
  void stored
    .then(() => chrome.runtime.sendMessage(taskMessage))
    .catch(() => undefined);

  if (openPanel) {
    // A newly created panel may not have registered its listener during the
    // immediate delivery, so deliver the same task again after it opens.
    void Promise.all([stored, openPanel])
      .then(() => chrome.runtime.sendMessage(taskMessage))
      .catch(() => undefined);
  }
}

/**
 * The commands API reports no selection of its own, so read it from the page.
 * `activeTab`, granted by the shortcut itself, authorizes the injection.
 */
async function readSelection(tabId: number): Promise<string> {
  const readFrames = async (allFrames: boolean): Promise<string> => {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames },
      // Self-contained by necessity: this runs in the page, not here.
      func: () => {
        const focused = document.activeElement;
        // A selection inside a form field is not part of the document
        // selection, so `getSelection()` would come back empty for it.
        if (
          (focused instanceof HTMLInputElement ||
            focused instanceof HTMLTextAreaElement) &&
          focused.selectionStart !== focused.selectionEnd
        ) {
          return focused.value.slice(
            focused.selectionStart ?? 0,
            focused.selectionEnd ?? 0,
          );
        }
        return window.getSelection()?.toString() ?? "";
      },
    });
    for (const injection of injections) {
      if (typeof injection.result === "string" && injection.result.trim()) {
        return injection.result;
      }
    }
    return "";
  };

  try {
    // `activeTab` may not cover cross-origin subframes; fall back to the main
    // frame rather than losing the selection when the wider target is refused.
    return await readFrames(true).catch(() => readFrames(false));
  } catch (error) {
    // Restricted pages — chrome://, the Web Store — refuse injection. Log it:
    // a silent empty selection is indistinguishable from selecting nothing.
    console.warn("LLM Translator: could not read the page selection.", error);
    return "";
  }
}

async function activeTabForCommand(
  tab?: chrome.tabs.Tab,
): Promise<chrome.tabs.Tab | undefined> {
  if (tab) return tab;
  const [active] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return active;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== PROCESS_SELECTION && info.menuItemId !== OPEN_TRANSLATOR) {
    return;
  }

  const openPanel = openSidePanel(tab);
  if (info.menuItemId === OPEN_TRANSLATOR) return;

  const task: PendingTask = {
    id: crypto.randomUUID(),
    source: info.selectionText ?? "",
    createdAt: Date.now(),
    autoRun: info.menuItemId === PROCESS_SELECTION,
    actionId: "translate",
    pageUrl: info.pageUrl,
    pageTitle: tab?.title,
  };

  deliverTask(task, openPanel);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== TRANSLATE_SELECTION_COMMAND) return;

  // Read the selection before handing focus to the panel, and start both in
  // this same tick so `sidePanel.open()` still counts as the gesture.
  const selection = activeTabForCommand(tab).then((target) =>
    target?.id === undefined ? "" : readSelection(target.id),
  );
  const openPanel = openSidePanel(tab);

  void selection.then((source) => {
    deliverTask(
      {
        id: crypto.randomUUID(),
        source,
        createdAt: Date.now(),
        // Nothing selected: open the panel and let the user type or paste.
        autoRun: Boolean(source.trim()),
        actionId: "translate",
        pageUrl: tab?.url,
        pageTitle: tab?.title,
      },
      openPanel,
    );
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeRequest,
    _sender,
    sendResponse: (response: ModelListResponse | PageContentResponse) => void,
  ) => {
    if (message.type === "read-page-content") {
      void (async () => {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          if (tab?.id === undefined) {
            throw new Error("No active webpage was found.");
          }

          const [injection] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const root =
                document.querySelector("article") ??
                document.querySelector("main") ??
                document.body;
              if (!root) return { title: document.title, content: "" };

              const copy = root.cloneNode(true) as HTMLElement;
              copy
                .querySelectorAll(
                  [
                    "script",
                    "style",
                    "noscript",
                    "nav",
                    "header",
                    "footer",
                    "aside",
                    "form",
                    "button",
                    "input",
                    "select",
                    "textarea",
                    "svg",
                    "canvas",
                    "dialog",
                    "[hidden]",
                    '[aria-hidden="true"]',
                  ].join(","),
                )
                .forEach((element) => element.remove());

              const content = (copy.innerText || copy.textContent || "")
                .replace(/\u00a0/g, " ")
                .replace(/[ \t]+\n/g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim()
                .slice(0, 120_000);
              return { title: document.title.trim(), content };
            },
          });

          const page = injection?.result;
          if (!page?.content) {
            throw new Error("No readable content was found on this page.");
          }
          sendResponse({
            ok: true,
            title: page.title,
            content: page.title
              ? `${page.title}\n\n${page.content}`
              : page.content,
          });
        } catch (error) {
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? `Could not read this page. ${error.message} Try an ordinary http(s) page opened through the extension.`
                : "Could not read this page.",
          });
        }
      })();
      return true;
    }

    if (message.type !== "list-models") return false;

    void (async () => {
      try {
        const settings = await loadSettings();
        const providerSettings = settings.providers[message.provider];
        await ensureProviderHostPermission(
          message.provider,
          providerSettings.baseUrl,
        );
        const models = await listProviderModels(
          message.provider,
          providerSettings,
        );

        sendResponse({ ok: true, models });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Could not list models.",
        });
      }
    })();

    return true;
  },
);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "generation") return;

  let controller: AbortController | undefined;

  port.onMessage.addListener((message: GenerationPortMessage) => {
    if (message.type === "cancel") {
      controller?.abort();
      return;
    }

    controller?.abort();
    controller = new AbortController();
    const { request } = message;

    void (async () => {
      const post = (event: GenerationPortEvent) => port.postMessage(event);
      try {
        const settings = await loadSettings();
        const providerSettings = settings.providers[request.provider];
        await ensureProviderHostPermission(
          request.provider,
          providerSettings.baseUrl,
        );

        post({ type: "started", requestId: request.requestId });
        const onResult = (result: string) => {
          if (result) {
            post({ type: "delta", requestId: request.requestId, result });
          }
        };

        const generatedResult = await generateWithProvider(
          request.provider,
          providerSettings,
          request,
          controller!.signal,
          onResult,
        );

        post({
          type: "complete",
          requestId: request.requestId,
          result: generatedResult.result,
          swapText: generatedResult.swapText,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        post({
          type: "error",
          requestId: request.requestId,
          message: error instanceof Error ? error.message : "Generation failed.",
        });
      }
    })();
  });

  port.onDisconnect.addListener(() => controller?.abort());
});
