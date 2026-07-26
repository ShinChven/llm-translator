export type ProviderId =
  | "openai"
  | "gemini"
  | "claude"
  | "grok"
  | "openrouter"
  | "litellm";

export type SpeechProviderId = "webspeech" | "gemini" | "openai";

export type BuiltInActionId =
  | "translate"
  | "polish"
  | "summarize"
  | "what"
  | "how"
  | "why";

export type ActionId = BuiltInActionId | `custom:${string}`;

export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  discoveredModels: string[];
}

export type ThemePreference = "system" | "light" | "dark";

export type ActionOutputFormat = "text" | "markdown" | "latex";

export interface CustomAction {
  id: string;
  name: string;
  icon: string;
  rolePrompt: string;
  commandPrompt: string;
  outputFormat: ActionOutputFormat;
  provider?: ProviderId;
  model?: string;
}

export interface SpeechProviderSettings {
  voice: string;
}

export interface SpeechSettings {
  provider: SpeechProviderId;
  providers: Record<SpeechProviderId, SpeechProviderSettings>;
}

export interface AppSettings {
  provider: ProviderId;
  theme: ThemePreference;
  sourceLanguage: string;
  targetLanguage: string;
  defaultTargetLanguage: string;
  providers: Record<ProviderId, ProviderSettings>;
  customActions: CustomAction[];
  speech: SpeechSettings;
}

export interface PendingTask {
  id: string;
  source: string;
  createdAt: number;
  autoRun: boolean;
  actionId: ActionId;
  pageUrl?: string;
  pageTitle?: string;
}

export interface GenerationRequest {
  requestId: string;
  provider: ProviderId;
  model: string;
  actionId: ActionId;
  customRolePrompt?: string;
  customCommandPrompt?: string;
  customOutputFormat?: ActionOutputFormat;
  sourceLanguage: string;
  targetLanguage: string;
  source: string;
  currentResult?: string;
  revisionInstruction?: string;
}

export interface GeneratedResult {
  result: string;
  swapText: string;
}

export type GenerationPortMessage =
  | { type: "generate"; request: GenerationRequest }
  | { type: "cancel"; requestId: string };

export type GenerationPortEvent =
  | { type: "started"; requestId: string }
  | { type: "delta"; requestId: string; result: string }
  | {
      type: "complete";
      requestId: string;
      result: string;
      swapText: string;
    }
  | { type: "error"; requestId: string; message: string };

export type RuntimeRequest = {
  type: "list-models";
  provider: ProviderId;
};

export type ProcessTaskMessage = {
  type: "process-task";
  task: PendingTask;
};

export type RuntimeResponse =
  | { ok: true; models: string[] }
  | { ok: false; error: string };
