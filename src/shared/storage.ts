import { DEFAULT_MODELS, DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants";
import type { AppSettings, CustomAction, PendingTask } from "./types";

function mergeSettings(value?: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...value,
    defaultTargetLanguage:
      value?.defaultTargetLanguage ??
      value?.targetLanguage ??
      DEFAULT_SETTINGS.defaultTargetLanguage,
    providers: {
      openai: {
        ...DEFAULT_SETTINGS.providers.openai,
        ...value?.providers?.openai,
      },
      gemini: {
        ...DEFAULT_SETTINGS.providers.gemini,
        ...value?.providers?.gemini,
      },
    },
    customActions: (
      (value?.customActions ?? []) as Array<
        Partial<CustomAction> & { id: string; name: string; instruction?: string }
      >
    ).map((action) => ({
      id: action.id,
      name: action.name,
      icon: action.icon ?? "✨",
      rolePrompt: action.rolePrompt ?? "",
      commandPrompt: action.commandPrompt ?? action.instruction ?? "",
      outputFormat: action.outputFormat ?? "text",
      provider: action.provider,
      model: action.model,
    })),
  };

  for (const provider of ["openai", "gemini"] as const) {
    const providerSettings = merged.providers[provider];
    const selectableModels = new Set([
      DEFAULT_MODELS[provider],
      ...providerSettings.discoveredModels,
    ]);
    if (!selectableModels.has(providerSettings.model)) {
      providerSettings.model = DEFAULT_MODELS[provider];
    }
  }

  merged.customActions = merged.customActions.map((action) => {
    if (!action.provider) return { ...action, model: undefined };
    const providerSettings = merged.providers[action.provider];
    const selectableModels = new Set([
      DEFAULT_MODELS[action.provider],
      ...providerSettings.discoveredModels,
    ]);
    return {
      ...action,
      model:
        action.model && selectableModels.has(action.model)
          ? action.model
          : undefined,
    };
  });

  return merged;
}

export async function loadSettings(): Promise<AppSettings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return mergeSettings(data[STORAGE_KEYS.settings] as Partial<AppSettings>);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function loadPendingTask(): Promise<PendingTask | undefined> {
  const data = await chrome.storage.session.get(STORAGE_KEYS.pendingTask);
  return data[STORAGE_KEYS.pendingTask] as PendingTask | undefined;
}
