import type {
  AppSettings,
  BuiltInActionId,
  ProviderId,
  SpeechProviderId,
  ThemePreference,
} from "./types";

export const THEME_OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export const PROVIDER_IDS: readonly ProviderId[] = [
  "openai",
  "gemini",
  "claude",
  "grok",
  "openrouter",
  "litellm",
];

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-5.6-luna",
  gemini: "gemini-3.5-flash-lite",
  claude: "claude-haiku-4-5",
  grok: "grok-latest",
  openrouter: "openrouter/auto",
  litellm: "",
};

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  endpoint?: string;
  apiKeyRequired: boolean;
  apiKeyPlaceholder: string;
  configurableBaseUrl: boolean;
}

export const PROVIDER_DEFINITIONS: Record<ProviderId, ProviderDefinition> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    apiKeyRequired: true,
    apiKeyPlaceholder: "sk-…",
    configurableBaseUrl: false,
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyRequired: true,
    apiKeyPlaceholder: "AI…",
    configurableBaseUrl: false,
  },
  claude: {
    id: "claude",
    label: "Claude",
    endpoint: "https://api.anthropic.com/v1",
    apiKeyRequired: true,
    apiKeyPlaceholder: "sk-ant-…",
    configurableBaseUrl: false,
  },
  grok: {
    id: "grok",
    label: "Grok",
    endpoint: "https://api.x.ai/v1",
    apiKeyRequired: true,
    apiKeyPlaceholder: "xai-…",
    configurableBaseUrl: false,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1",
    apiKeyRequired: true,
    apiKeyPlaceholder: "sk-or-v1-…",
    configurableBaseUrl: false,
  },
  litellm: {
    id: "litellm",
    label: "LiteLLM",
    apiKeyRequired: false,
    apiKeyPlaceholder: "Optional proxy key",
    configurableBaseUrl: true,
  },
};

export function providerLabel(provider: ProviderId): string {
  return PROVIDER_DEFINITIONS[provider].label;
}

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" &&
    (PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export const SPEECH_PROVIDER_IDS: readonly SpeechProviderId[] = [
  "webspeech",
  "gemini",
  "openai",
];

export interface SpeechProviderDefinition {
  id: SpeechProviderId;
  label: string;
  description: string;
  /** Text provider whose API key and host permission this engine reuses. */
  credentialProvider?: ProviderId;
  model?: string;
}

export const SPEECH_PROVIDER_DEFINITIONS: Record<
  SpeechProviderId,
  SpeechProviderDefinition
> = {
  webspeech: {
    id: "webspeech",
    label: "Browser",
    description:
      "Chrome's built-in Web Speech API. Starts instantly, works offline, and needs no API key.",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    description:
      "Gemini TTS with 30 voices and broad language coverage. Audio streams as it is generated. Reuses your Gemini API key.",
    credentialProvider: "gemini",
    model: "gemini-3.1-flash-tts-preview",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    description:
      "OpenAI Speech API with 13 voices. Audio streams as it is generated. Reuses your OpenAI API key.",
    credentialProvider: "openai",
    model: "gpt-4o-mini-tts",
  },
};

/** Sampled at random so repeated voice previews stay distinguishable. */
export const SPEECH_TEST_PHRASES = [
  "The quick brown fox jumps over the lazy dog.",
  "A voice is a fingerprint you can hear.",
  "Pack my box with five dozen liquor jugs.",
  "Every translation is a small act of interpretation.",
  "She sells seashells by the seashore.",
  "The early bird catches the worm, but the second mouse gets the cheese.",
  "How much wood would a woodchuck chuck?",
  "Language is the road map of a culture.",
] as const;

export function speechProviderLabel(provider: SpeechProviderId): string {
  return SPEECH_PROVIDER_DEFINITIONS[provider].label;
}

export function isSpeechProviderId(value: unknown): value is SpeechProviderId {
  return (
    typeof value === "string" &&
    (SPEECH_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function randomSpeechTestPhrase(): string {
  const index = Math.floor(Math.random() * SPEECH_TEST_PHRASES.length);
  return SPEECH_TEST_PHRASES[index];
}

export const REPOSITORY_URL = "https://github.com/ShinChven/llm-translator";

export const AUTHOR = {
  name: "ShinChven",
  email: "shinchven@gmail.com",
} as const;

export const LICENSE = {
  name: "MIT License",
  url: `${REPOSITORY_URL}/blob/main/LICENSE`,
} as const;

/**
 * The installed version. Release tooling keeps the manifest in step with
 * package.json and the release tag, so this is what the user actually has.
 */
export function extensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

export const STORAGE_KEYS = {
  settings: "appSettings",
  pendingTask: "pendingTask",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  theme: "system",
  sourceLanguage: "auto",
  targetLanguage: "en",
  defaultTargetLanguage: "en",
  providers: {
    openai: {
      apiKey: "",
      baseUrl: "",
      model: DEFAULT_MODELS.openai,
      discoveredModels: [],
    },
    gemini: {
      apiKey: "",
      baseUrl: "",
      model: DEFAULT_MODELS.gemini,
      discoveredModels: [],
    },
    claude: {
      apiKey: "",
      baseUrl: "",
      model: DEFAULT_MODELS.claude,
      discoveredModels: [],
    },
    grok: {
      apiKey: "",
      baseUrl: "",
      model: DEFAULT_MODELS.grok,
      discoveredModels: [],
    },
    openrouter: {
      apiKey: "",
      baseUrl: "",
      model: DEFAULT_MODELS.openrouter,
      discoveredModels: [],
    },
    litellm: {
      apiKey: "",
      baseUrl: "http://localhost:4000/v1",
      model: DEFAULT_MODELS.litellm,
      discoveredModels: [],
    },
  },
  customActions: [],
  speech: {
    autoPlayResult: false,
    provider: "webspeech",
    providers: {
      webspeech: { voice: "" },
      gemini: { voice: "Kore" },
      openai: { voice: "alloy" },
    },
  },
};

export const BUILT_IN_ACTIONS: Array<{
  id: BuiltInActionId;
  icon: string;
  label: string;
}> = [
  { id: "translate", icon: "🌐", label: "Translate" },
  { id: "polish", icon: "✨", label: "Polish" },
  { id: "summarize", icon: "📝", label: "Summarize" },
  { id: "what", icon: "❓", label: "What" },
  { id: "how", icon: "🛠️", label: "How" },
  { id: "why", icon: "💡", label: "Why" },
];

export const LANGUAGES = [
  ["auto", "Detect language"],
  ["af", "Afrikaans"],
  ["sq", "Albanian"],
  ["ar", "Arabic"],
  ["hy", "Armenian"],
  ["az", "Azerbaijani"],
  ["eu", "Basque"],
  ["be", "Belarusian"],
  ["bn", "Bengali"],
  ["bs", "Bosnian"],
  ["bg", "Bulgarian"],
  ["ca", "Catalan"],
  ["zh-CN", "Chinese (Simplified)"],
  ["zh-TW", "Chinese (Traditional)"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["en", "English"],
  ["et", "Estonian"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["gl", "Galician"],
  ["ka", "Georgian"],
  ["de", "German"],
  ["el", "Greek"],
  ["gu", "Gujarati"],
  ["he", "Hebrew"],
  ["hi", "Hindi"],
  ["hu", "Hungarian"],
  ["is", "Icelandic"],
  ["id", "Indonesian"],
  ["ga", "Irish"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["kn", "Kannada"],
  ["kk", "Kazakh"],
  ["ko", "Korean"],
  ["lv", "Latvian"],
  ["lt", "Lithuanian"],
  ["mk", "Macedonian"],
  ["ms", "Malay"],
  ["ml", "Malayalam"],
  ["mr", "Marathi"],
  ["mn", "Mongolian"],
  ["ne", "Nepali"],
  ["no", "Norwegian"],
  ["fa", "Persian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["pa", "Punjabi"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sr", "Serbian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["es", "Spanish"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["uz", "Uzbek"],
  ["vi", "Vietnamese"],
  ["cy", "Welsh"],
] as const;

export function languageName(code: string): string {
  return LANGUAGES.find(([value]) => value === code)?.[1] ?? code;
}
