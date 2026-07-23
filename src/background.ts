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
  RuntimeResponse,
} from "./shared/types";

const PROCESS_SELECTION = "process-selection";
const OPEN_TRANSLATOR = "open-translator";

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
