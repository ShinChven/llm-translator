import type { AppSettings, BuiltInActionId } from "./types";

export const DEFAULT_MODELS = {
  openai: "gpt-5.6-luna",
  gemini: "gemini-3.5-flash-lite",
} as const;

export const STORAGE_KEYS = {
  settings: "appSettings",
  pendingTask: "pendingTask",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  sourceLanguage: "auto",
  targetLanguage: "en",
  defaultTargetLanguage: "en",
  providers: {
    openai: {
      apiKey: "",
      model: DEFAULT_MODELS.openai,
      discoveredModels: [],
    },
    gemini: {
      apiKey: "",
      model: DEFAULT_MODELS.gemini,
      discoveredModels: [],
    },
  },
  customActions: [],
};

export const BUILT_IN_ACTIONS: Array<{
  id: BuiltInActionId;
  label: string;
}> = [
  { id: "translate", label: "Translate" },
  { id: "polish", label: "Polish" },
  { id: "summarize", label: "Summarize" },
  { id: "what", label: "What" },
  { id: "how", label: "How" },
  { id: "why", label: "Why" },
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
