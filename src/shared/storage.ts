import {
  DEFAULT_MODELS,
  DEFAULT_SETTINGS,
  PROVIDER_IDS,
  SPEECH_PROVIDER_IDS,
  STORAGE_KEYS,
  isProviderId,
  isSpeechProviderId,
  isThemePreference,
} from "./constants";
import type { AppSettings, CustomAction, PendingTask } from "./types";

function mergeSettings(value?: Partial<AppSettings>): AppSettings {
  const providers = Object.fromEntries(
    PROVIDER_IDS.map((provider) => [
      provider,
      {
        ...DEFAULT_SETTINGS.providers[provider],
        ...value?.providers?.[provider],
      },
    ]),
  ) as AppSettings["providers"];

  const speechProviders = Object.fromEntries(
    SPEECH_PROVIDER_IDS.map((provider) => [
      provider,
      {
        ...DEFAULT_SETTINGS.speech.providers[provider],
        ...value?.speech?.providers?.[provider],
      },
    ]),
  ) as AppSettings["speech"]["providers"];

  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...value,
    speech: {
      provider: isSpeechProviderId(value?.speech?.provider)
        ? value.speech.provider
        : DEFAULT_SETTINGS.speech.provider,
      providers: speechProviders,
    },
    provider: isProviderId(value?.provider)
      ? value.provider
      : DEFAULT_SETTINGS.provider,
    theme: isThemePreference(value?.theme)
      ? value.theme
      : DEFAULT_SETTINGS.theme,
    defaultTargetLanguage:
      value?.defaultTargetLanguage ??
      value?.targetLanguage ??
      DEFAULT_SETTINGS.defaultTargetLanguage,
    providers,
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
      provider: isProviderId(action.provider) ? action.provider : undefined,
      model: action.model,
    })),
  };

  for (const provider of PROVIDER_IDS) {
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
