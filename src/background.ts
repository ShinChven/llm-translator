import { STORAGE_KEYS } from "./shared/constants";
import {
  generateWithGemini,
  listGeminiModels,
} from "./providers/gemini";
import {
  generateWithOpenAI,
  listOpenAIModels,
} from "./providers/openai";
import { loadSettings } from "./shared/storage";
import type {
  GenerationPortEvent,
  GenerationPortMessage,
  PendingTask,
  ProcessTaskMessage,
  RuntimeRequest,
  RuntimeResponse,
} from "./shared/types";

const PROCESS_SELECTION = "process-selection";
const OPEN_TRANSLATOR = "open-translator";

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== PROCESS_SELECTION && info.menuItemId !== OPEN_TRANSLATOR) {
    return;
  }

  const task: PendingTask = {
    id: crypto.randomUUID(),
    source: info.selectionText ?? "",
    createdAt: Date.now(),
    autoRun: info.menuItemId === PROCESS_SELECTION,
    actionId: "translate",
    pageUrl: info.pageUrl,
    pageTitle: tab?.title,
  };

  // `sidePanel.open()` must run directly inside the user gesture callback.
  // Waiting for storage first causes Chrome to reject the request.
  void chrome.storage.session.set({ [STORAGE_KEYS.pendingTask]: task });

  const taskMessage: ProcessTaskMessage = { type: "process-task", task };
  // Deliver immediately when a side panel is already alive.
  void chrome.runtime.sendMessage(taskMessage).catch(() => undefined);

  let openPanel: Promise<void> | undefined;
  if (tab?.id !== undefined) {
    openPanel = chrome.sidePanel.open({ tabId: tab.id });
  } else if (tab?.windowId !== undefined) {
    openPanel = chrome.sidePanel.open({ windowId: tab.windowId });
  }

  if (openPanel) {
    // A newly created panel may not have registered its listener during the
    // immediate delivery, so deliver the same task again after it opens.
    void openPanel
      .then(() => chrome.runtime.sendMessage(taskMessage))
      .catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeRequest,
    _sender,
    sendResponse: (response: RuntimeResponse) => void,
  ) => {
    if (message.type !== "list-models") return false;

    void (async () => {
      try {
        const settings = await loadSettings();
        const apiKey = settings.providers[message.provider].apiKey.trim();
        if (!apiKey) throw new Error("Enter and save an API key first.");

        const models =
          message.provider === "openai"
            ? await listOpenAIModels(apiKey)
            : await listGeminiModels(apiKey);

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
        const apiKey = settings.providers[request.provider].apiKey.trim();
        if (!apiKey) throw new Error("Add an API key in Settings.");
        if (!request.model.trim()) throw new Error("Choose a model.");

        post({ type: "started", requestId: request.requestId });
        const onResult = (result: string) => {
          if (result) {
            post({ type: "delta", requestId: request.requestId, result });
          }
        };

        const generatedResult =
          request.provider === "openai"
            ? await generateWithOpenAI(
                apiKey,
                request,
                controller!.signal,
                onResult,
              )
            : await generateWithGemini(
                apiKey,
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
